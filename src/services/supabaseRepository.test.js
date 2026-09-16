import { describe, expect, it } from "vitest";
import { createRepository } from "./supabaseRepository.js";

// Cliente falso no formato do supabase-js: builder encadeável e "thenable",
// que registra as cláusulas order e range de cada consulta. É o que permite
// travar a ORDENAÇÃO - os testes de fetchAllRows cobrem só o fatiamento, e
// order é montado aqui, no repositório.
const fakeSupabase = ({ tables = {}, errors = {} } = {}) => {
  const queries = [];
  const sb = {
    from(table) {
      const query = { table, orders: [], range: null };
      queries.push(query);
      const builder = {
        select: () => builder,
        order(column, options = {}) {
          query.orders.push(`${column} ${options.ascending === false ? "desc" : "asc"}`);
          return builder;
        },
        range(from, to) {
          query.range = [from, to];
          return builder;
        },
        // Sem .range() o await devolve o conjunto inteiro, como o PostgREST
        // faria (truncado, mas aqui não interessa) - com .range(), a fatia.
        then(resolve) {
          if (errors[table]) return resolve({ data: null, error: errors[table] });
          const rows = tables[table] || [];
          const [from, to] = query.range || [0, rows.length - 1];
          return resolve({ data: rows.slice(from, to + 1), error: null });
        },
      };
      return builder;
    },
    storage: { from: () => ({ getPublicUrl: (path) => ({ data: { publicUrl: `https://cdn/${path}` } }) }) },
  };
  return { sb, queries };
};

const linhas = (total, prefixo) => Array.from({ length: total }, (_, i) => ({ id: `${prefixo}${i + 1}` }));

describe("loadScoreboard", () => {
  // O achado do Prumo: id é UUID ALEATÓRIO, e como computeStats calcula
  // curStreak na ordem em que as partidas chegam, desempatar por id faria o
  // sorteio do UUID decidir sequência de vitória nos lotes de played_at
  // igual. created_at tem de vir antes do id.
  it("ordena matches por played_at, depois created_at, depois id", async () => {
    const { sb, queries } = fakeSupabase({ tables: { matches: linhas(3, "m"), players: [], match_clips: [] } });
    await createRepository(sb).loadScoreboard();
    const matches = queries.find((query) => query.table === "matches");
    expect(matches.orders).toEqual(["played_at asc", "created_at asc", "id asc"]);
  });

  it("desempata players por created_at antes do id", async () => {
    const { sb, queries } = fakeSupabase({ tables: { matches: [], players: linhas(2, "p"), match_clips: [] } });
    await createRepository(sb).loadScoreboard();
    expect(queries.find((query) => query.table === "players").orders).toEqual(["name asc", "created_at asc", "id asc"]);
  });

  // Aqui created_at já é a chave principal: o id só fecha a ordem total.
  it("ordena clips por created_at desc com id de desempate", async () => {
    const { sb, queries } = fakeSupabase({ tables: { matches: [], players: [], match_clips: [] } });
    await createRepository(sb).loadScoreboard();
    expect(queries.find((query) => query.table === "match_clips").orders).toEqual(["created_at desc", "id asc"]);
  });

  it("pede sempre uma fatia explícita, nunca a consulta sem range", async () => {
    const { sb, queries } = fakeSupabase({ tables: { matches: linhas(5, "m"), players: linhas(2, "p"), match_clips: [] } });
    await createRepository(sb).loadScoreboard();
    expect(queries.every((query) => query.range !== null)).toBe(true);
  });

  // O bug de produção: 1075 partidas, 1000 chegando, as 75 mais recentes
  // sumindo porque a ordem é crescente.
  it("traz as 1075 partidas, não as 1000 da primeira página", async () => {
    const { sb, queries } = fakeSupabase({ tables: { matches: linhas(1075, "m"), players: [], match_clips: [] } });
    const dados = await createRepository(sb).loadScoreboard();
    expect(dados.matches).toHaveLength(1075);
    expect(dados.matches[dados.matches.length - 1]).toEqual({ id: "m1075" });
    expect(queries.filter((query) => query.table === "matches").map((query) => query.range))
      .toEqual([[0, 999], [1000, 1999]]);
  });

  it("mantém a ordem recebida do servidor ao juntar as páginas", async () => {
    const { sb } = fakeSupabase({ tables: { matches: linhas(1500, "m"), players: [], match_clips: [] } });
    const dados = await createRepository(sb).loadScoreboard();
    expect(dados.matches.map((match) => match.id)).toEqual(linhas(1500, "m").map((match) => match.id));
  });

  // Contratos de erro que já existiam antes da paginação.
  it("lança quando matches falha", async () => {
    const { sb } = fakeSupabase({ tables: { players: [], match_clips: [] }, errors: { matches: { message: "caiu" } } });
    await expect(createRepository(sb).loadScoreboard()).rejects.toMatchObject({ message: "caiu" });
  });

  it("lança quando players falha", async () => {
    const { sb } = fakeSupabase({ tables: { matches: [], match_clips: [] }, errors: { players: { message: "caiu" } } });
    await expect(createRepository(sb).loadScoreboard()).rejects.toMatchObject({ message: "caiu" });
  });

  // match_clips é acessório: erro ali vira lista vazia, nunca derruba o
  // placar público (banco sem a tabela, por exemplo).
  it("degrada clips para lista vazia em erro, sem derrubar o resto", async () => {
    const { sb } = fakeSupabase({
      tables: { matches: linhas(2, "m"), players: linhas(1, "p") },
      errors: { match_clips: { message: "sem tabela" } },
    });
    const dados = await createRepository(sb).loadScoreboard();
    expect(dados.clips).toEqual([]);
    expect(dados.matches).toHaveLength(2);
    expect(dados.players).toHaveLength(1);
  });
});
