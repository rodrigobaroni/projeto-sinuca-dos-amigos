import { sortByPlayedAt } from "../utils/date.js";

// Colapsa duplicatas do mesmo id antes de aplicar a escrita. Conserta quem
// estiver com o array sujo (dois eventos aplicados fora de ordem) sem
// precisar de reload.
// Politica de desempate deliberada, nao um acidente do Map: mantem a ULTIMA
// ocorrencia, porque e a que chegou por ultimo no estado - a mais provavel de
// ser a mais recente na ausencia de qualquer timestamp ou numero de versao na
// linha. Se um dia a partida ganhar um updated_at (ou similar), o desempate
// correto passa a ser por esse campo, e e aqui que se resolve.
function dedupeById(matches) {
  const byId = new Map();
  for (const match of matches) byId.set(match.id, match);
  return [...byId.values()];
}

// Realtime: a linha que chega do WAL e sempre a verdade mais recente -> substitui.
export function upsertMatch(matches, row) {
  const deduped = dedupeById(matches);
  const exists = deduped.some((match) => match.id === row.id);
  const next = exists
    ? deduped.map((match) => (match.id === row.id ? row : match))
    : [...deduped, row];
  return sortByPlayedAt(next);
}

// Resposta do insert: so preenche a lacuna se o realtime ainda nao tiver chegado.
// Nunca sobrescreve uma versao ja presente - ela pode ser mais nova que esta,
// se o WebSocket entregou a linha antes da resposta HTTP do proprio insert.
export function addMatchIfAbsent(matches, row) {
  const deduped = dedupeById(matches);
  const exists = deduped.some((match) => match.id === row.id);
  const next = exists ? deduped : [...deduped, row];
  return sortByPlayedAt(next);
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
