import { describe, expect, it } from "vitest";
import { defaultGameDay, gameDayKey, gameDayRange, matchesInRange } from "./date.js";

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
});
