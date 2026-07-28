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
