import { describe, expect, it } from "vitest";
import { classifyPot, deriveGroups } from "./rules.js";

const match = { player_a: "a", player_b: "b" };

describe("pool rules domain", () => {
  it("derives groups from the first non-break potted group ball", () => {
    const groups = deriveGroups(match, [
      { ball: "2", by: "a", type: "pot", brk: true },
      { ball: "3", by: "b", type: "pot" },
    ]);

    expect(groups).toEqual({ b: "odd", a: "even" });
  });

  it("marks opponent group ball as foul after groups are defined", () => {
    const result = classifyPot({
      ball: 3,
      by: "a",
      groups: { a: "even", b: "odd" },
      log: [{ ball: "2", by: "a", type: "pot" }],
    });

    expect(result).toEqual({ type: "foul", reason: "oponente" });
  });

  it("allows ball 1 only after the player's group is cleared", () => {
    const log = [2, 4, 6, 8, 10, 12, 14].map((ball) => ({ ball: String(ball), by: "a", type: "pot" }));

    expect(classifyPot({ ball: 1, by: "a", groups: { a: "even", b: "odd" }, log })).toEqual({ type: "pot" });
    expect(classifyPot({ ball: 1, by: "b", groups: { a: "even", b: "odd" }, log })).toEqual({ type: "foul", reason: "trunfo" });
  });
});
