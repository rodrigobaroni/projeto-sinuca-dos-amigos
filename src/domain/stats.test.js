import { describe, expect, it } from "vitest";
import { computeStats, rankedFrom, specialRecordCounts } from "./stats.js";

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
});
