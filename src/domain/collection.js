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

// Realtime: a linha que chega do WAL é sempre a verdade mais recente -> substitui.
export function upsertBy(items, row, { key = "id", sort } = {}) {
  const deduped = dedupeBy(items, key);
  const exists = deduped.some((item) => item[key] === row[key]);
  const next = exists
    ? deduped.map((item) => (item[key] === row[key] ? row : item))
    : [...deduped, row];
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
