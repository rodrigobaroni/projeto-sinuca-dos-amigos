import { describe, expect, it } from "vitest";
import { initials } from "./player.js";

describe("player helpers", () => {
  it("uses first and last name initials when available", () => {
    expect(initials("Rodrigo Baroni")).toBe("RB");
    expect(initials("Andre Sindicú")).toBe("AS");
  });

  it("falls back to the first two letters for single names", () => {
    expect(initials("Felipe")).toBe("FE");
  });
});
