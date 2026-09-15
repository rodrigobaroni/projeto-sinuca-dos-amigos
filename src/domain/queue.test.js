import { describe, expect, it } from "vitest";
import {
  buildQueue,
  eligibleForTable,
  freeTables,
  lastLossTableId,
  nextForTable,
  queueForDay,
  suggestedTableIds,
  tableHolderSuggestion,
  tableHolders,
  tableSuggestionLabel,
} from "./queue.js";

// 22h UTC = 19h em São Paulo (UTC-3): sempre dentro da mesma noite de
// jogatina, longe o bastante da virada de meio-dia para não precisar pensar
// em fuso em cada teste.
const GAME_DAY = "2026-06-25";
const at = (hour) => `2026-06-25T${hour}:00:00.000Z`;
const otherNight = (hour) => `2026-06-26T${hour}:00:00.000Z`;

const T1 = "table-1";
const T2 = "table-2";
const T3 = "table-3";
const tables = [
  { id: T1, name: "Mesa 1", active: true },
  { id: T2, name: "Mesa 2", active: true },
  { id: T3, name: "Mesa 3", active: true },
];

const finishedMatch = (overrides) => ({
  id: "m",
  status: "finished",
  mode: "1x1",
  played_at: at("20"),
  ended_at: at("21"),
  table_id: T1,
  ...overrides,
});

const liveMatch = (overrides) => ({
  id: "m-live",
  status: "live",
  mode: "1x1",
  played_at: at("22"),
  table_id: T1,
  ...overrides,
});

const attendanceRow = (overrides) => ({
  id: "att",
  game_day: GAME_DAY,
  player_id: "x",
  enqueued_at: at("18"),
  left_at: null,
  ...overrides,
});

