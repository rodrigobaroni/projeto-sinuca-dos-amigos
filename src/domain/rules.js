import { EVEN_BALLS, ODD_BALLS } from "../constants.js";

export function groupBalls(group) {
  return group === "even" ? EVEN_BALLS : ODD_BALLS;
}

export function groupLabel(group) {
  return group === "even" ? "Pares" : group === "odd" ? "Ímpares" : "";
}

export function foulReasonText(reason) {
  return ({ oponente: "bola do oponente", trunfo: "bola 1 cedo", branca: "branca", juiz: "juiz derrubou" })[reason] || "";
}

export function deriveGroups(match, log) {
  const groups = {};
  for (const entry of log || []) {
    const num = Number(entry.ball);
    if (num >= 2 && num <= 15 && entry.type !== "foul" && !entry.brk && !groups[entry.by]) {
      const group = num % 2 === 0 ? "even" : "odd";
      groups[entry.by] = group;
      const other = entry.by === match.player_a ? match.player_b : match.player_a;
      if (!groups[other]) groups[other] = group === "even" ? "odd" : "even";
    }
  }
  return groups;
}

export function classifyPot({ ball, by, groups, log }) {
  const group = groups[by] || null;
  const num = Number(ball);
  const down = new Set(log.map((entry) => Number(entry.ball)).filter((item) => item >= 1 && item <= 15));
  if (num === 1) {
    if (group && groupBalls(group).every((item) => down.has(item))) return { type: "pot" };
    return { type: "foul", reason: "trunfo" };
  }
  if (num >= 2 && num <= 15) {
    if (!group) return { type: "pot" };
    const par = num % 2 === 0 ? "even" : "odd";
    return par === group ? { type: "pot" } : { type: "foul", reason: "oponente" };
  }
  return { type: "pot" };
}
