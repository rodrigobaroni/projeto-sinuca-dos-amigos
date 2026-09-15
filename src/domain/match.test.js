import { describe, expect, it } from "vitest";
import { addMatchIfAbsent, finishMatchPatch, upsertMatch } from "./match.js";

const at = (hour) => `2026-06-25T${hour}:00:00.000Z`;

describe("upsertMatch", () => {
  it("adiciona uma partida nova em ordem cronológica", () => {
    const matches = [{ id: "1", played_at: at("10") }, { id: "2", played_at: at("12") }];
    const next = upsertMatch(matches, { id: "3", played_at: at("11") });

    expect(next.map((match) => match.id)).toEqual(["1", "3", "2"]);
  });

  it("substitui em vez de duplicar quando o id já existe (regressão do bug)", () => {
    const matches = [{ id: "1", played_at: at("10"), ball_log: [] }];
    const next = upsertMatch(matches, { id: "1", played_at: at("10"), ball_log: [{ n: 1 }] });

    expect(next).toHaveLength(1);
    expect(next[0].ball_log).toEqual([{ n: 1 }]);
  });

  it("com payloads divergentes para o mesmo id, a versão do realtime prevalece", () => {
    const matches = [{ id: "1", played_at: at("10"), status: "live" }];
    const next = upsertMatch(matches, { id: "1", played_at: at("10"), status: "finished" });

    expect(next[0].status).toBe("finished");
  });

  it("entra na posição cronológica correta quando é uma partida retroativa", () => {
    const matches = [{ id: "1", played_at: at("10") }, { id: "2", played_at: at("14") }];
    const next = upsertMatch(matches, { id: "3", played_at: at("08") });

    expect(next.map((match) => match.id)).toEqual(["3", "1", "2"]);
  });

  it("colapsa duplicatas pré-existentes divergentes do array de entrada, mantendo a última ocorrência", () => {
    const matches = [
      { id: "1", played_at: at("10"), status: "live" },
      { id: "1", played_at: at("10"), status: "finished" },
    ];
    const next = upsertMatch(matches, { id: "2", played_at: at("11") });
    const survivors = next.filter((match) => match.id === "1");

    expect(survivors).toHaveLength(1);
    expect(survivors[0].status).toBe("finished");
  });
});

describe("addMatchIfAbsent", () => {
  it("adiciona quando o id ainda não está presente", () => {
    const next = addMatchIfAbsent([{ id: "1", played_at: at("10") }], { id: "2", played_at: at("11") });

    expect(next.map((match) => match.id)).toEqual(["1", "2"]);
  });

  it("mantém a versão existente intacta quando o id já está presente", () => {
    const matches = [{ id: "1", played_at: at("10"), ball_log: [{ n: 1 }] }];
    const next = upsertMatch(matches, { id: "1", played_at: at("10"), ball_log: [{ n: 1 }, { n: 2 }] });
    const afterInsertResponse = addMatchIfAbsent(next, { id: "1", played_at: at("10"), ball_log: [] });

    expect(afterInsertResponse).toHaveLength(1);
    expect(afterInsertResponse[0].ball_log).toEqual([{ n: 1 }, { n: 2 }]);
  });

  it("colapsa duplicatas pré-existentes divergentes do array de entrada, mantendo a última ocorrência", () => {
    const matches = [
      { id: "1", played_at: at("10"), status: "live" },
      { id: "1", played_at: at("10"), status: "finished" },
    ];
    const next = addMatchIfAbsent(matches, { id: "2", played_at: at("11") });
    const survivors = next.filter((match) => match.id === "1");

    expect(survivors).toHaveLength(1);
    expect(survivors[0].status).toBe("finished");
  });

  it("independência de ordem: com payloads divergentes, o realtime prevalece nas duas ordens", () => {
    // realtimeRow ja reflete uma bola anotada depois da criacao da partida;
    // localRow e a resposta HTTP do insert original, chegando atrasada e
    // ainda com o estado de quando a partida foi criada.
    const realtimeRow = { id: "1", played_at: at("10"), status: "live", ball_log: [{ n: 1 }] };
    const localRow = { id: "1", played_at: at("10"), status: "live", ball_log: [] };

    const realtimeThenLocal = addMatchIfAbsent(upsertMatch([], realtimeRow), localRow);
    const localThenRealtime = upsertMatch(addMatchIfAbsent([], localRow), realtimeRow);

    expect(realtimeThenLocal).toHaveLength(1);
    expect(realtimeThenLocal[0].ball_log).toEqual([{ n: 1 }]);
    expect(localThenRealtime).toHaveLength(1);
    expect(localThenRealtime[0].ball_log).toEqual([{ n: 1 }]);
  });
});

describe("finishMatchPatch", () => {
  it("1x1: winner_id é o jogador do lado vencedor", () => {
    const match = { player_a: "a", player_b: "b", mode: "1x1" };
    const patch = finishMatchPatch(match, "a", at("20"));

    expect(patch).toEqual({ winner_id: "a", winner_side: "a", status: "finished", ended_at: at("20") });
  });

  it("2x2: winner_id fica nulo e winner_side preenchido", () => {
    const match = { player_a: "a", player_b: "b", mode: "2x2" };
    const patch = finishMatchPatch(match, "b", at("20"));

    expect(patch).toEqual({ winner_id: null, winner_side: "b", status: "finished", ended_at: at("20") });
  });
});