describe("tableHolders", () => {
  it("devolve o vencedor da última partida finalizada da mesa (1x1)", () => {
    const match = finishedMatch({ id: "m1", player_a: "a", player_b: "b", winner_id: "a", winner_side: "a" });
    const holders = tableHolders({ tables, gameDay: GAME_DAY, matches: [match], attendance: [] });

    expect(holders[T1]).toEqual(["a"]);
  });

  it("devolve ninguém quando há partida ao vivo na mesa", () => {
    const finished = finishedMatch({ id: "m1", player_a: "a", player_b: "b", winner_id: "a", winner_side: "a" });
    const live = liveMatch({ player_a: "c", player_b: "d" });
    const holders = tableHolders({ tables, gameDay: GAME_DAY, matches: [finished, live], attendance: [] });

    expect(holders[T1]).toEqual([]);
  });

  it("devolve a dupla inteira no 2x2", () => {
    const match = finishedMatch({
      id: "m1", mode: "2x2", player_a: "a", player_b: "c",
      team_a: ["a", "b"], team_b: ["c", "d"], winner_side: "a",
    });
    const holders = tableHolders({ tables, gameDay: GAME_DAY, matches: [match], attendance: [] });

    expect(holders[T1]).toEqual(["a", "b"]);
  });

  it("ignora o vencedor que foi embora (left_at preenchido)", () => {
    const match = finishedMatch({ id: "m1", player_a: "a", player_b: "b", winner_id: "a", winner_side: "a" });
    const attendance = [attendanceRow({ id: "att-a", player_id: "a", left_at: at("21") })];
    const holders = tableHolders({ tables, gameDay: GAME_DAY, matches: [match], attendance });

    expect(holders[T1]).toEqual([]);
  });

  it("ignora o vencedor que já entrou em partida ao vivo em outra mesa", () => {
    const finished = finishedMatch({ id: "m1", player_a: "a", player_b: "b", winner_id: "a", winner_side: "a" });
    const live = liveMatch({ id: "m2", table_id: T2, player_a: "a", player_b: "c" });
    const holders = tableHolders({ tables, gameDay: GAME_DAY, matches: [finished, live], attendance: [] });

    expect(holders[T1]).toEqual([]);
    expect(holders[T2]).toEqual([]);
  });

  it("devolve ninguém quando a mesa não teve partida na noite", () => {
    const holders = tableHolders({ tables, gameDay: GAME_DAY, matches: [], attendance: [] });

    expect(holders[T1]).toEqual([]);
    expect(holders[T2]).toEqual([]);
    expect(holders[T3]).toEqual([]);
  });

  it("usa a partida mais recente da mesa, não a primeira que aparece no array", () => {
    const first = finishedMatch({ id: "m1", player_a: "a", player_b: "b", winner_id: "a", winner_side: "a", played_at: at("19"), ended_at: at("19") });
    const second = finishedMatch({ id: "m2", player_a: "b", player_b: "c", winner_id: "c", winner_side: "b", played_at: at("20"), ended_at: at("21") });
    const holders = tableHolders({ tables, gameDay: GAME_DAY, matches: [first, second], attendance: [] });

    expect(holders[T1]).toEqual(["c"]);
  });

  it("ignora partidas finalizadas de outras noites na mesma mesa", () => {
    const match = finishedMatch({
      id: "m1", player_a: "a", player_b: "b", winner_id: "a", winner_side: "a",
      played_at: otherNight("20"), ended_at: otherNight("21"),
    });
    const holders = tableHolders({ tables, gameDay: GAME_DAY, matches: [match], attendance: [] });

    expect(holders[T1]).toEqual([]);
  });

  it("partida sem table_id não gera dono de mesa nenhuma", () => {
    const match = finishedMatch({ id: "m1", table_id: null, player_a: "a", player_b: "b", winner_id: "a", winner_side: "a" });
    const holders = tableHolders({ tables, gameDay: GAME_DAY, matches: [match], attendance: [] });

    expect(holders[T1]).toEqual([]);
  });

  it("desempata por id quando duas partidas finalizadas na mesma mesa empatam no timestamp mais recente", () => {
    const matchA = finishedMatch({ id: "m-a", player_a: "a", player_b: "x", winner_id: "a", winner_side: "a", played_at: at("20"), ended_at: at("21") });
    const matchB = finishedMatch({ id: "m-b", player_a: "b", player_b: "y", winner_id: "b", winner_side: "a", played_at: at("20"), ended_at: at("21") });
    const holders = tableHolders({ tables, gameDay: GAME_DAY, matches: [matchA, matchB], attendance: [] });

    // "m-b" > "m-a" na comparação de string - desempate determinístico, não
    // preferência por uma partida específica.
    expect(holders[T1]).toEqual(["b"]);
  });

  it("ended_at tem precedência sobre played_at: quem começou antes mas terminou depois é a mais recente", () => {
    const startedFirstEndedLast = finishedMatch({ id: "m1", player_a: "a", player_b: "x", winner_id: "a", winner_side: "a", played_at: at("18"), ended_at: at("22") });
    const startedLaterEndedFirst = finishedMatch({ id: "m2", player_a: "b", player_b: "y", winner_id: "b", winner_side: "a", played_at: at("20"), ended_at: at("20") });
    const holders = tableHolders({ tables, gameDay: GAME_DAY, matches: [startedFirstEndedLast, startedLaterEndedFirst], attendance: [] });

    expect(holders[T1]).toEqual(["a"]);
  });
});

describe("queueForDay", () => {
  it("exclui quem tem left_at preenchido", () => {
    const attendance = [attendanceRow({ id: "1", player_id: "a", left_at: at("21") })];
    const entries = queueForDay({ gameDay: GAME_DAY, attendance, liveMatches: [], holders: {} });

    expect(entries).toEqual([]);
  });

  it("exclui quem está em qualquer partida ao vivo", () => {
    const attendance = [attendanceRow({ id: "1", player_id: "a" })];
    const live = liveMatch({ player_a: "a", player_b: "b" });
    const entries = queueForDay({ gameDay: GAME_DAY, attendance, liveMatches: [live], holders: {} });

    expect(entries).toEqual([]);
  });

  it("exclui quem é dono de alguma mesa", () => {
    const attendance = [attendanceRow({ id: "1", player_id: "a" })];
    const holders = { [T1]: ["a"] };
    const entries = queueForDay({ gameDay: GAME_DAY, attendance, liveMatches: [], holders });

    expect(entries).toEqual([]);
  });

  it("exclui presença de outra noite", () => {
    const attendance = [attendanceRow({ id: "1", player_id: "a", game_day: "2026-06-24" })];
    const entries = queueForDay({ gameDay: GAME_DAY, attendance, liveMatches: [], holders: {} });

    expect(entries).toEqual([]);
  });

  it("ordena por enqueued_at crescente", () => {
    const attendance = [
      attendanceRow({ id: "1", player_id: "a", enqueued_at: at("20") }),
      attendanceRow({ id: "2", player_id: "b", enqueued_at: at("18") }),
      attendanceRow({ id: "3", player_id: "c", enqueued_at: at("19") }),
    ];
    const entries = queueForDay({ gameDay: GAME_DAY, attendance, liveMatches: [], holders: {} });

    expect(entries.map((entry) => entry.player_id)).toEqual(["b", "c", "a"]);
  });

  it("desempata por id quando enqueued_at é igual (dois perdedores do mesmo 2x2)", () => {
    const attendance = [
      attendanceRow({ id: "b-loser", player_id: "b", enqueued_at: at("20") }),
      attendanceRow({ id: "a-loser", player_id: "a", enqueued_at: at("20") }),
    ];
    const entries = queueForDay({ gameDay: GAME_DAY, attendance, liveMatches: [], holders: {} });

    expect(entries.map((entry) => entry.id)).toEqual(["a-loser", "b-loser"]);
  });
});

