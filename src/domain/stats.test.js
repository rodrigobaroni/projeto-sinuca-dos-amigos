import { describe, expect, it } from "vitest";
import { computeDoublesStats, computeStats, doublesPlayerStats, marathonRecord, rankedFrom, specialRecordCounts } from "./stats.js";

const players = [
  { id: "a", name: "Ana" },
  { id: "b", name: "Beto" },
  { id: "c", name: "Caio" },
];

describe("stats domain", () => {
  it("computes wins, losses, percentage and streaks chronologically", () => {
    const stats = computeStats(players, [
      { id: "1", player_a: "a", player_b: "b", winner_id: "a" },
      { id: "2", player_a: "a", player_b: "c", winner_id: "a" },
      { id: "3", player_a: "a", player_b: "b", winner_id: "b" },
      { id: "4", player_a: "a", player_b: "c", winner_id: "a" },
    ]);

    expect(stats.a).toMatchObject({ wins: 3, losses: 1, total: 4, pct: 75, curStreak: 1, bestStreak: 2 });
    expect(stats.b).toMatchObject({ wins: 1, losses: 1, total: 2, pct: 50, curStreak: 1, bestStreak: 1 });
  });

  // Por que a query de matches desempata por created_at ANTES de id (ver
  // supabaseRepository.js): curStreak sai da ordem em que as partidas
  // chegam, e id e UUID aleatorio. Nos lotes que o horario congelado criou
  // (varias partidas com o mesmo played_at), desempatar por id deixaria o
  // sorteio do UUID decidir sequencia de vitoria. Este teste trava a
  // premissa: mesma dupla de partidas, so a ordem muda, e o resultado muda
  // junto.
  it("curStreak depende da ordem de chegada - por isso o desempate e cronologico", () => {
    const derrota = { id: "f-uuid-alto", player_a: "a", player_b: "b", winner_id: "b" };
    const vitoria = { id: "0-uuid-baixo", player_a: "a", player_b: "b", winner_id: "a" };

    // Ordem real (derrota as 02:02, vitoria as 02:03): a Ana esta com 1 de sequencia.
    expect(computeStats(players, [derrota, vitoria]).a).toMatchObject({ curStreak: 1, wins: 1, losses: 1 });
    // Ordem que o desempate por id daria (o "0" vem antes do "f"): a mesma
    // noite vira sequencia zerada.
    expect(computeStats(players, [vitoria, derrota]).a).toMatchObject({ curStreak: 0, wins: 1, losses: 1 });
  });

  it("keeps doubles outside the individual ranking and ranks the partnership", () => {
    const allPlayers = [...players, { id: "d", name: "Dani" }];
    const matches = [{
      id: "d1", mode: "2x2", player_a: "a", player_b: "c",
      team_a: ["a", "b"], team_b: ["c", "d"], winner_side: "a",
    }];
    expect(computeStats(allPlayers, matches).a.total).toBe(0);
    expect(computeDoublesStats(allPlayers, matches)["a|b"]).toMatchObject({ wins: 1, losses: 0, total: 1 });
    expect(doublesPlayerStats(allPlayers, matches, "a")[0]).toMatchObject({ id: "b", wins: 1 });
  });

  it("ranks by wins, percentage, fewer losses and name", () => {
    const ranked = rankedFrom({
      c: { id: "c", name: "Caio", wins: 2, losses: 0, pct: 100 },
      a: { id: "a", name: "Ana", wins: 2, losses: 1, pct: 67 },
      b: { id: "b", name: "Beto", wins: 1, losses: 0, pct: 100 },
    });

    expect(ranked.map((item) => item.id)).toEqual(["c", "a", "b"]);
  });

  it("counts washout when the loser pots no group balls", () => {
    const records = specialRecordCounts(players, [
      {
        id: "1",
        player_a: "a",
        player_b: "b",
        winner_id: "a",
        ball_log: [
          { ball: "2", by: "a", type: "pot" },
          { ball: "1", by: "a", type: "pot" },
        ],
      },
    ]);

    expect(records.find((item) => item.id === "a").washouts).toBe(1);
  });

  it("não conta lavada quando a partida não teve a ordem das bolas registrada", () => {
    const records = specialRecordCounts(players, [
      { id: "1", player_a: "a", player_b: "b", winner_id: "a", ball_log: [] },
    ]);

    expect(records.find((item) => item.id === "a").washouts).toBe(0);
  });

  it("agrupa a maratona por dia de jogatina, não por dia de calendário", () => {
    // mesma noite: 23h de 23/06 e 01h de 24/06 no horário de Brasília
    const record = marathonRecord(players, [
      { id: "1", player_a: "a", player_b: "b", winner_id: "a", played_at: "2026-06-24T02:00:00.000Z" },
      { id: "2", player_a: "a", player_b: "b", winner_id: "a", played_at: "2026-06-24T04:00:00.000Z" },
    ]);

    expect(record).toMatchObject({ value: 2, holder: "Ana" });
  });

  it("calcula sequências pela cronologia, não pela ordem do array", () => {
    const cronologico = [
      { id: "1", player_a: "a", player_b: "b", winner_id: "b", played_at: "2026-06-01T20:00:00.000Z" },
      { id: "2", player_a: "a", player_b: "b", winner_id: "a", played_at: "2026-06-02T20:00:00.000Z" },
      { id: "3", player_a: "a", player_b: "b", winner_id: "a", played_at: "2026-06-03T20:00:00.000Z" },
    ];
    const embaralhado = [cronologico[2], cronologico[0], cronologico[1]];

    expect(computeStats(players, embaralhado).a).toMatchObject(
      { curStreak: computeStats(players, cronologico).a.curStreak, bestStreak: 2 },
    );
    expect(computeStats(players, embaralhado).a.curStreak).toBe(2);
  });

  it("não inventa derrota quando o 1x1 foi finalizado só com winner_side", () => {
    const stats = computeStats(players, [
      { id: "1", player_a: "a", player_b: "b", winner_id: null, winner_side: "b" },
    ]);

    expect(stats.b).toMatchObject({ wins: 1, losses: 0 });
    expect(stats.a).toMatchObject({ wins: 0, losses: 1 });
  });

  it("ignora partida sem vencedor definido em vez de dar derrota ao player_a", () => {
    const stats = computeStats(players, [
      { id: "1", player_a: "a", player_b: "b", winner_id: null, winner_side: null },
    ]);

    expect(stats.a).toMatchObject({ wins: 0, losses: 0, total: 0 });
    expect(stats.b).toMatchObject({ wins: 0, losses: 0, total: 0 });
  });
});
