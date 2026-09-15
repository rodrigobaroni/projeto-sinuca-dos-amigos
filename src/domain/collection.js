// Helpers genéricos de lista por id, extraídos de match.js: a fila
// (attendance, pool_tables) precisa do mesmo padrão de escrita otimista +
// realtime que as partidas já tinham, só que para outras tabelas e às vezes
// outra chave. `key` deixa isso configurável sem duplicar a lógica.

// Colapsa duplicatas da mesma chave antes de aplicar a escrita. Conserta quem
// estiver com o array sujo (dois eventos aplicados fora de ordem) sem
// precisar de reload.
// Política de desempate deliberada, não um acidente do Map: mantém a ÚLTIMA
// ocorrência, porque é a que chegou por último no estado - a mais provável de
// ser a mais recente na ausência de qualquer timestamp ou número de versão na
// linha. Se um dia a linha ganhar um updated_at (ou similar), o desempate
// correto passa a ser por esse campo, e é aqui que se resolve.
export function dedupeBy(items, key = "id") {
  const byKey = new Map();
  for (const item of items) byKey.set(item[key], item);
  return [...byKey.values()];
}

// Sem timestamp confiável para comparar (newerBy ausente), inválido dos dois
// lados, ou empatado: substitui - é o comportamento original, "a linha que
// chega é a verdade".
function isAtLeastAsNew(row, existing, field) {
  const rowTime = new Date(row[field]).getTime();
  const existingTime = new Date(existing[field]).getTime();
  if (!Number.isFinite(rowTime) || !Number.isFinite(existingTime)) return true;
  return rowTime >= existingTime;
}

// Sem `newerBy`: a linha que chega substitui sempre. Vale para matches, onde
// startMatch é sempre INSERT com id inédito e o realtime é a única fonte de
// updates - não há duas escritas concorrentes na mesma linha para comparar.
//
// Com `newerBy` (ex.: "updated_at", presente em pool_tables e attendance,
// que têm trigger de updated_at): só substitui se a linha que chega for
// igual ou mais nova que a existente nesse campo. Isso resolve as duas
// ordens de chegada possíveis quando a mesma linha pode aparecer duas vezes
// por dois canais - resposta HTTP do próprio comando e evento de realtime -
// e quando dois admins escrevem a mesma linha em paralelo: a resposta HTTP
// aplica o que ela mesma acabou de gravar (empate de updated_at vence, por
// isso >=), e um evento de realtime mais novo de outro admin não é
// sobrescrito por uma resposta HTTP atrasada do comando anterior.
export function upsertBy(items, row, { key = "id", sort, newerBy } = {}) {
  const deduped = dedupeBy(items, key);
  const existing = deduped.find((item) => item[key] === row[key]);
  let next;
  if (!existing) {
    next = [...deduped, row];
  } else if (newerBy && !isAtLeastAsNew(row, existing, newerBy)) {
    next = deduped;
  } else {
    next = deduped.map((item) => (item[key] === row[key] ? row : item));
  }
  return sort ? sort(next) : next;
}

// Resposta do insert: só preenche a lacuna se o realtime ainda não tiver chegado.
// Nunca sobrescreve uma versão já presente - ela pode ser mais nova que esta,
// se o WebSocket entregou a linha antes da resposta HTTP do próprio insert.
export function addIfAbsentBy(items, row, { key = "id", sort } = {}) {
  const deduped = dedupeBy(items, key);
  const exists = deduped.some((item) => item[key] === row[key]);
  const next = exists ? deduped : [...deduped, row];
  return sort ? sort(next) : next;
}

export function removeBy(items, id, { key = "id" } = {}) {
  return items.filter((item) => item[key] !== id);
}
