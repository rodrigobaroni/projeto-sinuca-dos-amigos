import { describe, expect, it } from "vitest";
import { addIfAbsentBy, dedupeBy, removeBy, upsertBy } from "./collection.js";

describe("dedupeBy", () => {
  it("mantém a última ocorrência de cada chave (política de desempate)", () => {
    const items = [
      { id: "1", status: "live" },
      { id: "2", status: "finished" },
      { id: "1", status: "finished" },
    ];

    expect(dedupeBy(items)).toEqual([
      { id: "1", status: "finished" },
      { id: "2", status: "finished" },
    ]);
  });

  it("aceita uma chave diferente de id", () => {
    const items = [{ tableId: "a", active: false }, { tableId: "a", active: true }];

    expect(dedupeBy(items, "tableId")).toEqual([{ tableId: "a", active: true }]);
  });
});

describe("upsertBy", () => {
  it("adiciona quando a chave ainda não existe", () => {
    const next = upsertBy([{ id: "1" }], { id: "2" });

    expect(next.map((item) => item.id)).toEqual(["1", "2"]);
  });

  it("substitui em vez de duplicar quando a chave já existe", () => {
    const next = upsertBy([{ id: "1", name: "Mesa velha" }], { id: "1", name: "Mesa nova" });

    expect(next).toEqual([{ id: "1", name: "Mesa nova" }]);
  });

  it("colapsa duplicatas pré-existentes antes de aplicar a escrita, mantendo a última", () => {
    const items = [{ id: "1", status: "live" }, { id: "1", status: "finished" }];
    const next = upsertBy(items, { id: "2" });
    const survivors = next.filter((item) => item.id === "1");

    expect(survivors).toEqual([{ id: "1", status: "finished" }]);
  });

  it("aplica a função de sort quando informada", () => {
    const sort = (items) => items.slice().sort((a, b) => a.order - b.order);
    const next = upsertBy([{ id: "1", order: 2 }], { id: "2", order: 1 }, { sort });

    expect(next.map((item) => item.id)).toEqual(["2", "1"]);
  });

  it("sem sort, preserva a ordem de inserção", () => {
    const next = upsertBy([{ id: "1" }, { id: "2" }], { id: "3" });

    expect(next.map((item) => item.id)).toEqual(["1", "2", "3"]);
  });

  it("funciona com chave customizada", () => {
    const next = upsertBy([{ tableId: "a", active: true }], { tableId: "a", active: false }, { key: "tableId" });

    expect(next).toEqual([{ tableId: "a", active: false }]);
  });
});

describe("addIfAbsentBy", () => {
  it("adiciona quando a chave ainda não está presente", () => {
    const next = addIfAbsentBy([{ id: "1" }], { id: "2" });

    expect(next.map((item) => item.id)).toEqual(["1", "2"]);
  });

  it("mantém a versão existente intacta quando a chave já está presente", () => {
    const items = upsertBy([{ id: "1", value: 1 }], { id: "1", value: 2 });
    const afterInsertResponse = addIfAbsentBy(items, { id: "1", value: 0 });

    expect(afterInsertResponse).toEqual([{ id: "1", value: 2 }]);
  });

  it("colapsa duplicatas pré-existentes, mantendo a última ocorrência", () => {
    const items = [{ id: "1", status: "live" }, { id: "1", status: "finished" }];
    const next = addIfAbsentBy(items, { id: "2" });
    const survivors = next.filter((item) => item.id === "1");

    expect(survivors).toEqual([{ id: "1", status: "finished" }]);
  });

  it("aplica a função de sort quando informada", () => {
    const sort = (items) => items.slice().sort((a, b) => a.order - b.order);
    const next = addIfAbsentBy([{ id: "1", order: 2 }], { id: "2", order: 1 }, { sort });

    expect(next.map((item) => item.id)).toEqual(["2", "1"]);
  });
});

describe("removeBy", () => {
  it("remove o item com a chave informada", () => {
    const next = removeBy([{ id: "1" }, { id: "2" }], "1");

    expect(next.map((item) => item.id)).toEqual(["2"]);
  });

  it("não altera a lista quando a chave não existe", () => {
    const items = [{ id: "1" }, { id: "2" }];
    const next = removeBy(items, "3");

    expect(next).toEqual(items);
  });

  it("funciona com chave customizada", () => {
    const next = removeBy([{ tableId: "a" }, { tableId: "b" }], "a", { key: "tableId" });

    expect(next).toEqual([{ tableId: "b" }]);
  });
});
