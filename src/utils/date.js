import { MONTHS } from "../constants.js";

export const fmtDate = (ts) => new Date(ts).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
export const fmtFull = (ts) => new Date(ts).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
export const fmtPeriod = (ts) => new Date(ts).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export function monthKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function toDatetimeLocal(date) {
  const copy = new Date(date);
  copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
  return copy.toISOString().slice(0, 16);
}

export function toDateInputValue(date) {
  const copy = new Date(date);
  copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
  return copy.toISOString().slice(0, 10);
}

export function defaultGameDay(matches) {
  const latest = matches.length ? new Date(matches[matches.length - 1].played_at) : new Date();
  const day = new Date(latest);
  if (latest.getHours() < 12) day.setDate(day.getDate() - 1);
  return toDateInputValue(day);
}

export function gameDayKey(ts) {
  const date = new Date(ts);
  if (date.getHours() < 12) date.setDate(date.getDate() - 1);
  return toDateInputValue(date);
}

export function gameDayRange(dayValue) {
  const start = new Date(`${dayValue}T12:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: toDatetimeLocal(start), end: toDatetimeLocal(end) };
}

export function matchesInRange(matches, startValue, endValue) {
  if (!startValue || !endValue) return [];
  const start = new Date(startValue).getTime();
  const end = new Date(endValue).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return [];
  return matches.filter((match) => {
    const playedAt = new Date(match.played_at).getTime();
    return playedAt >= start && playedAt <= end;
  });
}

export function monthLabel(key) {
  const [year, month] = key.split("-");
  const label = MONTHS[Number(month) - 1];
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}/${year.slice(2)}`;
}
