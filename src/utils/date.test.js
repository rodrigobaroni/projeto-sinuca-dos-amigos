import { describe, expect, it } from "vitest";
import { defaultGameDay, gameDayKey, gameDayRange, matchesInRange, playedAtISO, sortByPlayedAt } from "./date.js";

describe("game day date helpers", () => {
  it("assigns matches before noon to the previous game day", () => {
    expect(defaultGameDay([{ played_at: "2026-06-25T05:30:00.000Z" }])).toBe("2026-06-24");
  });

  it("groups early morning matches into the previous game day", () => {
    expect(gameDayKey("2026-06-25T01:30:00")).toBe("2026-06-24");
    expect(gameDayKey("2026-06-25T13:30:00")).toBe("2026-06-25");
  });

  it("builds a noon-to-noon range and filters matches inside it", () => {
    const { start, end } = gameDayRange("2026-06-24");
    const matches = matchesInRange([
      { id: "before", played_at: "2026-06-24T10:00:00.000Z" },
      { id: "inside", played_at: "2026-06-24T20:00:00.000Z" },
      { id: "after", played_at: "2026-06-25T16:00:00.000Z" },
    ], start, end);

    expect(matches.map((match) => match.id)).toEqual(["inside"]);
  });

  it("não estoura quando o usuário limpa o campo de data", () => {
    expect(() => gameDayRange("")).not.toThrow();
    expect(gameDayRange("")).toEqual({ start: "", end: "" });
    expect(matchesInRange([{ played_at: "2026-06-24T20:00:00.000Z" }], "", "")).toEqual([]);
  });

  it("não conta o meio-dia em dois dias de jogatina", () => {
    const noon = "2026-06-25T12:00:00";
    const match = [{ id: "noon", played_at: noon }];
    const dia24 = gameDayRange("2026-06-24");
    const dia25 = gameDayRange("2026-06-25");

    expect(matchesInRange(match, dia24.start, dia24.end)).toEqual([]);
    expect(matchesInRange(match, dia25.start, dia25.end)).toHaveLength(1);
    expect(gameDayKey(noon)).toBe("2026-06-25");
  });

  it("usa o fuso do produto, não o de quem está olhando", () => {
    // instante absoluto: 21h no horário de Brasília de 24/06
    expect(gameDayKey("2026-06-25T00:00:00.000Z")).toBe("2026-06-24");
    // string sem fuso significa horário do produto
    expect(gameDayKey("2026-06-25T13:30:00")).toBe("2026-06-25");
  });

  it("acha a jogatina mais recente mesmo com o array fora de ordem", () => {
    const desordenado = [
      { played_at: "2026-07-27T23:00:00.000Z" },
      { played_at: "2026-06-23T23:00:00.000Z" },
    ];
    expect(defaultGameDay(desordenado)).toBe("2026-07-27");
  });

  it("mantém no lugar a partida sem data em vez de trazê-la para o início", () => {
    const comData = { id: "com-data", played_at: "2026-01-01T12:00:00.000Z" };
    const semData = { id: "sem-data" };

    expect(sortByPlayedAt([comData, semData]).map((m) => m.id)).toEqual(["com-data", "sem-data"]);
    expect(sortByPlayedAt([semData, comData]).map((m) => m.id)).toEqual(["sem-data", "com-data"]);
  });
});

describe("playedAtISO", () => {
  const AGORA = new Date("2026-09-16T04:30:00.000Z").getTime();

  // O bug: o campo foi calculado quando o formulario montou, horas antes, e
  // o formulario nao desmonta mais entre uma partida e outra.
  it("grava o instante real quando o admin nao mexeu no campo", () => {
    expect(playedAtISO({ edited: false, inputValue: "2026-09-15T23:01", now: AGORA }))
      .toBe("2026-09-16T04:30:00.000Z");
  });

  it("respeita o horario digitado quando o admin edita (partida retroativa)", () => {
    // 23:01 no fuso do produto (UTC-3) = 02:01Z do dia seguinte.
    expect(playedAtISO({ edited: true, inputValue: "2026-09-15T23:01", now: AGORA }))
      .toBe("2026-09-16T02:01:00.000Z");
  });

  it("le o valor digitado no fuso do produto, nao no do navegador", () => {
    expect(playedAtISO({ edited: true, inputValue: "2026-06-25T12:00", now: AGORA }))
      .toBe("2026-06-25T15:00:00.000Z");
  });

  // new Date("").toISOString() lanca - e o admin pode apagar o campo.
  it("cai no instante real quando o campo editado esta vazio ou invalido", () => {
    expect(playedAtISO({ edited: true, inputValue: "", now: AGORA })).toBe("2026-09-16T04:30:00.000Z");
    expect(playedAtISO({ edited: true, inputValue: "nao e data", now: AGORA })).toBe("2026-09-16T04:30:00.000Z");
  });

  it("usa o relogio de verdade quando now nao e passado", () => {
    const antes = Date.now();
    const gravado = new Date(playedAtISO({ edited: false, inputValue: "2026-01-01T00:00" })).getTime();
    expect(gravado).toBeGreaterThanOrEqual(antes);
    expect(gravado).toBeLessThanOrEqual(Date.now());
  });

  // Duas partidas seguidas nao podem mais sair com o mesmo carimbo so porque
  // o formulario continuou montado.
  it("da carimbos diferentes para inicios em instantes diferentes", () => {
    const primeira = playedAtISO({ edited: false, inputValue: "2026-09-15T23:01", now: AGORA });
    const segunda = playedAtISO({ edited: false, inputValue: "2026-09-15T23:01", now: AGORA + 47 * 60 * 1000 });
    expect(primeira).not.toBe(segunda);
  });
});
