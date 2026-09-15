import { sortByPlayedAt } from "../utils/date.js";
import { addIfAbsentBy, upsertBy } from "./collection.js";

// upsertBy/addIfAbsentBy fazem o trabalho genérico (dedupe + merge por id);
// aqui só se fixa a ordenação cronológica que é específica de partida.
// Ver collection.js para a política de desempate do dedupe.
export function upsertMatch(matches, row) {
  return upsertBy(matches, row, { sort: sortByPlayedAt });
}

export function addMatchIfAbsent(matches, row) {
  return addIfAbsentBy(matches, row, { sort: sortByPlayedAt });
}

// Reproduz o patch de "Definir vencedor": no 2x2 nao ha um unico id vencedor
// (a dupla toda venceu), entao winner_id fica nulo e quem consome cai no
// fallback de winner_side (ver winnerSide acima).
export function finishMatchPatch(match, side, endedAt = new Date().toISOString()) {
  const doubles = matchMode(match) === "2x2";
  const winnerId = side === "a" ? match.player_a : match.player_b;
  return {
    winner_id: doubles ? null : winnerId,
    winner_side: side,
    status: "finished",
    ended_at: endedAt,
  };
}

export function matchMode(match) {
  return match?.mode === "2x2" ? "2x2" : "1x1";
}

export function matchSides(match) {
  if (matchMode(match) === "2x2") {
    return {
      a: Array.isArray(match.team_a) ? match.team_a.filter(Boolean) : [],
      b: Array.isArray(match.team_b) ? match.team_b.filter(Boolean) : [],
    };
  }
  return { a: [match?.player_a].filter(Boolean), b: [match?.player_b].filter(Boolean) };
}

export function matchPlayerIds(match) {
  const sides = matchSides(match);
  return [...sides.a, ...sides.b];
}

export function winnerSide(match) {
  if (match?.winner_side === "a" || match?.winner_side === "b") return match.winner_side;
  if (match?.winner_id === match?.player_a) return "a";
  if (match?.winner_id === match?.player_b) return "b";
  return null;
}

export function playerSide(match, playerId) {
  const sides = matchSides(match);
  if (sides.a.includes(playerId)) return "a";
  if (sides.b.includes(playerId)) return "b";
  return null;
}

export function playerWon(match, playerId) {
  const side = playerSide(match, playerId);
  return Boolean(side && side === winnerSide(match));
}

export function sideLabel(match, side, playerName) {
  return matchSides(match)[side].map(playerName).join(" + ");
}

export function teamKey(ids) {
  return ids.slice().sort().join("|");
}
