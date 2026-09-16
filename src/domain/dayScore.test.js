import { describe, expect, it } from "vitest";
import { liveDayHeadToHead } from "./dayScore.js";

// 22h UTC = 19h em São Paulo: mesma noite de jogatina, longe da virada de
// meio-dia, igual ao que queue.test.js já usa.
const at = (dia, hora) => `2026-06-${dia}T${hora}:00:00.000Z`;

const finished = (overrides) => ({
  id: "m",
  status: "finished",
  mode: "1x1",
  played_at: at("25", "22"),
  ended_at: at("25", "23"),
  ...overrides,
});

const live = (overrides) => ({
  id: "live",
  status: "live",
  mode: "1x1",
  played_at: at("26", "01"),
  player_a: "ana",
  player_b: "beto",
  ...overrides,
});

describe("liveDayHeadToHead", () => {
  it("conta as vitórias de cada lado no confronto da noite", () => {
    const score = liveDayHeadToHead([
      finished({ id: "1", player_a: "ana", player_b: "beto", winner_id: "ana" }),
      finished({ id: "2", player_a: "ana", player_b: "beto", winner_id: "beto" }),
      finished({ id: "3", player_a: "ana", player_b: "beto", winner_id: "ana" }),
    ], live());
    expect(score).toMatchObject({ total: 3, winsA: 2, winsB: 1 });
  });

  // Quem foi o lado A de cada partida não importa: o placar é dos dois lados
  // que estão na mesa agora.
  it("não se confunde quando os lados aparecem invertidos na partida antiga", () => {
    const score = liveDayHeadToHead([
      finished({ id: "1", player_a: "beto", player_b: "ana", winner_id: "ana" }),
      finished({ id: "2", player_a: "beto", player_b: "ana", winner_id: "beto" }),
    ], live());
    expect(score).toMatchObject({ total: 2, winsA: 1, winsB: 1 });
  });

  it("ignora partidas com outra gente", () => {
    const score = liveDayHeadToHead([
      finished({ id: "1", player_a: "ana", player_b: "beto", winner_id: "ana" }),
      finished({ id: "2", player_a: "ana", player_b: "caio", winner_id: "ana" }),
      finished({ id: "3", player_a: "caio", player_b: "beto", winner_id: "caio" }),
    ], live());
    expect(score).toMatchObject({ total: 1, winsA: 1, winsB: 0 });
  });

  // Recorte 12h-12h: o que aconteceu na jogatina anterior não entra.
  it("conta só o que é da mesma jogatina", () => {
    const score = liveDayHeadToHead([
      finished({ id: "ontem", player_a: "ana", player_b: "beto", winner_id: "ana", played_at: at("24", "22"), ended_at: at("24", "23") }),
      finished({ id: "hoje", player_a: "ana", player_b: "beto", winner_id: "beto" }),
    ], live());
    expect(score).toMatchObject({ total: 1, winsA: 0, winsB: 1 });
  });

  // Madrugada DE VERDADE no fuso do produto: 05:00Z é 02h em São Paulo, ou
  // seja, antes do meio-dia - e antes do meio-dia ainda é a noite anterior.
  // (O `live` padrão destes testes é 01:00Z, que lá já são 22h do dia 25:
  // mesma noite, mas não madrugada.)
  it("trata a madrugada como a mesma noite", () => {
    const liveDeMadrugada = live({ played_at: "2026-06-26T05:00:00.000Z" });
    const score = liveDayHeadToHead([
      finished({
        id: "1", player_a: "ana", player_b: "beto", winner_id: "ana",
        played_at: "2026-06-26T04:00:00.000Z", ended_at: "2026-06-26T04:30:00.000Z",
      }),
    ], liveDeMadrugada);
    expect(score.gameDay).toBe("2026-06-25");
    expect(score.total).toBe(1);
  });

  it("não mistura 1x1 com 2x2 entre as mesmas pessoas", () => {
    const dupla = finished({
      id: "dupla", mode: "2x2", team_a: ["ana", "caio"], team_b: ["beto", "dani"], winner_side: "a",
    });
    expect(liveDayHeadToHead([dupla], live())).toMatchObject({ total: 0, winsA: 0, winsB: 0 });
  });

  it("conta o confronto de duplas independente da ordem dos parceiros", () => {
    const liveDupla = live({ mode: "2x2", team_a: ["ana", "caio"], team_b: ["beto", "dani"] });
    const score = liveDayHeadToHead([
      finished({ id: "1", mode: "2x2", team_a: ["caio", "ana"], team_b: ["dani", "beto"], winner_side: "a" }),
      finished({ id: "2", mode: "2x2", team_a: ["dani", "beto"], team_b: ["ana", "caio"], winner_side: "a" }),
    ], liveDupla);
    // A segunda foi vitória da dupla de Beto, que é o lado B da partida ao vivo.
    expect(score).toMatchObject({ total: 2, winsA: 1, winsB: 1 });
  });

  it("devolve zero quando é o primeiro confronto da noite", () => {
    expect(liveDayHeadToHead([], live())).toMatchObject({ total: 0, winsA: 0, winsB: 0 });
  });

  it("devolve a janela da jogatina junto do placar", () => {
    const score = liveDayHeadToHead([], live());
    expect(score.gameDay).toBe("2026-06-25");
    expect(new Date(score.start).getTime()).toBeLessThan(new Date(score.end).getTime());
  });
});
