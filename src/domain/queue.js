import { gameDayKey } from "../utils/date.js";
import { matchPlayerIds, matchSides, playerSide, winnerSide } from "./match.js";

// A noite de uma partida terminada é a do fim, não a do início - relevante
// quando ela atravessa o meio-dia (gameDayKey em date.js). Para partida ao
// vivo isso não se aplica: ela é "agora", não pertence a nenhuma noite ainda.
function matchGameDay(match) {
  return gameDayKey(match.ended_at ?? match.played_at);
}

function matchTimestampMs(match) {
  const date = new Date(match.ended_at ?? match.played_at);
  return Number.isFinite(date.getTime()) ? date.getTime() : -Infinity;
}

// "Mais recente" entre partidas, com desempate estável por id (duas partidas
// carimbadas no mesmo milissegundo - comum no 2x2 - não podem ficar em ordem
// indefinida entre renders).
function latestMatch(matches) {
  return matches.reduce((latest, match) => {
    if (!latest) return match;
    const currentMs = matchTimestampMs(match);
    const latestMs = matchTimestampMs(latest);
    if (currentMs > latestMs) return match;
    if (currentMs === latestMs && String(match.id) > String(latest.id)) return match;
    return latest;
  }, null);
}

// Quem está segurando cada mesa: quem ganhou por último e ainda não jogou de
// novo nem foi embora. Entre uma partida e a próxima o vencedor não está
// esperando - está de pé na mesa - então não pode reaparecer na fila.
export function tableHolders({ tables, gameDay, matches, attendance }) {
  const leftIds = new Set(
    attendance.filter((row) => row.game_day === gameDay && row.left_at).map((row) => row.player_id),
  );
  const liveMatches = matches.filter((match) => match.status === "live");
  const busyIds = new Set(liveMatches.flatMap((match) => matchPlayerIds(match)));

  const holders = {};
  for (const table of tables) {
    const hasLiveOnTable = liveMatches.some((match) => match.table_id === table.id);
    if (hasLiveOnTable) {
      holders[table.id] = [];
      continue;
    }
    const finishedOnTable = matches.filter(
      (match) => match.status === "finished" && match.table_id === table.id && matchGameDay(match) === gameDay,
    );
    const latest = latestMatch(finishedOnTable);
    if (!latest) {
      holders[table.id] = [];
      continue;
    }
    const side = winnerSide(latest);
    const winners = side ? matchSides(latest)[side] : [];
    // Filtra quem já foi embora ou já entrou em partida ao vivo em outra
    // mesa - "ninguém, se sobrar vazio" é o próprio filter devolvendo [].
    holders[table.id] = winners.filter((id) => !leftIds.has(id) && !busyIds.has(id));
  }
  return holders;
}

// Mesas em que dá pra iniciar uma partida agora: as ativas sem partida ao
// vivo em cima. Partida ao vivo sem table_id (banco sem a migração 20260915,
// ou partida criada antes dela) não ocupa mesa nenhuma - senão uma única
// partida órfã esconderia todas as mesas do formulário de uma vez.
export function freeTables({ activeTables, liveMatches }) {
  const busyTableIds = new Set(liveMatches.map((match) => match.table_id).filter(Boolean));
  return activeTables.filter((table) => !busyTableIds.has(table.id));
}

// Quem sugerir no lado A quando o admin escolhe uma mesa no formulário: o
// dono dela - o vencedor da última partida ali, já sem quem foi embora e sem
// quem está em partida ao vivo (tableHolders resolve isso). Devolve null
// quando não há sugestão: mesa sem dono, dono que não está mais disponível,
// ou dono já escolhido noutro campo do formulário. É sugestão, não trava -
// quem chama nunca limpa o campo por causa de um null.
export function tableHolderSuggestion({ tableId, holders, availablePlayerIds, takenPlayerIds = [] }) {
  if (!tableId) return null;
  const available = new Set(availablePlayerIds);
  const taken = new Set(takenPlayerIds);
  return (holders?.[tableId] || []).find((id) => available.has(id) && !taken.has(id)) ?? null;
}

