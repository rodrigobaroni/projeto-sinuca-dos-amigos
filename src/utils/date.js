import { MONTHS } from "../constants.js";

// O dia de jogatina e uma propriedade do evento, nao de quem esta olhando:
// a noite em que a galera jogou e a mesma para todo mundo. Por isso todas as
// contas de data usam o fuso do produto, e nao o fuso do navegador.
export const TIMEZONE = "America/Sao_Paulo";

const PARTS = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;
// Data/hora sem fuso: "2026-06-25T13:30" ou "2026-06-25 13:30:00".
const NAIVE = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/;

// Uma string sem fuso significa "esse horario no fuso do produto", nao no fuso
// de quem esta rodando. E o que o admin quer dizer ao digitar num input de data.
function toInstant(ts) {
  if (typeof ts === "string") {
    if (DAY_KEY.test(ts)) return wallClockInstant(ts, 0, 0, 0);
    const naive = ts.match(NAIVE);
    if (naive) return wallClockInstant(naive[1], Number(naive[2]), Number(naive[3]), Number(naive[4] || 0));
  }
  const date = new Date(ts);
  return Number.isFinite(date.getTime()) ? date : null;
}

// Componentes do horario de parede no fuso do produto.
function zonedParts(ts) {
  const date = toInstant(ts);
  if (!date) return null;
  const parts = {};
  for (const part of PARTS.formatToParts(date)) {
    if (part.type !== "literal") parts[part.type] = part.value;
  }
  if (parts.hour === "24") parts.hour = "00";
  return parts;
}

// Quanto o horario de parede esta a frente do UTC naquele instante.
function zonedOffsetMs(date) {
  const parts = zonedParts(date);
  if (!parts) return 0;
  const wall = Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    Number(parts.hour), Number(parts.minute), Number(parts.second),
  );
  return wall - date.getTime();
}

// Instante real correspondente a "tal dia, tal hora de parede" no fuso do
// produto. Duas passadas resolvem os dias de transicao de horario de verao.
function wallClockInstant(dayKey, hour, minute = 0, second = 0) {
  if (!DAY_KEY.test(String(dayKey || ""))) return null;
  const pad = (n) => String(n).padStart(2, "0");
  const wall = Date.parse(`${dayKey}T${pad(hour)}:${pad(minute)}:${pad(second)}Z`);
  if (!Number.isFinite(wall)) return null;
  let instant = new Date(wall - zonedOffsetMs(new Date(wall)));
  instant = new Date(wall - zonedOffsetMs(instant));
  return instant;
}

function shiftDayKey(dayKey, days) {
  const date = new Date(`${dayKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export const playedAtMs = (match) => toInstant(match?.played_at)?.getTime() ?? null;

// Ordem cronologica estavel. Usada em todo lugar que depende de "qual veio
// antes": sequencias, historico e a jogatina mais recente.
// Partida sem data valida nao pode ser datada, entao herda a hora da anterior e
// fica exatamente onde estava - em vez de virar a mais antiga de todas.
export function sortByPlayedAt(matches = []) {
  let previous = -Infinity;
  return matches
    .map((match, index) => {
      const time = playedAtMs(match);
      if (time !== null) previous = time;
      return { match, index, time: time === null ? previous : time };
    })
    .sort((a, b) => a.time - b.time || a.index - b.index)
    .map((item) => item.match);
}

export const fmtDate = (ts) => new Date(ts).toLocaleDateString("pt-BR", { timeZone: TIMEZONE, day: "2-digit", month: "2-digit" });
export const fmtFull = (ts) => new Date(ts).toLocaleString("pt-BR", { timeZone: TIMEZONE, day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
export const fmtPeriod = (ts) => new Date(ts).toLocaleString("pt-BR", { timeZone: TIMEZONE, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export function monthKey(ts) {
  if (typeof ts === "string" && /^\d{4}-\d{2}/.test(ts)) return ts.slice(0, 7);
  const parts = zonedParts(ts);
  return parts ? `${parts.year}-${parts.month}` : "";
}

export function toDatetimeLocal(date) {
  const parts = zonedParts(date);
  return parts ? `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}` : "";
}

export function toDateInputValue(date) {
  const parts = zonedParts(date);
  return parts ? `${parts.year}-${parts.month}-${parts.day}` : "";
}

// A jogatina mais recente do conjunto. Nao assume que o array esta ordenado:
// o realtime pode entregar uma partida retroativa a qualquer momento.
export function defaultGameDay(matches = []) {
  let latest = null;
  for (const match of matches) {
    const time = toInstant(match?.played_at)?.getTime() ?? NaN;
    if (Number.isFinite(time) && (latest === null || time > latest)) latest = time;
  }
  return gameDayKey(latest === null ? Date.now() : latest);
}

// Antes do meio-dia ainda e a noite anterior.
export function gameDayKey(ts) {
  const parts = zonedParts(ts);
  if (!parts) return "";
  const key = `${parts.year}-${parts.month}-${parts.day}`;
  return Number(parts.hour) < 12 ? shiftDayKey(key, -1) : key;
}

// Janela de 12h ate 12h do dia seguinte, em instantes absolutos.
// Dia invalido (input de data limpo pelo usuario) devolve janela vazia em vez
// de estourar: quem consome trata "" como "sem periodo".
export function gameDayRange(dayValue) {
  const start = wallClockInstant(dayValue, 12);
  if (!start) return { start: "", end: "" };
  const end = wallClockInstant(shiftDayKey(dayValue, 1), 12);
  return { start: start.toISOString(), end: end ? end.toISOString() : "" };
}

// Fim exclusivo: as 12:00 em ponto pertencem ao dia que comeca, nunca aos dois.
export function matchesInRange(matches, startValue, endValue) {
  if (!startValue || !endValue) return [];
  const start = new Date(startValue).getTime();
  const end = new Date(endValue).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return [];
  return matches.filter((match) => {
    const playedAt = toInstant(match.played_at)?.getTime() ?? NaN;
    return playedAt >= start && playedAt < end;
  });
}

export function monthLabel(key) {
  const [year, month] = String(key || "").split("-");
  const label = MONTHS[Number(month) - 1];
  if (!label || !year) return String(key || "");
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}/${year.slice(2)}`;
}