describe("lastLossTableId", () => {
  it("pega a derrota mais recente da noite", () => {
    const older = finishedMatch({ id: "m1", table_id: T1, player_a: "a", player_b: "b", winner_id: "b", winner_side: "b", played_at: at("18"), ended_at: at("18") });
    const newer = finishedMatch({ id: "m2", table_id: T2, player_a: "a", player_b: "c", winner_id: "c", winner_side: "b", played_at: at("20"), ended_at: at("20") });
    const result = lastLossTableId({ playerId: "a", gameDay: GAME_DAY, finishedMatches: [older, newer] });

    expect(result).toBe(T2);
  });

  it("ignora vitórias", () => {
    const won = finishedMatch({ id: "m1", table_id: T1, player_a: "a", player_b: "b", winner_id: "a", winner_side: "a" });
    const result = lastLossTableId({ playerId: "a", gameDay: GAME_DAY, finishedMatches: [won] });

    expect(result).toBeNull();
  });

  it("ignora partidas de outras noites", () => {
    const lostOtherNight = finishedMatch({
      id: "m1", table_id: T1, player_a: "a", player_b: "b", winner_id: "b", winner_side: "b",
      played_at: otherNight("20"), ended_at: otherNight("20"),
    });
    const result = lastLossTableId({ playerId: "a", gameDay: GAME_DAY, finishedMatches: [lostOtherNight] });

    expect(result).toBeNull();
  });

  it("devolve nulo para quem não perdeu (nem jogou)", () => {
    const result = lastLossTableId({ playerId: "z", gameDay: GAME_DAY, finishedMatches: [] });

    expect(result).toBeNull();
  });

  it("funciona no 2x2, onde a derrota é do lado e winner_id é nulo", () => {
    const match = finishedMatch({
      id: "m1", table_id: T2, mode: "2x2", player_a: "a", player_b: "c",
      team_a: ["a", "b"], team_b: ["c", "d"], winner_id: null, winner_side: "b",
    });
    const result = lastLossTableId({ playerId: "a", gameDay: GAME_DAY, finishedMatches: [match] });

    expect(result).toBe(T2);
  });

  it("desempata por id quando duas derrotas empatam no timestamp mais recente", () => {
    const lossA = finishedMatch({ id: "m-a", table_id: T1, player_a: "z", player_b: "x", winner_id: "x", winner_side: "b", played_at: at("20"), ended_at: at("20") });
    const lossB = finishedMatch({ id: "m-b", table_id: T2, player_a: "z", player_b: "y", winner_id: "y", winner_side: "b", played_at: at("20"), ended_at: at("20") });
    const result = lastLossTableId({ playerId: "z", gameDay: GAME_DAY, finishedMatches: [lossA, lossB] });

    expect(result).toBe(T2);
  });
});

describe("suggestedTableIds", () => {
  it("com uma mesa ativa devolve essa mesa (regra desligada)", () => {
    const result = suggestedTableIds({ activeTables: [tables[0]], lastLossTableId: T1 });

    expect(result).toEqual([T1]);
  });

  it("com duas mesas devolve a outra", () => {
    const result = suggestedTableIds({ activeTables: [tables[0], tables[1]], lastLossTableId: T1 });

    expect(result).toEqual([T2]);
  });

  it("com três mesas devolve as duas restantes", () => {
    const result = suggestedTableIds({ activeTables: tables, lastLossTableId: T1 });

    expect(result).toEqual([T2, T3]);
  });

  it("com última derrota sem table_id (nula) devolve todas", () => {
    const result = suggestedTableIds({ activeTables: tables, lastLossTableId: null });

    expect(result).toEqual([T1, T2, T3]);
  });

  it("com a mesa da derrota fora das ativas (desativada ou apagada) devolve todas", () => {
    const result = suggestedTableIds({ activeTables: [tables[1], tables[2]], lastLossTableId: T1 });

    expect(result).toEqual([T2, T3]);
  });
});

