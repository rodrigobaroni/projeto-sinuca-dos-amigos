import { describe, expect, it, vi } from "vitest";
import { fetchAllRows } from "./fetchAllRows.js";

// Simula o corte do PostgREST: um conjunto de linhas que só responde a fatia
// pedida, nunca mais que pageSize de uma vez.
const fakeTable = (total, { pageSize = 1000 } = {}) => {
  const rows = Array.from({ length: total }, (_, index) => ({ id: index + 1 }));
  const calls = [];
  const makeQuery = async (from, to) => {
    calls.push([from, to]);
    return { data: rows.slice(from, Math.min(to + 1, from + pageSize)), error: null };
  };
  return { rows, calls, makeQuery };
};

describe("fetchAllRows", () => {
  it("traz todas as linhas quando passam do teto de uma página", async () => {
    const { rows, calls, makeQuery } = fakeTable(1075);
    const { data, error } = await fetchAllRows(makeQuery);
    expect(error).toBeNull();
    expect(data).toHaveLength(1075);
    expect(data).toEqual(rows);
    expect(calls).toEqual([[0, 999], [1000, 1999]]);
  });

  // O caso de produção: sem paginar chegavam 1000 e sumiam as 75 mais
  // recentes, porque a ordem é crescente.
  it("não perde as últimas linhas do conjunto", async () => {
    const { makeQuery } = fakeTable(1075);
    const { data } = await fetchAllRows(makeQuery);
    expect(data[data.length - 1]).toEqual({ id: 1075 });
    expect(data.filter((row) => row.id > 1000)).toHaveLength(75);
  });

  it("mantém a ordem de chegada das páginas", async () => {
    const { data } = await fetchAllRows(fakeTable(2500).makeQuery);
    expect(data.map((row) => row.id)).toEqual(data.map((row) => row.id).slice().sort((a, b) => a - b));
  });

  it("faz uma requisição só quando cabe tudo numa página", async () => {
    const { calls, makeQuery } = fakeTable(120);
    const { data } = await fetchAllRows(makeQuery);
    expect(data).toHaveLength(120);
    expect(calls).toEqual([[0, 999]]);
  });

  it("lida com tabela vazia", async () => {
    const { data, error } = await fetchAllRows(fakeTable(0).makeQuery);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  // Total múltiplo exato da página: a última volta pede uma faixa vazia e
  // recebe [], que é o sinal de fim.
  it("termina quando o total é múltiplo exato do tamanho da página", async () => {
    const { calls, makeQuery } = fakeTable(2000);
    const { data } = await fetchAllRows(makeQuery);
    expect(data).toHaveLength(2000);
    expect(calls).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
  });

  it("propaga o erro da primeira página sem inventar dado", async () => {
    const boom = { message: "falhou" };
    const { data, error } = await fetchAllRows(async () => ({ data: null, error: boom }));
    expect(error).toBe(boom);
    expect(data).toBeNull();
  });

  // Erro no meio não pode virar sucesso parcial: quem chama trataria as
  // linhas já lidas como se fossem o conjunto inteiro.
  it("propaga erro de página seguinte em vez de devolver resultado parcial", async () => {
    const boom = { message: "caiu na segunda pagina" };
    const makeQuery = vi.fn(async (from) => (from === 0
      ? { data: Array.from({ length: 1000 }, (_, i) => ({ id: i })), error: null }
      : { data: null, error: boom }));
    const { data, error } = await fetchAllRows(makeQuery);
    expect(error).toBe(boom);
    expect(data).toBeNull();
  });

  it("trata data nulo sem erro como fim do conjunto", async () => {
    const { data, error } = await fetchAllRows(async () => ({ data: null, error: null }));
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("aceita pageSize menor, pra quem precisar de fatia diferente", async () => {
    const { calls, makeQuery } = fakeTable(25, { pageSize: 10 });
    const { data } = await fetchAllRows(makeQuery, { pageSize: 10 });
    expect(data).toHaveLength(25);
    expect(calls).toEqual([[0, 9], [10, 19], [20, 29]]);
  });

  // Servidor que ignorasse o range devolveria página cheia pra sempre: erro
  // explícito é melhor que laço infinito ou dado truncado em silêncio.
  it("para com erro em vez de repetir pra sempre se a página nunca esvazia", async () => {
    const cheia = Array.from({ length: 10 }, (_, i) => ({ id: i }));
    const { data, error } = await fetchAllRows(async () => ({ data: cheia, error: null }), { pageSize: 10, maxRows: 30 });
    expect(data).toBeNull();
    expect(error.message).toContain("30 linhas");
  });

  it("recusa pageSize invalido em vez de repetir a mesma fatia pra sempre", async () => {
    for (const pageSize of [0, -5, NaN, 1.5, undefined === null ? 1 : Number("x")]) {
      const { data, error } = await fetchAllRows(async () => ({ data: [], error: null }), { pageSize });
      expect(data).toBeNull();
      expect(error.message).toContain("pageSize inválido");
    }
  });

  // O teto é em linhas justamente pra não depender do tamanho da página:
  // fatia pequena num conjunto grande tem de terminar igual.
  it("nao estoura o teto so porque a fatia e pequena", async () => {
    const { calls, makeQuery } = fakeTable(413, { pageSize: 3 });
    const { data, error } = await fetchAllRows(makeQuery, { pageSize: 3 });
    expect(error).toBeNull();
    expect(data).toHaveLength(413);
    expect(calls.length).toBe(138);
  });
});