// Quem está esperando: presença da noite, sem left_at, menos quem está
// jogando e menos quem é dono de alguma mesa (holders já resolvido por
// tableHolders - não recalculado aqui para as duas funções não divergirem).
export function queueForDay({ gameDay, attendance, liveMatches, holders }) {
  const busyIds = new Set(liveMatches.flatMap((match) => matchPlayerIds(match)));
  const holderIds = new Set(Object.values(holders || {}).flat());
  return attendance
    .filter((row) => row.game_day === gameDay && !row.left_at)
    .filter((row) => !busyIds.has(row.player_id) && !holderIds.has(row.player_id))
    .slice()
    // enqueued_at crescente, com desempate por id: sem isso, dois perdedores
    // de um 2x2 carimbados no mesmo milissegundo ficam em ordem indefinida
    // entre renders.
    .sort((a, b) => {
      const diff = new Date(a.enqueued_at).getTime() - new Date(b.enqueued_at).getTime();
      if (diff !== 0) return diff;
      return String(a.id) < String(b.id) ? -1 : String(a.id) > String(b.id) ? 1 : 0;
    });
}

// A mesa onde a pessoa perdeu pela última vez na noite (pode ser nula: nunca
// perdeu, ou a derrota foi numa partida sem table_id).
export function lastLossTableId({ playerId, gameDay, finishedMatches }) {
  const losses = finishedMatches.filter((match) => {
    if (matchGameDay(match) !== gameDay) return false;
    const side = playerSide(match, playerId);
    if (!side) return false;
    const winner = winnerSide(match);
    return Boolean(winner) && side !== winner;
  });
  const latest = latestMatch(losses);
  return latest ? (latest.table_id ?? null) : null;
}

// Com 0 ou 1 mesa ativa a regra de alternância se desliga sozinha. Se a mesa
// da derrota não estiver entre as ativas (desativada ou apagada), o filter
// não remove nada e o resultado já é "todas" - automático, sem caso especial.
export function suggestedTableIds({ activeTables, lastLossTableId }) {
  const ids = activeTables.map((table) => table.id);
  if (activeTables.length <= 1 || !lastLossTableId) return ids;
  return ids.filter((id) => id !== lastLossTableId);
}

export function eligibleForTable(tableId, entries) {
  return entries.filter((entry) => entry.suggestedTableIds.includes(tableId));
}

export function nextForTable(tableId, entries) {
  return eligibleForTable(tableId, entries)[0] ?? null;
}

// Ordem de avaliação deliberada (ver spec): com uma mesa só ativa, os casos
// "todas elegíveis" e "só essa" descreveriam o mesmo estado com rótulos
// diferentes - por isso o caso 1 decide antes de qualquer outro.
export function tableSuggestionLabel({ activeTables, suggestedTableIds }) {
  if (activeTables.length <= 1) return "";
  if (suggestedTableIds.length === activeTables.length) return "qualquer";
  if (suggestedTableIds.length === 1) {
    const table = activeTables.find((item) => item.id === suggestedTableIds[0]);
    return table ? table.name : "qualquer";
  }
  const excluded = activeTables.find((item) => !suggestedTableIds.includes(item.id));
  return excluded ? `qualquer menos ${excluded.name}` : "qualquer";
}

// Composição: monta holders + a fila já com a mesa sugerida e o rótulo de
// cada entrada, pronto para a tela consumir sem recalcular nada.
export function buildQueue({ tables, gameDay, matches, attendance }) {
  const activeTables = tables.filter((table) => table.active);
  const liveMatches = matches.filter((match) => match.status === "live");
  const finishedMatches = matches.filter((match) => match.status === "finished");
  const holders = tableHolders({ tables: activeTables, gameDay, matches, attendance });
  const queueRows = queueForDay({ gameDay, attendance, liveMatches, holders });
  const entries = queueRows.map((row) => {
    const lostTableId = lastLossTableId({ playerId: row.player_id, gameDay, finishedMatches });
    const suggested = suggestedTableIds({ activeTables, lastLossTableId: lostTableId });
    return {
      ...row,
      suggestedTableIds: suggested,
      label: tableSuggestionLabel({ activeTables, suggestedTableIds: suggested }),
    };
  });
  return { holders, entries };
}
