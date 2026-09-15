import { describe, expect, it } from "vitest";
import { defaultGameDay, gameDayKey, gameDayRange, matchesInRange, sortByPlayedAt } from "./date.js";

describe("game day date helpers", () => {
  it("assigns matches before noon to the previous game day", () => {
    expect(defaultGameDay([{ played_at: "2026-06-25T05:30:00.000Z" }])).toBe("2026-06-24");
  });

  it("groups early morning matches into the previous game day", () => {
    expect(gameDayKey("2026-06-25T01:30:00")).toBe("2026-06-24");
    expect(gameDayKey("2026-06-25T13:30:00")).toBe("2026-06-25");
  });

  it("builds a noon-to-noon range and filters matches inside it", () => {
    const { start, end } = gameDayRange("2026-06-24");
    const matches = matchesInRange([
      { id: "before", played_at: "2026-06-24T10:00:00.000Z" },
      { id: "inside", played_at: "2026-06-24T20:00:00.000Z" },
      { id: "after", played_at: "2026-06-25T16:00:00.000Z" },
    ], start, end);

    expect(matches.map((match) => match.id)).toEqual(["inside"]);
  });

  it("não estoura quando o usuário limpa o campo de data", () => {
    expect(() => gameDayRange("")).not.toThrow();
    expect(gameDayRange("")).toEqual({ start: "", end: "" });
    expect(matchesInRange([{ played_at: "2026-06-24T20:00:00.000Z" }], "", "")).toEqual([]);
  });

  it("não conta o meio-dia em dois dias de jogatina", () => {
    const noon = "2026-06-25T12:00:00";
    const match = [{ id: "noon", played_at: noon }];
    const dia24 = gameDayRange("2026-06-24");
    const dia25 = gameDayRange("2026-06-25");

    expect(matchesInRange(match, dia24.start, dia24.end)).toEqual([]);
    expect(matchesInRange(match, dia25.start, dia25.end)).toHaveLength(1);
    expect(gameDayKey(noon)).toBe("2026-06-25");
  });

  it("usa o fuso do produto, não o de quem está olhando", () => {
    // instante absoluto: 21h no horário de Brasília de 24/06
    expect(gameDayKey("2026-06-25T00:00:00.000Z")).toBe("2026-06-24");
    // string sem fuso significa horário do produto
    expect(gameDayKey("2026-06-25T13:30:00")).toBe("2026-06-25");
  });

  it("acha a jogatina mais recente mesmo com o array fora de ordem", () => {
    const desordenado = [
      { played_at: "2026-07-27T23:00:00.000Z" },
      { played_at: "2026-06-23T23:00:00.000Z" },
    ];
    expect(defaultGameDay(desordenado)).toBe("2026-07-27");
  });

  it("mantém no lugar a partida sem data em vez de trazê-la para o início", () => {
    const comData = { id: "com-data", played_at: "2026-01-01T12:00:00.000Z" };
    const semData = { id: "sem-data" };

    expect(sortByPlayedAt([comData, semData]).map((m) => m.id)).toEqual(["com-data", "sem-data"]);
    expect(sortByPlayedAt([semData, comData]).map((m) => m.id)).toEqual(["sem-data", "com-data"]);
  });
});
