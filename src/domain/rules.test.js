import { describe, expect, it } from "vitest";
import { classifyPot, deriveGroups, getGameRules, normalizeGameSettings } from "./rules.js";

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

  it("normalizes penalty ball options by game model", () => {
    expect(normalizeGameSettings({ gameModel: "even-odd", penaltyBall: "8" }).penaltyBall).toBe("1");
    expect(normalizeGameSettings({ gameModel: "solids-stripes", penaltyBall: "15" }).penaltyBall).toBe("8");
    expect(normalizeGameSettings({ gameModel: "high-low", penaltyBall: "1" }).penaltyBall).toBe("8");
  });

  it("supports solids and stripes with configurable penalty ball", () => {
    const rules = getGameRules({ gameModel: "solids-stripes", penaltyBall: "8" });
    const groups = rules.deriveGroups(match, [{ ball: "2", by: "a", type: "pot" }]);

    expect(groups).toEqual({ a: "solid", b: "stripe" });
    expect(rules.groupBalls("solid")).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(rules.classifyPot({ ball: 9, by: "a", groups, log: [] })).toEqual({ type: "foul", reason: "oponente" });
  });

  it("uses ball 8 as mandatory penalty for high and low", () => {
    const rules = getGameRules({ gameModel: "high-low" });
    const log = [1, 2, 3, 4, 5, 6, 7].map((ball) => ({ ball: String(ball), by: "a", type: "pot" }));

    expect(rules.penaltyBall).toBe("8");
    expect(rules.classifyPot({ ball: 8, by: "a", groups: { a: "low", b: "high" }, log })).toEqual({ type: "pot" });
    expect(rules.classifyPot({ ball: 8, by: "b", groups: { a: "low", b: "high" }, log })).toEqual({ type: "foul", reason: "trunfo" });
  });

  it("marks knockout and 3 balls as simple live modes", () => {
    expect(getGameRules({ gameModel: "knockout" }).simpleOnly).toBe(true);
    expect(getGameRules({ gameModel: "three-balls" }).simpleOnly).toBe(true);
  });

  it("keeps two colors for knockout players", () => {
    const settings = normalizeGameSettings({ gameModel: "knockout", knockoutColorA: "blue", knockoutColorB: "red" });

    expect(settings.knockoutColorA).toBe("blue");
    expect(settings.knockoutColorB).toBe("red");
    expect(getGameRules(settings).knockoutColors).toEqual({ a: "blue", b: "red" });
  });

  it("migrates legacy knockout color to player A and picks a different player B color", () => {
    const settings = normalizeGameSettings({ gameModel: "knockout", knockoutColor: "blue" });

    expect(settings.knockoutColorA).toBe("blue");
    expect(settings.knockoutColorB).not.toBe("blue");
  });
});