describe("eligibleForTable / nextForTable", () => {
  const entries = [
    { id: "1", player_id: "a", suggestedTableIds: [T2] },
    { id: "2", player_id: "b", suggestedTableIds: [T1, T2] },
  ];

  it("pula quem não pode entrar naquela mesa", () => {
    const next = nextForTable(T1, entries);

    expect(next.player_id).toBe("b");
  });

  it("devolve nulo quando ninguém é elegível", () => {
    const next = nextForTable(T3, entries);

    expect(next).toBeNull();
  });

  it("eligibleForTable devolve todos os elegíveis, na ordem da fila", () => {
    const eligible = eligibleForTable(T2, entries);

    expect(eligible.map((entry) => entry.player_id)).toEqual(["a", "b"]);
  });
});

describe("tableSuggestionLabel", () => {
  it("com uma mesa ativa não tem rótulo nenhum", () => {
    const label = tableSuggestionLabel({ activeTables: [tables[0]], suggestedTableIds: [T1] });

    expect(label).toBe("");
  });

  it("todas as mesas ativas elegíveis -> qualquer", () => {
    const label = tableSuggestionLabel({ activeTables: tables, suggestedTableIds: [T1, T2, T3] });

    expect(label).toBe("qualquer");
  });

  it("exatamente uma elegível -> o nome dela", () => {
    const label = tableSuggestionLabel({ activeTables: tables, suggestedTableIds: [T2] });

    expect(label).toBe("Mesa 2");
  });

  it("mais de uma, mas não todas -> qualquer menos X", () => {
    const label = tableSuggestionLabel({ activeTables: tables, suggestedTableIds: [T2, T3] });

    expect(label).toBe("qualquer menos Mesa 1");
  });
});

describe("buildQueue", () => {
  it("compõe holders e a fila com mesa sugerida e rótulo prontos", () => {
    const lossMatch = finishedMatch({ id: "m1", table_id: T1, player_a: "c", player_b: "d", winner_id: "d", winner_side: "b", played_at: at("18"), ended_at: at("18") });
    const winMatch = finishedMatch({ id: "m2", table_id: T1, player_a: "a", player_b: "b", winner_id: "a", winner_side: "a", played_at: at("19"), ended_at: at("19") });
    const attendance = [attendanceRow({ id: "att-c", player_id: "c", enqueued_at: at("19") })];

    const { holders, entries } = buildQueue({ tables, gameDay: GAME_DAY, matches: [lossMatch, winMatch], attendance });

    expect(holders[T1]).toEqual(["a"]);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ player_id: "c", suggestedTableIds: [T2, T3], label: "qualquer menos Mesa 1" });
  });

  it("não repete quem é dono de mesa na fila mesmo com presença marcada", () => {
    const winMatch = finishedMatch({ id: "m1", table_id: T1, player_a: "a", player_b: "b", winner_id: "a", winner_side: "a" });
    const attendance = [attendanceRow({ id: "att-a", player_id: "a", enqueued_at: at("17") })];

    const { entries } = buildQueue({ tables, gameDay: GAME_DAY, matches: [winMatch], attendance });

    expect(entries).toEqual([]);
  });

  it("mesa desativada com partida finalizada nela não gera dono, e o vencedor volta pra fila normal", () => {
    const inactiveTables = [
      { id: T1, name: "Mesa 1", active: false },
      { id: T2, name: "Mesa 2", active: true },
    ];
    const match = finishedMatch({ id: "m1", table_id: T1, player_a: "a", player_b: "b", winner_id: "a", winner_side: "a" });
    const attendance = [attendanceRow({ id: "att-a", player_id: "a", enqueued_at: at("19") })];

    const { holders, entries } = buildQueue({ tables: inactiveTables, gameDay: GAME_DAY, matches: [match], attendance });

    expect(holders[T1]).toBeUndefined();
    expect(entries.map((entry) => entry.player_id)).toEqual(["a"]);
  });
});

