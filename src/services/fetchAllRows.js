// O PostgREST corta toda resposta em 1000 linhas por padrão - limite do
// servidor, não do cliente, e silencioso: a resposta chega 200 OK, só que
// truncada. Com a 1001a partida no banco o app passou a receber 1000 e, como
// a ordem é crescente, o que sumia eram justamente as MAIS RECENTES: partida
// ao vivo não aparecia, a noite anterior não existia em aparelho que abrisse
// o app do zero, e ranking/recordes/perfis ficavam sem as últimas partidas.
// Por isso toda leitura de tabela que cresce sem teto passa por aqui.
export const PAGE_SIZE = 1000;

// Teto de segurança: se o servidor ignorasse o range e devolvesse sempre uma
// página cheia, o laço não terminaria nunca. Prefiro erro explícito a dado
// truncado em silêncio - que é exatamente o defeito que esta função existe
// para corrigir. Contado em LINHAS, não em páginas: um teto por páginas
// mudaria de significado junto com pageSize e dispararia cedo demais em
// qualquer fatia menor que a padrão.
const MAX_ROWS = 200000;

// makeQuery(from, to) devolve a query já pronta para a fatia pedida. O
// retorno imita o do supabase-js ({ data, error }) de propósito: quem chama
// continua tratando erro do mesmo jeito que tratava com uma chamada só, sem
// try/catch novo nem mudança de contrato.
export async function fetchAllRows(makeQuery, { pageSize = PAGE_SIZE, maxRows = MAX_ROWS } = {}) {
  // pageSize 0, negativo ou NaN pediria a mesma fatia para sempre. Nenhum
  // chamador passa opções hoje, mas a função é genérica e o erro seria um
  // laço travando o app inteiro - barato fechar a porta.
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    return { data: null, error: new Error(`pageSize inválido: ${pageSize}`) };
  }
  const rows = [];
  while (rows.length < maxRows) {
    // O offset é o que já foi lido: enquanto as páginas vierem cheias isso é
    // o mesmo que página x pageSize, e não tem como sair de sincronia.
    const { data, error } = await makeQuery(rows.length, rows.length + pageSize - 1);
    if (error) return { data: null, error };
    const batch = data || [];
    rows.push(...batch);
    // Página incompleta significa fim do conjunto. Quando o total é múltiplo
    // exato do tamanho da página, a volta seguinte pede uma faixa vazia e o
    // PostgREST responde [] - uma requisição a mais, nunca uma linha a menos.
    if (batch.length < pageSize) return { data: rows, error: null };
  }
  return { data: null, error: new Error(`Paginação passou de ${maxRows} linhas sem terminar.`) };
}