describe("freeTables", () => {
  it("tira do formulário a mesa que tem partida ao vivo em cima", () => {
    const result = freeTables({ activeTables: tables, liveMatches: [liveMatch({ table_id: T2 })] });
    expect(result.map((table) => table.id)).toEqual([T1, T3]);
  });

  it("devolve todas as mesas quando não há partida rolando", () => {
    expect(freeTables({ activeTables: tables, liveMatches: [] })).toEqual(tables);
  });

  it("devolve vazio quando todas as mesas estão ocupadas", () => {
    const live = [liveMatch({ id: "l1", table_id: T1 }), liveMatch({ id: "l2", table_id: T2 }), liveMatch({ id: "l3", table_id: T3 })];
    expect(freeTables({ activeTables: tables, liveMatches: live })).toEqual([]);
  });

  // Partida sem mesa é o estado de quem não rodou a migração 20260915: ela
  // não pode ocupar (nem esconder) mesa nenhuma.
  it("ignora partida ao vivo sem table_id", () => {
    const live = [liveMatch({ table_id: null }), liveMatch({ id: "l2", table_id: undefined })];
    expect(freeTables({ activeTables: tables, liveMatches: live })).toEqual(tables);
  });

  it("não considera mesa inativa - o chamador já passa só as ativas", () => {
    expect(freeTables({ activeTables: [], liveMatches: [] })).toEqual([]);
  });
});

describe("tableHolderSuggestion", () => {
  const holders = { [T1]: ["a"], [T2]: ["b", "c"], [T3]: [] };

  it("sugere o dono da mesa escolhida", () => {
    const suggestion = tableHolderSuggestion({ tableId: T1, holders, availablePlayerIds: ["a", "b", "c"] });
    expect(suggestion).toBe("a");
  });

  it("devolve null quando a mesa não tem dono (ninguém ganhou ali ainda)", () => {
    expect(tableHolderSuggestion({ tableId: T3, holders, availablePlayerIds: ["a", "b", "c"] })).toBeNull();
  });

  it("devolve null quando nenhuma mesa foi escolhida", () => {
    expect(tableHolderSuggestion({ tableId: "", holders, availablePlayerIds: ["a"] })).toBeNull();
  });

  it("devolve null para mesa que nem está no mapa de donos", () => {
    expect(tableHolderSuggestion({ tableId: "table-9", holders, availablePlayerIds: ["a"] })).toBeNull();
  });

  it("pula o dono que não está disponível (entrou em partida ao vivo)", () => {
    expect(tableHolderSuggestion({ tableId: T1, holders, availablePlayerIds: ["b", "c"] })).toBeNull();
  });

  it("pula o dono já escolhido noutro campo e sugere o parceiro da dupla", () => {
    const suggestion = tableHolderSuggestion({
      tableId: T2,
      holders,
      availablePlayerIds: ["a", "b", "c"],
      takenPlayerIds: ["b"],
    });
    expect(suggestion).toBe("c");
  });

  it("devolve null quando a dupla inteira já está escolhida noutros campos", () => {
    const suggestion = tableHolderSuggestion({
      tableId: T2,
      holders,
      availablePlayerIds: ["a", "b", "c"],
      takenPlayerIds: ["b", "c"],
    });
    expect(suggestion).toBeNull();
  });

  // Regressao 2x2 -> 1x1: o formulario guarda o parceiro escolhido num 2x2
  // anterior mesmo depois de voltar pro 1x1, onde esse campo nem aparece. Se
  // o chamador passar esse residuo em takenPlayerIds, o dono da mesa vira
  // "ja escalado" e a sugestao some sem motivo - por isso quem chama manda
  // so os slots ativos no modo atual (ver o onChange do seletor de mesa).
  it("sugere o dono que so ocupa slot inativo do modo atual (1x1 herdando A2 de um 2x2)", () => {
    const soloHolders = { [T1]: ["joao"] };
    const escalados1x1 = ["b"]; // em 1x1 so o lado B conta; o A2 herdado fica de fora
    expect(tableHolderSuggestion({
      tableId: T1,
      holders: soloHolders,
      availablePlayerIds: ["joao", "b"],
      takenPlayerIds: escalados1x1,
    })).toBe("joao");
    // E o contrario segue valendo: em 2x2, com o joao realmente no A2, nao ha
    // sugestao - ninguem pode ser escalado duas vezes na mesma partida.
    expect(tableHolderSuggestion({
      tableId: T1,
      holders: soloHolders,
      availablePlayerIds: ["joao", "b"],
      takenPlayerIds: ["joao", "b"],
    })).toBeNull();
  });

  it("aceita holders ausente sem quebrar", () => {
    expect(tableHolderSuggestion({ tableId: T1, holders: undefined, availablePlayerIds: ["a"] })).toBeNull();
  });
});
