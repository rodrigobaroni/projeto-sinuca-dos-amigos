import { useEffect, useMemo, useRef, useState } from "react";

const NAV = [
  { key: "ranking", label: "Ranking", icon: '<path d="M4 13v7M10 7v13M16 10v10M22 4v16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>' },
  { key: "partidas", label: "Partidas", icon: '<rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="2" fill="none"/><path d="M7 10h10M7 14h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' },
  { key: "records", label: "Records", icon: '<path d="M8 4h8v4a4 4 0 01-8 0V4zM12 12v4M9 20h6M6 5H4v1a3 3 0 003 3M18 5h2v1a3 3 0 01-3 3" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' },
  { key: "regras", label: "Regras", icon: '<path d="M5 4a2 2 0 012-2h11v16H7a2 2 0 00-2 2V4z" stroke="currentColor" stroke-width="2" fill="none" stroke-linejoin="round"/><path d="M9 6h5M9 9.5h5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' },
  { key: "admin", label: "Admin", adminLabel: "Lançar", icon: '<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" fill="none"/><path d="M12 8v8M8 12h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' },
];

const POOL_COLORS = ["#f4c430", "#1f6fb2", "#c0392b", "#6c3483", "#e67e22", "#1e8449", "#7b241c", "#1c1c1c"];
const BALL_COLORS = {
  1: "#f3c220", 2: "#1f66b0", 3: "#c8202a", 4: "#6b2c91", 5: "#e8731c", 6: "#1b7a3d", 7: "#7a3b1e", 8: "#1a1a1a",
  9: "#f3c220", 10: "#1f66b0", 11: "#c8202a", 12: "#6b2c91", 13: "#e8731c", 14: "#1b7a3d", 15: "#7a3b1e",
};
const EVEN_BALLS = [2, 4, 6, 8, 10, 12, 14];
const ODD_BALLS = [3, 5, 7, 9, 11, 13, 15];
const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

const fmtDate = (ts) => new Date(ts).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
const fmtFull = (ts) => new Date(ts).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
const fmtPeriod = (ts) => new Date(ts).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const monthKey = (ts) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

function toDatetimeLocal(date) {
  const copy = new Date(date);
  copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
  return copy.toISOString().slice(0, 16);
}

function toDateInputValue(date) {
  const copy = new Date(date);
  copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
  return copy.toISOString().slice(0, 10);
}

function defaultGameDay(matches) {
  const latest = matches.length ? new Date(matches[matches.length - 1].played_at) : new Date();
  const day = new Date(latest);
  if (latest.getHours() < 12) day.setDate(day.getDate() - 1);
  return toDateInputValue(day);
}

function gameDayRange(dayValue) {
  const start = new Date(`${dayValue}T12:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: toDatetimeLocal(start), end: toDatetimeLocal(end) };
}

function matchesInRange(matches, startValue, endValue) {
  if (!startValue || !endValue) return [];
  const start = new Date(startValue).getTime();
  const end = new Date(endValue).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return [];
  return matches.filter((match) => {
    const playedAt = new Date(match.played_at).getTime();
    return playedAt >= start && playedAt <= end;
  });
}

function drawRoundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function fitCanvasText(ctx, text, maxWidth) {
  const value = String(text || "");
  if (ctx.measureText(value).width <= maxWidth) return value;
  let next = value;
  while (next.length > 1 && ctx.measureText(`${next}...`).width > maxWidth) {
    next = next.slice(0, -1);
  }
  return `${next}...`;
}

function drawShareBall(ctx, x, y, size, player, fallbackColor = "#1c1c1c") {
  ctx.save();
  const radius = size / 2;
  const gradient = ctx.createRadialGradient(x + size * 0.3, y + size * 0.25, size * 0.08, x + radius, y + radius, radius);
  gradient.addColorStop(0, "rgba(255,255,255,.42)");
  gradient.addColorStop(0.2, player ? hashColor(player.name) : fallbackColor);
  gradient.addColorStop(1, "rgba(0,0,0,.55)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x + radius, y + radius, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (!player) {
    const discSize = size * 0.48;
    ctx.fillStyle = "#f7f4ec";
    ctx.beginPath();
    ctx.arc(x + radius, y + radius, discSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1c2421";
    ctx.font = `700 ${Math.round(size * 0.28)}px Archivo, sans-serif`;
    ctx.fillText("8", x + radius, y + radius + 1);
    ctx.restore();
    return;
  }
  ctx.fillStyle = "rgba(255,255,255,.88)";
  ctx.font = `700 ${Math.round(size * 0.36)}px Archivo, sans-serif`;
  ctx.fillText(initials(player.name), x + radius, y + radius + 1);
  ctx.restore();
}

async function createWinnerShareImage({ selectedDay, rangeStart, rangeEnd, leader, ranked, matches }) {
  await document.fonts?.ready;
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext("2d");
  const dayLabel = new Date(`${selectedDay}T12:00:00`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const activeRanked = ranked.filter((stat) => stat.total > 0).slice(0, 6);

  const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
  bg.addColorStop(0, "#115a40");
  bg.addColorStop(0.56, "#0c3b2a");
  bg.addColorStop(1, "#062319");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(8,42,30,.72)";
  drawRoundRect(ctx, 54, 54, 972, 1242, 42);
  ctx.fill();
  ctx.strokeStyle = "rgba(201,162,75,.28)";
  ctx.lineWidth = 3;
  ctx.stroke();

  drawShareBall(ctx, 92, 92, 58, null);
  ctx.fillStyle = "#f3efe3";
  ctx.font = "400 54px Anton, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("PLACAR DA SINUCA", 168, 130);
  ctx.fillStyle = "#c9a24b";
  ctx.font = "400 22px Space Mono, monospace";
  ctx.letterSpacing = "5px";
  ctx.fillText("RESENHA OFICIAL", 170, 164);
  ctx.letterSpacing = "0px";

  ctx.fillStyle = "#c9a24b";
  ctx.font = "700 27px Space Mono, monospace";
  ctx.fillText("JOGATINA", 92, 250);
  ctx.fillStyle = "#f3efe3";
  ctx.font = "400 74px Anton, sans-serif";
  ctx.fillText("VITORIOSO DO DIA", 92, 324);

  ctx.fillStyle = "#8fb3a2";
  ctx.font = "400 25px Space Mono, monospace";
  ctx.fillText(dayLabel.toUpperCase(), 92, 372);
  ctx.fillText(`${fmtPeriod(rangeStart)} ate ${fmtPeriod(rangeEnd)}`, 92, 410);

  const cardGradient = ctx.createLinearGradient(92, 470, 988, 700);
  cardGradient.addColorStop(0, "rgba(244,196,48,.22)");
  cardGradient.addColorStop(0.48, "rgba(8,42,30,.78)");
  cardGradient.addColorStop(1, "rgba(8,42,30,.95)");
  ctx.fillStyle = cardGradient;
  drawRoundRect(ctx, 92, 468, 896, 250, 34);
  ctx.fill();
  ctx.strokeStyle = "rgba(244,196,48,.48)";
  ctx.lineWidth = 2;
  ctx.stroke();

  if (leader) {
    drawShareBall(ctx, 132, 542, 112, leader);
    ctx.fillStyle = "#c9a24b";
    ctx.font = "700 25px Space Mono, monospace";
    ctx.fillText("LIDER DO RECORTE", 284, 548);
    ctx.fillStyle = "#f4c430";
    ctx.font = "400 68px Anton, sans-serif";
    ctx.fillText(fitCanvasText(ctx, leader.name, 650), 284, 620);
    ctx.fillStyle = "#8fb3a2";
    ctx.font = "400 31px Archivo, sans-serif";
    ctx.fillText(`${leader.wins} vitorias · ${leader.losses} derrotas · ${leader.pct}%`, 286, 674);
  } else {
    ctx.fillStyle = "#f4c430";
    ctx.font = "400 64px Anton, sans-serif";
    ctx.fillText("SEM PARTIDAS", 132, 608);
    ctx.fillStyle = "#8fb3a2";
    ctx.font = "400 30px Archivo, sans-serif";
    ctx.fillText("Nenhum jogo registrado nesse recorte.", 132, 666);
  }

  ctx.fillStyle = "#8fb3a2";
  ctx.font = "400 28px Space Mono, monospace";
  ctx.textAlign = "left";
  ctx.fillText(`${matches.length} jogos no periodo`, 92, 782);

  activeRanked.forEach((stat, index) => {
    const y = 832 + index * 74;
    ctx.fillStyle = index === 0 ? "rgba(244,196,48,.12)" : "rgba(8,42,30,.74)";
    drawRoundRect(ctx, 92, y, 896, 56, 18);
    ctx.fill();
    ctx.strokeStyle = index === 0 ? "rgba(244,196,48,.45)" : "rgba(201,162,75,.16)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = index === 0 ? "#f4c430" : "#f3efe3";
    ctx.font = "700 30px Space Mono, monospace";
    ctx.textAlign = "center";
    ctx.fillText(String(index + 1), 124, y + 38);

    ctx.textAlign = "left";
    ctx.fillStyle = "#f3efe3";
    ctx.font = "700 28px Archivo, sans-serif";
    ctx.fillText(fitCanvasText(ctx, stat.name, 330), 166, y + 36);

    ctx.fillStyle = "#8fb3a2";
    ctx.font = "400 22px Space Mono, monospace";
    ctx.fillText(`${stat.total} jogos`, 520, y + 36);

    ctx.fillStyle = "#f3efe3";
    ctx.font = "700 25px Space Mono, monospace";
    ctx.fillText(`${stat.wins}V · ${stat.losses}D`, 680, y + 36);

    ctx.fillStyle = "#f4c430";
    ctx.font = "700 29px Space Mono, monospace";
    ctx.fillText(`${stat.pct}%`, 865, y + 36);
  });

  ctx.fillStyle = "#c9a24b";
  ctx.font = "400 22px Space Mono, monospace";
  ctx.textAlign = "center";
  ctx.fillText("gerado no placar da sinuca", canvas.width / 2, 1250);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png", 0.95));
  if (!blob) throw new Error("Não foi possível gerar a imagem");
  return new File([blob], `placar-sinuca-${selectedDay}.png`, { type: "image/png" });
}
const monthLabel = (key) => {
  const [year, month] = key.split("-");
  const label = MONTHS[Number(month) - 1];
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}/${year.slice(2)}`;
};

function hashColor(str = "?") {
  let h = 0;
  for (const char of str) h = (h * 31 + char.charCodeAt(0)) & 0xffffff;
  return `hsl(${h % 360} 55% 42%)`;
}

function initials(name = "?") {
  return name.trim().slice(0, 2).toUpperCase();
}

function computeStats(players, matches) {
  const stats = Object.fromEntries(players.map((player) => [player.id, {
    id: player.id,
    name: player.name,
    wins: 0,
    losses: 0,
    total: 0,
    pct: 0,
    curStreak: 0,
    bestStreak: 0,
    history: [],
  }]));

  matches.forEach((match) => {
    const loser = match.winner_id === match.player_a ? match.player_b : match.player_a;
    if (stats[match.winner_id]) {
      stats[match.winner_id].wins += 1;
      stats[match.winner_id].total += 1;
    }
    if (stats[loser]) {
      stats[loser].losses += 1;
      stats[loser].total += 1;
    }
    [match.winner_id, loser].forEach((id) => {
      if (stats[id]) stats[id].history.push({ match, won: id === match.winner_id });
    });
  });

  Object.values(stats).forEach((stat) => {
    stat.pct = stat.total ? Math.round((stat.wins / stat.total) * 100) : 0;
    let current = 0;
    let best = 0;
    stat.history.forEach((item) => {
      if (item.won) {
        current += 1;
        best = Math.max(best, current);
      } else {
        current = 0;
      }
    });
    stat.curStreak = current;
    stat.bestStreak = best;
  });

  return stats;
}

function rankedFrom(stats) {
  return Object.values(stats).sort((a, b) => b.wins - a.wins || b.pct - a.pct || a.losses - b.losses || a.name.localeCompare(b.name));
}

function ballRunRecord(players, matches) {
  let best = { count: 0, playerId: null, playerName: "" };
  matches.forEach((match) => {
    let run = 0;
    let last = null;
    (match.ball_log || []).forEach((entry) => {
      const num = Number(entry.ball);
      const isPot = entry.type !== "foul" && num >= 1 && num <= 15;
      if (isPot && entry.by === last) run += 1;
      else if (isPot) {
        run = 1;
        last = entry.by;
      } else {
        run = 0;
        last = null;
      }
      if (isPot && run > best.count) {
        best = { count: run, playerId: entry.by, playerName: players.find((player) => player.id === entry.by)?.name || "" };
      }
    });
  });
  return best;
}

function foulCounts(players, matches) {
  const counts = Object.fromEntries(players.map((player) => [player.id, { ...player, total: 0, oponente: 0 }]));
  matches.forEach((match) => {
    (match.ball_log || []).forEach((entry) => {
      if (entry.type !== "foul" || entry.reason === "juiz" || !counts[entry.by]) return;
      counts[entry.by].total += 1;
      if (entry.reason === "oponente") counts[entry.by].oponente += 1;
    });
  });
  return Object.values(counts);
}

function breakCounts(players, matches) {
  const counts = Object.fromEntries(players.map((player) => [player.id, { ...player, count: 0 }]));
  matches.forEach((match) => {
    (match.ball_log || []).forEach((entry) => {
      if (entry.brk && counts[entry.by]) counts[entry.by].count += 1;
    });
  });
  return Object.values(counts);
}

function bestLosingStreak(stats) {
  return Object.values(stats).reduce((best, stat) => {
    let current = 0;
    let max = 0;
    stat.history.forEach((item) => {
      if (!item.won) {
        current += 1;
        max = Math.max(max, current);
      } else {
        current = 0;
      }
    });
    return max > best.value ? { value: max, holder: stat.name } : best;
  }, { value: 0, holder: "ninguém ainda" });
}

function h2hRecords(players, matches) {
  const name = (id) => players.find((player) => player.id === id)?.name || "—";
  const pairs = {};
  matches.forEach((match) => {
    const ids = [match.player_a, match.player_b].sort();
    const key = ids.join("|");
    const loser = match.winner_id === match.player_a ? match.player_b : match.player_a;
    if (!pairs[key]) pairs[key] = { ids, games: 0, wins: {}, losses: {} };
    pairs[key].games += 1;
    pairs[key].wins[match.winner_id] = (pairs[key].wins[match.winner_id] || 0) + 1;
    pairs[key].losses[loser] = (pairs[key].losses[loser] || 0) + 1;
  });
  const rows = Object.values(pairs);
  const classic = rows.sort((a, b) => b.games - a.games)[0];
  let fregues = { value: 0, holder: "sem registro", sub: "" };
  let carrasco = { value: 0, holder: "sem registro", sub: "" };
  rows.forEach((row) => {
    row.ids.forEach((id) => {
      const other = row.ids.find((item) => item !== id);
      const lost = row.losses[id] || 0;
      const won = row.wins[id] || 0;
      if (lost > fregues.value) fregues = { value: lost, holder: name(id), sub: `perde pra ${name(other)}` };
      if (won > carrasco.value) carrasco = { value: won, holder: name(id), sub: `domina ${name(other)}` };
    });
  });
  return {
    classic: classic ? { value: classic.games, holder: "duelo mais jogado", sub: `${name(classic.ids[0])} x ${name(classic.ids[1])}` } : { value: "—", holder: "sem registro", sub: "" },
    fregues,
    carrasco,
  };
}

function specialRecordCounts(players, matches) {
  const counts = Object.fromEntries(players.map((player) => [player.id, {
    ...player,
    oneWins: 0,
    washouts: 0,
    scratches: 0,
    earlyOne: 0,
    donated: 0,
  }]));
  matches.forEach((match) => {
    const loser = match.winner_id === match.player_a ? match.player_b : match.player_a;
    const one = (match.ball_log || []).find((entry) => Number(entry.ball) === 1);
    if (one?.by === match.winner_id && one.type !== "foul" && counts[match.winner_id]) counts[match.winner_id].oneWins += 1;
    if (one?.type === "foul" && one.reason === "trunfo" && counts[one.by]) counts[one.by].earlyOne += 1;
    const loserPots = (match.ball_log || []).filter((entry) => entry.by === loser && entry.type !== "foul" && Number(entry.ball) >= 2 && Number(entry.ball) <= 15).length;
    if (loserPots === 0 && counts[match.winner_id]) counts[match.winner_id].washouts += 1;
    (match.ball_log || []).forEach((entry) => {
      if (entry.type !== "foul" || !counts[entry.by]) return;
      if (entry.reason === "scratch" || entry.reason === "branca") counts[entry.by].scratches += 1;
      counts[entry.by].donated += 1;
    });
  });
  return Object.values(counts);
}

function marathonRecord(players, matches) {
  const name = (id) => players.find((player) => player.id === id)?.name || "sem registro";
  const perPlayerDay = {};
  matches.forEach((match) => {
    const day = new Date(match.played_at).toISOString().slice(0, 10);
    [match.player_a, match.player_b].forEach((id) => {
      const key = `${id}|${day}`;
      perPlayerDay[key] = (perPlayerDay[key] || 0) + 1;
    });
  });
  return Object.entries(perPlayerDay).reduce((best, [key, value]) => {
    const [id] = key.split("|");
    return value > best.value ? { value, holder: name(id) } : best;
  }, { value: 0, holder: "sem registro" });
}

function demoData(startForm = false) {
  const names = ["Rodrigo", "Felipe", "Leo", "Bia", "Gui", "Nina", "Caio", "Tati"];
  const players = names.map((name) => ({ id: name.toLowerCase(), name }));
  const days = [1, 3, 4, 7, 9, 12, 14, 16, 18, 21, 23, 25, 27, 29];
  const matches = days.map((day, index) => {
    const playerA = players[index % players.length];
    const playerB = players[(index + 3) % players.length];
    const winner = index % 3 ? playerA : playerB;
    return {
      id: `demo-${index}`,
      player_a: playerA.id,
      player_b: playerB.id,
      winner_id: winner.id,
      status: "finished",
      played_at: new Date(2026, 5, day, 21, 15).toISOString(),
      ball_log: [2, 5, 8, 11, 4, 13, 1].slice(0, 3 + (index % 5)).map((ball, ballIndex) => ({
        n: ballIndex + 1,
        ball: String(ball),
        by: ballIndex % 2 ? playerA.id : playerB.id,
        type: "pot",
        brk: ballIndex === 0 && index % 4 === 0,
      })),
    };
  });
  if (!startForm) {
    matches.push({
      id: "demo-live",
      player_a: players[0].id,
      player_b: players[1].id,
      status: "live",
      played_at: new Date().toISOString(),
      ball_log: [
        { n: 1, ball: "2", by: players[0].id, type: "pot", brk: false },
        { n: 2, ball: "3", by: players[1].id, type: "pot", brk: false },
        { n: 3, ball: "4", by: players[0].id, type: "pot", brk: false },
        { n: 4, ball: "7", by: players[1].id, type: "foul", brk: false },
      ],
    });
  }
  return { players, matches };
}

function Ball({ size = 34, color = "#1c1c1c", num, text, striped = false }) {
  const disc = Math.round(size * 0.62);
  if (striped) {
    return (
      <span className="ball" style={{ width: size, height: size, background: "#f4f1e6" }}>
        <span className="stripe" style={{ background: color, height: Math.round(size * 0.55) }} />
        <span className="disc" style={{ width: disc, height: disc, fontSize: Math.round(disc * 0.55) }}>{num}</span>
      </span>
    );
  }
  return (
    <span className="ball" style={{ width: size, height: size, background: color }}>
      {num != null ? <span className="disc" style={{ width: disc, height: disc, fontSize: Math.round(disc * 0.55) }}>{num}</span> : <span style={{ fontSize: Math.round(size * 0.4), zIndex: 1 }}>{text}</span>}
    </span>
  );
}

function PlayerBall({ player, size = 34 }) {
  return <Ball size={size} color={hashColor(player?.name)} text={initials(player?.name)} />;
}

function RankBall({ rank, size = 34 }) {
  return <Ball size={size} color={POOL_COLORS[(rank - 1) % POOL_COLORS.length]} num={rank} />;
}

function PoolBall({ num, size = 42 }) {
  const number = Number(num);
  return <Ball size={size} color={BALL_COLORS[number] || "#444"} num={number} striped={number >= 9} />;
}

function WhiteBall({ size = 42 }) {
  return <span className="ball" style={{ width: size, height: size, background: "#f4f1e6", border: "1px solid rgba(0,0,0,.15)" }} />;
}

function ViewHead({ eyebrow, title, children }) {
  return (
    <div className="view-head">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <div className="viewtitle">{title}</div>
        {children}
      </div>
    </div>
  );
}

function Toast({ message }) {
  return <div id="toast" className={message ? "show" : ""}>{message}</div>;
}

function Sheet({ children, onClose }) {
  return (
    <div className={`sheet-bg ${children ? "open" : ""}`} onClick={(event) => event.target.classList.contains("sheet-bg") && onClose()}>
      <div className="sheet">
        <div className="grip" />
        {children}
      </div>
    </div>
  );
}

function groupBalls(group) {
  return group === "even" ? EVEN_BALLS : ODD_BALLS;
}

function groupLabel(group) {
  return group === "even" ? "Pares" : group === "odd" ? "Ímpares" : "";
}

function foulReasonText(reason) {
  return ({ oponente: "bola do oponente", trunfo: "bola 1 cedo", branca: "branca", juiz: "juiz derrubou" })[reason] || "";
}

export function App({ supabaseClient }) {
  const query = useMemo(() => new URLSearchParams(window.location.search), []);
  const demoMode = query.has("demo");
  const demoStartForm = query.get("demo") === "start";
  const sb = demoMode ? null : supabaseClient;

  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [current, setCurrent] = useState("ranking");
  const [isAdmin, setIsAdmin] = useState(demoMode);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [sheet, setSheet] = useState(null);
  const toastTimer = useRef(null);

  const finished = useMemo(() => matches.filter((match) => match.status !== "live" && match.winner_id), [matches]);
  const liveMatch = useMemo(() => matches.find((match) => match.status === "live") || null, [matches]);
  const stats = useMemo(() => computeStats(players, finished), [players, finished]);
  const ranked = useMemo(() => rankedFrom(stats), [stats]);

  const playerById = (id) => players.find((player) => player.id === id);
  const playerName = (id) => playerById(id)?.name || "?";
  const showToast = (message) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 2200);
  };

  const load = async () => {
    setLoading(true);
    setError("");
    if (demoMode) {
      const data = demoData(demoStartForm);
      setPlayers(data.players);
      setMatches(data.matches);
      setLoading(false);
      return;
    }
    if (!sb) {
      setError("Configure o Supabase nas variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON, ou abra com ?demo=1.");
      setLoading(false);
      return;
    }
    const [{ data: loadedPlayers, error: playersError }, { data: loadedMatches, error: matchesError }] = await Promise.all([
      sb.from("players").select("*").order("name"),
      sb.from("matches").select("*").order("played_at", { ascending: true }),
    ]);
    if (playersError || matchesError) {
      setError((playersError || matchesError).message);
      setLoading(false);
      return;
    }
    setPlayers(loadedPlayers || []);
    setMatches(loadedMatches || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!sb) return;
    sb.auth.getSession().then(({ data }) => setIsAdmin(Boolean(data.session)));
    const { data: listener } = sb.auth.onAuthStateChange((_event, session) => setIsAdmin(Boolean(session)));
    return () => listener.subscription.unsubscribe();
  }, [sb]);

  const persistMatch = async (id, patch) => {
    setMatches((items) => items.map((match) => (match.id === id ? { ...match, ...patch } : match)));
    if (!sb) return;
    const { error: updateError } = await sb.from("matches").update(patch).eq("id", id);
    if (updateError) {
      showToast(`Erro: ${updateError.message}`);
      await load();
    }
  };

  const addPlayer = async (name) => {
    const cleanName = name.trim();
    if (!cleanName) throw new Error("Digite um nome");
    const existing = players.find((player) => player.name.toLowerCase() === cleanName.toLowerCase());
    if (existing) return existing;
    if (!sb) {
      const player = { id: `demo-${cleanName.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`, name: cleanName };
      setPlayers((items) => [...items, player].sort((a, b) => a.name.localeCompare(b.name)));
      return player;
    }
    const { data, error: insertError } = await sb.from("players").insert({ name: cleanName }).select().single();
    if (insertError) throw insertError;
    setPlayers((items) => [...items, data].sort((a, b) => a.name.localeCompare(b.name)));
    return data;
  };

  const go = (key) => {
    setCurrent(key);
    window.scrollTo({ top: 0 });
  };

  let content;
  if (loading) content = <div className="loading">engizAndo o taco...</div>;
  else if (error) content = <div className="empty">Nao consegui conectar no banco.<br /><small style={{ color: "var(--clay)" }}>{error}</small></div>;
  else if (current === "ranking") content = <RankingView players={players} finished={finished} stats={stats} ranked={ranked} isAdmin={isAdmin} showToast={showToast} playerById={playerById} openPlayer={(id) => setSheet(<PlayerSheet stat={stats[id]} rank={ranked.findIndex((item) => item.id === id) + 1} playerById={playerById} />)} />;
  else if (current === "partidas") content = <MatchesView finished={finished} liveMatch={liveMatch} isAdmin={isAdmin} playerById={playerById} openMatch={(id) => setSheet(<MatchSheet match={matches.find((item) => item.id === id)} playerById={playerById} playerName={playerName} isAdmin={isAdmin} onDelete={async (matchId) => {
    if (!window.confirm("Apagar essa partida? Não dá pra desfazer.")) return;
    setMatches((items) => items.filter((match) => match.id !== matchId));
    if (sb) await sb.from("matches").delete().eq("id", matchId);
    setSheet(null);
    showToast("Partida apagada");
  }} />)} go={go} />;
  else if (current === "records") content = <RecordsView players={players} finished={finished} stats={stats} />;
  else if (current === "regras") content = <RulesView />;
  else content = <AdminView sb={sb} isAdmin={isAdmin} setIsAdmin={setIsAdmin} players={players} addPlayer={addPlayer} liveMatch={liveMatch} playerById={playerById} playerName={playerName} persistMatch={persistMatch} setMatches={setMatches} load={load} showToast={showToast} />;

  return (
    <>
      <div className="app">
        <header>
          <div className="brand">
            <span className="ball8"><Ball size={30} color="#1c1c1c" num={8} /></span>
            <h1>Placar da Sinuca<small>RESENHA OFICIAL</small></h1>
          </div>
          <div className="who">{isAdmin ? <><b>{demoMode ? "demo" : "admin"}</b><br />pode lançar</> : "modo leitura"}</div>
        </header>
        <main id="view">{content}</main>
      </div>
      <nav>
        <div className="nav-in">
          {NAV.map((item) => (
            <button key={item.key} className={`nav-btn ${item.key === "admin" ? "admin" : ""} ${current === item.key ? "active" : ""}`} onClick={() => go(item.key)}>
              <svg viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: item.icon }} />
              {item.key === "admin" && isAdmin ? item.adminLabel : item.label}
            </button>
          ))}
        </div>
      </nav>
      <Sheet onClose={() => setSheet(null)}>{sheet}</Sheet>
      <Toast message={toast} />
    </>
  );
}

function RankingView({ players, finished, stats, ranked, isAdmin, showToast, playerById, openPlayer }) {
  const initialDay = useMemo(() => defaultGameDay(finished), [finished]);
  const [selectedDay, setSelectedDay] = useState(initialDay);
  const [playerA, setPlayerA] = useState("");
  const [playerB, setPlayerB] = useState("");
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    setSelectedDay(initialDay);
  }, [initialDay]);

  const { start: rangeStart, end: rangeEnd } = useMemo(() => gameDayRange(selectedDay), [selectedDay]);
  const periodMatches = useMemo(() => matchesInRange(finished, rangeStart, rangeEnd), [finished, rangeStart, rangeEnd]);
  const periodStats = useMemo(() => computeStats(players, periodMatches), [players, periodMatches]);
  const periodRanked = useMemo(() => rankedFrom(periodStats), [periodStats]);
  const periodLeader = periodRanked.find((stat) => stat.total > 0);
  const totalGames = finished.length;
  const totalPlayers = ranked.filter((stat) => stat.total > 0).length;
  const mostGames = ranked.slice().sort((a, b) => b.total - a.total || b.wins - a.wins)[0];

  const shareSummary = async () => {
    if (isSharing) return;
    setIsSharing(true);
    const title = `Placar da jogatina - ${new Date(`${selectedDay}T12:00:00`).toLocaleDateString("pt-BR")}`;
    const rankingLines = periodRanked
      .filter((stat) => stat.total > 0)
      .slice(0, 6)
      .map((stat, index) => `${index + 1}. ${stat.name}: ${stat.wins}V/${stat.losses}D (${stat.pct}%)`)
      .join("\n");
    const text = `${title}\n${fmtPeriod(rangeStart)} até ${fmtPeriod(rangeEnd)}\n\n${periodMatches.length} jogos no período\nVitorioso: ${periodLeader ? `${periodLeader.name} (${periodLeader.wins}V/${periodLeader.losses}D)` : "sem jogos"}\n\n${rankingLines || "Sem partidas nesse recorte."}`;
    try {
      const image = await createWinnerShareImage({
        selectedDay,
        rangeStart,
        rangeEnd,
        leader: periodLeader,
        ranked: periodRanked,
        matches: periodMatches,
      });
      if (navigator.canShare?.({ files: [image] }) && navigator.share) {
        await navigator.share({ title, text, files: [image] });
      } else {
        const url = URL.createObjectURL(image);
        const link = document.createElement("a");
        link.href = url;
        link.download = image.name;
        link.click();
        URL.revokeObjectURL(url);
        await navigator.clipboard.writeText(text);
        showToast("Imagem baixada e resumo copiado");
      }
    } catch (error) {
      if (error.name !== "AbortError") showToast("Não consegui compartilhar agora");
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <>
      <ViewHead eyebrow="placar da galera" title="Ranking" />
      {!ranked.length || !finished.length ? (
        <div className="empty">Nenhuma partida ainda.<br />{isAdmin ? "Va em Lançar e registre o primeiro jogo." : "Peça pro admin lançar a primeira partida."}</div>
      ) : (
        <div className="ranking-dashboard">
          <section className="ranking-section full-span">
            <div className="section-head">
              <div>
                <div className="eyebrow">placar geral</div>
                <h2>Temporada inteira</h2>
              </div>
              <div className="general-kpis">
                <div><strong>{totalGames}</strong><span>jogos</span></div>
                <div><strong>{totalPlayers}</strong><span>jogadores</span></div>
                <div><strong>{mostGames?.name || "-"}</strong><span>mais presente</span></div>
              </div>
            </div>
            <RankingList ranked={ranked.filter((stat) => stat.total > 0)} openPlayer={openPlayer} featured />
          </section>

          <section className="ranking-section period-panel">
            <div className="section-head compact">
              <div>
                <div className="eyebrow">jogatina</div>
                <h2>Vitorioso do dia</h2>
              </div>
              <button className="btn chalk small share-btn" onClick={shareSummary} disabled={isSharing}>{isSharing ? "Gerando..." : "Compartilhar"}</button>
            </div>
            <div className="period-fields">
              <label className="fld"><span>dia da jogatina</span><input className="search no-margin" type="date" value={selectedDay} onChange={(event) => setSelectedDay(event.target.value)} /></label>
            </div>
            <button className="btn ghost small latest-btn" onClick={() => {
              setSelectedDay(defaultGameDay(finished));
            }}>Usar última jogatina</button>
            <div className="period-winner">
              {periodLeader ? (
                <>
                  <PlayerBall player={periodLeader} size={58} />
                  <div>
                    <span>lider do recorte</span>
                    <strong>{periodLeader.name}</strong>
                    <small>{periodLeader.wins} vitórias · {periodLeader.losses} derrotas · {periodLeader.pct}%</small>
                  </div>
                </>
              ) : (
                <div className="empty compact-empty">Nenhum jogo nesse período.</div>
              )}
            </div>
            <div className="period-meta">{periodMatches.length} jogo{periodMatches.length !== 1 ? "s" : ""} entre {fmtPeriod(rangeStart)} e {fmtPeriod(rangeEnd)}</div>
            <PeriodRankingList ranked={periodRanked.filter((stat) => stat.total > 0)} openPlayer={openPlayer} />
          </section>

          <section className="ranking-section h2h-panel">
            <RankingHeadToHead players={players} finished={finished} periodMatches={periodMatches} playerById={playerById} playerA={playerA} setPlayerA={setPlayerA} playerB={playerB} setPlayerB={setPlayerB} selectedDay={selectedDay} />
          </section>
        </div>
      )}
    </>
  );
}

function RankingList({ ranked, openPlayer, featured = false, compact = false }) {
  if (!ranked.length) return <div className="empty compact-empty">Sem ranking para esse recorte.</div>;
  return (
    <div className={`rank-list ${featured ? "rank-list-featured" : ""} ${compact ? "rank-list-compact" : ""}`}>
      {ranked.map((stat, index) => {
        const rank = index + 1;
        return (
          <button key={stat.id} className={`rank-row ${rank === 1 ? "top" : ""} ${featured ? "rank-row-large" : ""}`} onClick={() => openPlayer(stat.id)}>
            <RankBall rank={rank} size={featured ? 46 : 38} />
            <div className="rank-info">
              <div className="rank-name">{stat.name}</div>
              {featured ? (
                <div className="rank-metrics">
                  <span><strong>{stat.total}</strong> jogos</span>
                  <span><strong>{stat.wins}</strong> vitórias</span>
                  <span><strong>{stat.losses}</strong> derrotas</span>
                </div>
              ) : (
                <div className="rank-sub">{stat.total} jogos · melhor seq. {stat.bestStreak} {stat.curStreak >= 2 && <span className="streak">▲ {stat.curStreak} seguidas</span>}</div>
              )}
              {featured && <div className="rank-sub">melhor seq. {stat.bestStreak} {stat.curStreak >= 2 && <span className="streak">▲ {stat.curStreak} seguidas</span>}</div>}
            </div>
            <div className="rank-wl">
              <div className="pct stat-num">{stat.pct}%</div>
              <div className="wl stat-num"><strong>{stat.wins}V</strong> · <strong>{stat.losses}D</strong></div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function PeriodRankingList({ ranked, openPlayer }) {
  if (!ranked.length) return <div className="empty compact-empty">Sem jogadores presentes nesse dia.</div>;
  return (
    <div className="period-rank-list">
      {ranked.map((stat, index) => {
        const rank = index + 1;
        return (
          <button key={stat.id} className={`period-rank-row ${rank === 1 ? "top" : ""}`} onClick={() => openPlayer(stat.id)}>
            <RankBall rank={rank} size={36} />
            <div className="period-rank-main">
              <strong>{stat.name}</strong>
              <span>{stat.total} jogos · melhor seq. {stat.bestStreak}</span>
            </div>
            <div className="period-rank-numbers">
              <span><b>{stat.wins}</b>V</span>
              <span><b>{stat.losses}</b>D</span>
              <strong>{stat.pct}%</strong>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function MatchesView({ finished, liveMatch, isAdmin, playerById, openMatch, go }) {
  const [filter, setFilter] = useState("");
  const list = finished.slice().reverse().filter((match) => {
    const query = filter.trim().toLowerCase();
    if (!query) return true;
    return [match.player_a, match.player_b].some((id) => playerById(id)?.name.toLowerCase().includes(query));
  });
  return (
    <>
      <ViewHead eyebrow="histórico" title="Partidas" />
      {liveMatch && (
        <button className="card live-card" onClick={() => (isAdmin ? go("admin") : openMatch(liveMatch.id))}>
          <div className="live-label"><span /> <span className="eyebrow">ao vivo agora</span></div>
          <div className="live-row">
            <strong>{playerById(liveMatch.player_a)?.name} <span>vs</span> {playerById(liveMatch.player_b)?.name}</strong>
            <span className="rank-sub">{(liveMatch.ball_log || []).length} bolas</span>
          </div>
        </button>
      )}
      <input className="search" placeholder="filtrar por nome..." value={filter} onChange={(event) => setFilter(event.target.value)} />
      {!list.length ? <div className="empty">{finished.length ? "Nenhuma partida com esse nome." : "Nenhuma partida finalizada ainda."}</div> : (
        <div className="match-list">
          {list.map((match) => {
            const playerA = playerById(match.player_a);
            const playerB = playerById(match.player_b);
            const playerAWon = match.winner_id === match.player_a;
            const playerBWon = match.winner_id === match.player_b;
            return (
              <button key={match.id} className="match" onClick={() => openMatch(match.id)}>
                <div className="side"><PlayerBall player={playerA} size={30} /><span className={`pname ${playerAWon ? "win" : ""}`}>{playerA?.name}</span></div>
                <div className="match-center"><div className="vs">VS</div><div className="date">{fmtDate(match.played_at)}{(match.ball_log || []).length ? ` · ${match.ball_log.length} bolas` : ""}</div></div>
                <div className="side right"><span className={`pname ${playerBWon ? "win" : ""}`}>{playerB?.name}</span><PlayerBall player={playerB} size={30} /></div>
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}

function RankingHeadToHead({ players, finished, periodMatches, playerById, playerA, setPlayerA, playerB, setPlayerB, selectedDay }) {
  const hasSelection = playerA && playerB && playerA !== playerB;
  const totalGames = hasSelection ? finished.filter((match) => [match.player_a, match.player_b].includes(playerA) && [match.player_a, match.player_b].includes(playerB)) : [];
  const periodGames = hasSelection ? periodMatches.filter((match) => [match.player_a, match.player_b].includes(playerA) && [match.player_a, match.player_b].includes(playerB)) : [];
  const summarize = (games) => ({
    winsA: games.filter((match) => match.winner_id === playerA).length,
    winsB: games.filter((match) => match.winner_id === playerB).length,
  });
  const total = summarize(totalGames);
  const period = summarize(periodGames);
  return (
    <>
      <div className="section-head compact">
        <div>
          <div className="eyebrow">cara a cara</div>
          <h2>Confronto</h2>
        </div>
      </div>
      <div className="row2">
        <label className="fld"><span>jogador 1</span><select className="select" value={playerA} onChange={(event) => setPlayerA(event.target.value)}><option value="">—</option>{players.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}</select></label>
        <label className="fld"><span>jogador 2</span><select className="select" value={playerB} onChange={(event) => setPlayerB(event.target.value)}><option value="">—</option>{players.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}</select></label>
      </div>
      {!hasSelection ? <div className="empty compact-empty">Escolha dois jogadores diferentes pra ver o retrospecto total e o recorte da jogatina.</div> : (
        <>
          <div className="h2h-score-stack">
            <H2HScoreCard label="histórico total" playerA={playerById(playerA)} playerB={playerById(playerB)} winsA={total.winsA} winsB={total.winsB} games={totalGames.length} />
            <H2HScoreCard label="dia selecionado" playerA={playerById(playerA)} playerB={playerById(playerB)} winsA={period.winsA} winsB={period.winsB} games={periodGames.length} highlight />
          </div>
          <hr className="brass" />
          <div className="eyebrow h2h-history-title">partidas no dia selecionado</div>
          {periodGames.length ? periodGames.slice().reverse().map((match) => <div className="ballrow h2h-match-row" key={match.id}><span className="dtag">{fmtPeriod(match.played_at)}</span><span>Venceu</span><b style={{ color: "var(--gold)" }}>{playerById(match.winner_id)?.name}</b></div>) : <div className="empty compact-empty">Sem confronto entre eles em {new Date(`${selectedDay}T12:00:00`).toLocaleDateString("pt-BR")}.</div>}
        </>
      )}
    </>
  );
}

function H2HScoreCard({ label, playerA, playerB, winsA, winsB, games, highlight = false }) {
  const leader =
    winsA === winsB ? "empatado" : winsA > winsB ? `${playerA?.name} na frente` : `${playerB?.name} na frente`;
  return (
    <div className={`h2h-card ${highlight ? "highlight" : ""}`}>
      <div className="h2h-card-top">
        <div className="eyebrow">{label}</div>
        <span>{games} jogo{games !== 1 ? "s" : ""}</span>
      </div>
      <div className="h2h-card-body">
        <div className="h2h-player left">
          <PlayerBall player={playerA} size={34} />
          <span>{playerA?.name}</span>
        </div>
        <div className="h2h-score">
          <strong>{winsA}</strong>
          <span>x</span>
          <strong>{winsB}</strong>
        </div>
        <div className="h2h-player right">
          <span>{playerB?.name}</span>
          <PlayerBall player={playerB} size={34} />
        </div>
      </div>
      <div className="h2h-leader">{leader}</div>
    </div>
  );
}

function RecordsView({ players, finished, stats }) {
  const set = finished;
  const setStats = useMemo(() => computeStats(players, set), [players, set]);
  const rankedStats = rankedFrom(setStats);
  if (!finished.length) return <><ViewHead eyebrow="hall da fama" title="Records" /><div className="empty">Sem records ainda. Joguem aí!</div></>;

  const values = Object.values(setStats);
  const mostWins = rankedStats[0];
  const bestStreak = values.slice().sort((a, b) => b.bestStreak - a.bestStreak)[0];
  const mostGames = values.slice().sort((a, b) => b.total - a.total)[0];
  const bestPct = values.filter((stat) => stat.total >= 3).sort((a, b) => b.pct - a.pct)[0];
  const lanterna = values.filter((stat) => stat.total > 0).sort((a, b) => b.losses - a.losses)[0];
  const coldFeet = bestLosingStreak(setStats);
  const h2h = h2hRecords(players, set);
  const special = specialRecordCounts(players, set);
  const topSpecial = (field) => special.slice().sort((a, b) => b[field] - a[field])[0];
  const washouts = topSpecial("washouts");
  const marathon = marathonRecord(players, set);
  const hold = (item, value) => (item && value ? item.name : "ninguém ainda");
  const recordValue = (value) => value || "—";

  return (
    <section className="records-page">
      <ViewHead eyebrow="hall da fama" title="Records" />
      <div className="records-period-pills" aria-label="Filtro de período visual">
        <span className="mchip active">Geral</span>
        <span className="mchip">Jun/26</span>
      </div>

      <RecordSection title="hall da fama">
        <Record label="mais vitórias" desc="Quem mais saiu vencedor nas partidas." value={mostWins.wins} holder={mostWins.name} />
        <Record label="pé-quente" desc="Maior sequência de vitórias jogo após jogo." value={bestStreak.bestStreak || "—"} holder={bestStreak.bestStreak ? bestStreak.name : "ninguém ainda"} sub="vitórias seguidas" />
        <Record label="clássico da resenha" desc="A dupla que mais se enfrentou na mesa." value={recordValue(h2h.classic.value)} holder={h2h.classic.holder} sub={h2h.classic.sub} />
        <Record label="melhor aproveitamento" desc="Maior percentual de vitórias com pelo menos 3 jogos." value={bestPct ? `${bestPct.pct}%` : "—"} holder={bestPct?.name || "sem registro"} sub="(3+ jogos)" />
        <Record label="mais jogos" desc="Quem mais apareceu para jogar." value={mostGames.total} holder={mostGames.name} />
      </RecordSection>

      <RecordSection title="hall da vergonha" tone="shame">
        <Record label="pé-frio" desc="Maior sequência de derrotas seguidas." value={recordValue(coldFeet.value)} holder={coldFeet.value ? coldFeet.holder : "ninguém ainda"} sub="derrotas seguidas" />
        <Record label="lanterna (mais derrotas)" desc="Quem acumulou mais derrotas no histórico." value={recordValue(lanterna?.losses)} holder={hold(lanterna, lanterna?.losses)} />
        <Record label="freguês" desc="Quem mais perdeu para o mesmo adversário." value={recordValue(h2h.fregues.value)} holder={h2h.fregues.holder} sub={h2h.fregues.sub} />
        <Record label="carrasco" desc="Maior domínio contra um adversário específico." value={recordValue(h2h.carrasco.value)} holder={h2h.carrasco.holder} sub={h2h.carrasco.sub} />
        <Record label="lavador / 7x0" desc="Mais vitórias sem o adversário encaçapar bola do grupo." value={recordValue(washouts?.washouts)} holder={hold(washouts, washouts?.washouts)} />
        <Record label="maratonista" desc="Quem mais jogou partidas em um único dia." value={recordValue(marathon.value)} holder={marathon.value ? marathon.holder : "sem registro"} sub="partidas num dia" />
      </RecordSection>
    </section>
  );
}

function MonthChips({ month, setMonth, months }) {
  return <div className="months"><button className={`mchip ${month === "" ? "active" : ""}`} onClick={() => setMonth("")}>Geral</button>{months.map((key) => <button key={key} className={`mchip ${month === key ? "active" : ""}`} onClick={() => setMonth(key)}>{monthLabel(key)}</button>)}</div>;
}

function RecordSection({ title, tone = "glory", children }) {
  return (
    <section className={`record-section ${tone}`}>
      <div className="record-section-title">{title}</div>
      <div className="rec-grid">{children}</div>
    </section>
  );
}

function Record({ label, desc, value, holder, sub }) {
  return (
    <article className="rec" tabIndex="0">
      <div className="label">{label}</div>
      {desc && <div className="rec-desc">{desc}</div>}
      <div className="val stat-num">{value}</div>
      <div className="holder">{holder}</div>
      {sub && <div className="rec-sub">{sub}</div>}
    </article>
  );
}

function RulesView() {
  const sections = [
    ["O estouro (saque inicial)", ["As bolas que caem no estouro não definem o grupo de ninguém.", "O grupo (pares ou ímpares) só é decidido pela primeira bola encaçapada depois do estouro.", "Se no estouro o jogador encaçapar uma bola e também a branca: passa a vez e cai uma bola do adversário."]],
    ["Definindo o grupo", ["Depois do estouro, a primeira bola que você encaçapa define seu grupo: caiu uma par, você joga com as pares; caiu uma ímpar, joga com as ímpares.", "O adversário fica automaticamente com o outro grupo."]],
    ["A bola 1 (o trunfo)", ["A bola 1 só pode ser encaçapada depois que você derrubar todas as suas bolas.", "Derrubar a bola 1 fora de hora = perde a partida na hora.", "Branca + bola 1 na mesma tacada: se o adversário ainda tiver mais de uma bola na mesa, ele ganha uma tacada pra encaçapar todas as restantes."]],
    ["Faltas e a penalidade", ["Penalidade da falta: o juiz derruba a menor bola do adversário que ainda está na mesa.", "Encaçapar a branca (scratch): cai 1 bola do adversário.", "Jogar a branca pra fora da mesa: cai 1 bola do adversário.", "Não acertar nenhuma bola na tacada: cai 1 bola do adversário.", "Acertar primeiro a bola do adversário (direto, sem tabela): caem 2 bolas do adversário."]],
    ["Bola pra fora", ["Bola par/ímpar derrubada pra fora da mesa volta colada na tabela, perto de onde saiu."]],
    ["Como marcar no app", ["A primeira bola 2 a 15 marcada define os grupos de pares e ímpares.", "Depois disso, toque na bola do jogador quando ela cair; ela sai do rack para mostrar o que ainda falta.", "Quando um jogador zera o grupo, a bola 1 aparece no rack dele; tocar ali encerra com vitória desse jogador.", "Se a bola 1 cair antes da hora, toque na bola 1 central e informe quem derrubou.", "Se marcar errado, use Desfazer no histórico da partida."]],
  ];
  return (
    <>
      <ViewHead eyebrow="como joga" title="Regras"><div className="rank-sub rules-subtitle">Sinuquinha — regra suja, no estilo Baianinho de Mauá.</div></ViewHead>
      <div className="rules-grid">
        {sections.map(([title, items]) => (
          <div className="card" key={title}>
            <div className="eyebrow rules-title">{title}</div>
            {items.map((item) => <div className="rule-line" key={item}><span>▸</span><span>{item}</span></div>)}
          </div>
        ))}
      </div>
    </>
  );
}

function AdminView({ sb, isAdmin, setIsAdmin, players, addPlayer, liveMatch, playerById, playerName, persistMatch, setMatches, load, showToast }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [adminTab, setAdminTab] = useState("partida");
  const [lastWinnerId, setLastWinnerId] = useState("");

  if (!isAdmin) {
    return (
      <>
        <ViewHead eyebrow="acesso restrito" title="Admin" />
        <div className="card">
          <p className="admin-help">Faça login pra lançar partidas. Quem não é admin só visualiza.</p>
          <label className="fld"><span>e-mail</span><input className="search no-margin" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label className="fld"><span>senha</span><input className="search no-margin" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          <button className="btn chalk" onClick={async () => {
            if (!sb) {
              setIsAdmin(true);
              return;
            }
            const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
            if (error) setLoginError(`Não rolou: ${error.message}`);
            else setIsAdmin(true);
          }}>Entrar</button>
          {loginError && <div className="login-error">{loginError}</div>}
        </div>
      </>
    );
  }

  return (
    <>
      <div className="admin-tabs">
        <button className={adminTab === "partida" ? "active" : ""} onClick={() => setAdminTab("partida")}>Partida</button>
        <button className={adminTab === "jogadores" ? "active" : ""} onClick={() => setAdminTab("jogadores")}>Jogadores</button>
        <button className="logout-mini" onClick={async () => {
          if (sb) await sb.auth.signOut();
          setIsAdmin(false);
          showToast("Saiu do admin");
        }}>Sair</button>
      </div>
      {adminTab === "jogadores" ? (
        <PlayerAdmin players={players} addPlayer={addPlayer} showToast={showToast} />
      ) : liveMatch ? (
        <section className="panel live-admin-panel">
          <LiveMatchPanel liveMatch={liveMatch} playerById={playerById} playerName={playerName} persistMatch={persistMatch} setMatches={setMatches} load={load} showToast={showToast} sb={sb} onFinished={setLastWinnerId} />
        </section>
      ) : (
        <section className="panel">
          <div className="eyebrow">admin</div>
          <div className="viewtitle">Iniciar partida</div>
          <StartMatchPanel players={players} addPlayer={addPlayer} setMatches={setMatches} sb={sb} load={load} showToast={showToast} preferredPlayerA={lastWinnerId} />
        </section>
      )}
    </>
  );
}

function PlayerAdmin({ players, addPlayer, showToast }) {
  const [name, setName] = useState("");
  const submit = async () => {
    try {
      const player = await addPlayer(name);
      setName("");
      showToast(`${player.name} cadastrado`);
    } catch (error) {
      showToast(`Erro: ${error.message}`);
    }
  };
  return (
    <section className="panel">
      <div className="eyebrow">admin</div>
      <div className="viewtitle">Jogadores</div>
      <div className="card">
        <div className="row2 admin-add-row">
          <input className="search no-margin" placeholder="nome do jogador" value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => event.key === "Enter" && submit()} />
          <button className="btn chalk small auto-btn" onClick={submit}>Adicionar</button>
        </div>
        {players.length ? <div className="player-chips">{players.map((player) => <span key={player.id}><PlayerBall player={player} size={20} />{player.name}</span>)}</div> : <div className="muted-text">Cadastre a galera aqui. Depois é só lançar as partidas.</div>}
      </div>
    </section>
  );
}

function StartMatchPanel({ players, addPlayer, setMatches, sb, load, showToast, preferredPlayerA = "" }) {
  const initialPlayerA = preferredPlayerA && players.some((player) => player.id === preferredPlayerA) ? preferredPlayerA : players[0]?.id || "";
  const initialPlayerB = players.find((player) => player.id !== initialPlayerA)?.id || "";
  const [playerA, setPlayerA] = useState(initialPlayerA);
  const [playerB, setPlayerB] = useState(initialPlayerB);
  const [when, setWhen] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });

  useEffect(() => {
    const nextA = preferredPlayerA && players.some((player) => player.id === preferredPlayerA) ? preferredPlayerA : players[0]?.id || "";
    if (!nextA) return;
    setPlayerA(nextA);
    setPlayerB((current) => current && current !== nextA ? current : players.find((player) => player.id !== nextA)?.id || "");
  }, [preferredPlayerA, players]);

  if (players.length < 2) return <div className="empty small-empty">Cadastre pelo menos 2 jogadores acima pra iniciar uma partida.</div>;
  return (
    <div className="card">
      <label className="fld"><span>jogador A (quebra)</span><select className="select" value={playerA} onChange={(event) => setPlayerA(event.target.value)}>{players.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}</select></label>
      <label className="fld"><span>jogador B</span><select className="select" value={playerB} onChange={(event) => setPlayerB(event.target.value)}>{players.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}</select></label>
      <label className="fld"><span>data e hora</span><input className="search no-margin" type="datetime-local" value={when} onChange={(event) => setWhen(event.target.value)} /></label>
      <button className="btn chalk" onClick={async () => {
        if (playerA === playerB) {
          showToast("Jogador A e B não podem ser a mesma pessoa");
          return;
        }
        const match = { player_a: playerA, player_b: playerB, played_at: new Date(when).toISOString(), ball_log: [], status: "live" };
        if (!sb) {
          setMatches((items) => [...items, { ...match, id: `demo-live-${Date.now()}` }]);
          showToast("Partida iniciada");
          return;
        }
        const { error } = await sb.from("matches").insert(match);
        if (error) showToast(`Erro: ${error.message}`);
        else {
          await load();
          showToast("Partida iniciada");
        }
      }}>Iniciar partida</button>
    </div>
  );
}

function LiveMatchPanel({ liveMatch, playerById, playerName, persistMatch, setMatches, load, showToast, sb, onFinished }) {
  const [pendingDefinition, setPendingDefinition] = useState(null);
  const [pendingOne, setPendingOne] = useState(false);
  const playerA = playerById(liveMatch.player_a);
  const playerB = playerById(liveMatch.player_b);
  const log = liveMatch.ball_log || [];
  const groups = deriveGroups(liveMatch, log);
  const hasGroups = Boolean(groups[liveMatch.player_a] && groups[liveMatch.player_b]);
  const removedNumbered = new Set(log.map((entry) => Number(entry.ball)).filter((num) => num >= 1 && num <= 15));
  const availableGroupBalls = Array.from({ length: 14 }, (_, index) => index + 2).filter((num) => !removedNumbered.has(num));

  const removeBall = async (ball) => {
    const nextLog = log
      .filter((entry) => Number(entry.ball) !== Number(ball))
      .map((entry, index) => ({ ...entry, n: index + 1 }));
    await persistMatch(liveMatch.id, { ball_log: nextLog });
  };

  const appendBall = async (ball, by, type = "pot", reason = "", brk = false) => {
    const nextLog = [...log, { n: log.length + 1, ball: String(ball), by, type, ...(reason ? { reason } : {}), ...(brk ? { brk: true } : {}) }];
    await persistMatch(liveMatch.id, { ball_log: nextLog });
  };

  const entryForBall = (ball) => log.find((entry) => Number(entry.ball) === Number(ball));
  const isGroupCleared = (playerId) => {
    const group = groups[playerId];
    if (!group) return false;
    return groupBalls(group).every((ball) => removedNumbered.has(ball));
  };
  const trunfoPlayerId = [liveMatch.player_a, liveMatch.player_b].find((id) => isGroupCleared(id));
  const trunfoUnlocked = Boolean(trunfoPlayerId);

  const classifyPot = (ball, by) => {
    const group = groups[by] || null;
    const num = Number(ball);
    const down = new Set(log.map((entry) => Number(entry.ball)).filter((item) => item >= 1 && item <= 15));
    if (num === 1) {
      if (group && groupBalls(group).every((item) => down.has(item))) return { type: "pot" };
      return { type: "foul", reason: "trunfo" };
    }
    if (num >= 2 && num <= 15) {
      if (!group) return { type: "pot" };
      const par = num % 2 === 0 ? "even" : "odd";
      return par === group ? { type: "pot" } : { type: "foul", reason: "oponente" };
    }
    return { type: "pot" };
  };

  const touchGroupBall = (ball, ownerId) => {
    if (entryForBall(ball)) {
      removeBall(ball);
      return;
    }
    if (!hasGroups) {
      setPendingDefinition({ ball });
      return;
    }
    const result = classifyPot(ball, ownerId);
    if (result.type === "foul") showToast(result.reason === "oponente" ? "Falta! matou bola do oponente" : "Falta! bola 1 cedo demais");
    appendBall(ball, ownerId, result.type, result.reason);
  };

  const finishWithOne = async (by) => {
    const canWin = isGroupCleared(by);
    const winnerId = canWin ? by : (by === liveMatch.player_a ? liveMatch.player_b : liveMatch.player_a);
    const cleanLog = log.filter((entry) => Number(entry.ball) !== 1);
    const nextLog = [
      ...cleanLog,
      { n: cleanLog.length + 1, ball: "1", by, type: canWin ? "pot" : "foul", reason: "trunfo" },
    ].map((entry, index) => ({ ...entry, n: index + 1 }));
    setPendingOne(false);
    await persistMatch(liveMatch.id, { ball_log: nextLog, winner_id: winnerId, status: "finished" });
    onFinished?.(winnerId);
    showToast(canWin ? `${playerName(by)} venceu na bola 1` : `Bola 1 fora da hora: vitória de ${playerName(winnerId)}`);
  };

  const undoEntry = async (indexToRemove) => {
    const nextLog = log
      .filter((_, index) => index !== indexToRemove)
      .map((entry, index) => ({ ...entry, n: index + 1 }));
    await persistMatch(liveMatch.id, { ball_log: nextLog });
  };

  const defineGroup = (side) => {
    if (!pendingDefinition) return;
    const by = side === "a" ? liveMatch.player_a : liveMatch.player_b;
    appendBall(pendingDefinition.ball, by, "pot");
    setPendingDefinition(null);
  };

  return (
    <div className="live-table">
      <div className="live-topbar">
        <div className="live-now"><span />Ao vivo</div>
        <div className="live-start-time">iniciada {fmtFull(liveMatch.played_at)}</div>
        <button className="live-cancel" onClick={async () => {
          if (!window.confirm("Cancelar a partida em andamento? O que já foi marcado será apagado.")) return;
          setMatches((items) => items.filter((match) => match.id !== liveMatch.id));
          if (sb) await sb.from("matches").delete().eq("id", liveMatch.id);
          else await load();
          showToast("Partida cancelada");
        }}>Cancelar partida</button>
      </div>

      <div className="live-game-grid">
        <LivePlayerColumn
          side="a"
          player={playerA}
          playerId={liveMatch.player_a}
          group={groups[liveMatch.player_a]}
          log={log}
          onBallTap={touchGroupBall}
          onOneTap={() => finishWithOne(liveMatch.player_a)}
        />

        <div className="live-center">
          <div className={`live-control-card trunfo-card ${trunfoUnlocked ? "unlocked" : ""} ${entryForBall(1) ? "marked-one" : ""}`}>
            <div className="eyebrow">a bola 1 — o trunfo</div>
            <button className="trunfo-ball" onClick={() => setPendingOne(true)}>
              <PoolBall num={1} size={58} />
            </button>
            <p>{trunfoUnlocked ? "Liberada para quem zerou o grupo. Use a bola 1 no rack do jogador." : "Toque aqui quando a 1 cair fora do rack liberado."}</p>
          </div>

          {!hasGroups && (
            <div className="live-control-card group-setup-card">
              <div className="eyebrow">definir grupos</div>
              <p>Toque na primeira bola encaçapada e escolha quem matou. Ela define pares e ímpares.</p>
              <div className="neutral-rack">
                {availableGroupBalls.map((ball) => <LiveBallButton key={ball} ball={ball} entry={entryForBall(ball)} onClick={() => setPendingDefinition({ ball })} />)}
              </div>
            </div>
          )}

          <div className="live-control-card live-history-card">
            <div className="eyebrow">sequência da partida</div>
            <div className="live-history">
              {log.length ? log.map((entry, index) => (
                <div className="live-history-row" key={`${entry.n}-${index}`}>
                  <span>{index + 1}</span>
                  <BallLogLabel ball={entry.ball} />
                  <strong>{playerName(entry.by)}</strong>
                  <em>{entry.type === "foul" ? "falta" : Number(entry.ball) === 1 ? "trunfo" : "queda"}</em>
                  <button className="history-undo" onClick={() => undoEntry(index)}>Desfazer</button>
                </div>
              )) : <p>Nenhuma bola marcada ainda.</p>}
            </div>
          </div>

        </div>

        <LivePlayerColumn
          side="b"
          player={playerB}
          playerId={liveMatch.player_b}
          group={groups[liveMatch.player_b]}
          log={log}
          mirrored
          onBallTap={touchGroupBall}
          onOneTap={() => finishWithOne(liveMatch.player_b)}
        />
      </div>

      {pendingDefinition && (
        <div className="define-overlay">
          <div>
            <div className="eyebrow">quem encaçapou?</div>
            <PoolBall num={pendingDefinition.ball} size={58} />
            <div className="define-actions">
              <button className="btn chalk" onClick={() => defineGroup("a")}>{playerA?.name}</button>
              <button className="btn chalk" onClick={() => defineGroup("b")}>{playerB?.name}</button>
            </div>
            <button className="btn ghost small" onClick={() => setPendingDefinition(null)}>Cancelar</button>
          </div>
        </div>
      )}

      {pendingOne && (
        <div className="define-overlay">
          <div>
            <div className="eyebrow">quem derrubou a 1?</div>
            <PoolBall num={1} size={58} />
            <p className="define-copy">Se esse jogador ainda tiver bolas na mesa, ele perde automaticamente.</p>
            <div className="define-actions">
              <button className="btn chalk" onClick={() => finishWithOne(liveMatch.player_a)}>{playerA?.name}</button>
              <button className="btn chalk" onClick={() => finishWithOne(liveMatch.player_b)}>{playerB?.name}</button>
            </div>
            <button className="btn ghost small" onClick={() => setPendingOne(false)}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}

function LivePlayerColumn({ side, player, playerId, group, log, mirrored = false, onBallTap, onOneTap }) {
  const groupBallsList = group ? groupBalls(group) : [];
  const visibleBalls = groupBallsList.filter((ball) => !log.some((item) => Number(item.ball) === ball));
  const groupCleared = Boolean(group && visibleBalls.length === 0);
  const oneDown = log.some((item) => Number(item.ball) === 1);
  const pottedCount = groupBallsList.filter((ball) => {
    const entry = log.find((item) => Number(item.ball) === ball);
    return entry && entry.type !== "foul" && entry.by === playerId;
  }).length;

  return (
    <section className={`live-player-column ${mirrored ? "mirrored" : ""}`}>
      <div className="live-player-head">
        <div>
          <h3>{player?.name}</h3>
          <span>{group ? groupLabel(group) : "grupo indefinido"}</span>
        </div>
      </div>
      <div className="live-count">
        <strong>{pottedCount}</strong>
        <span>/ 7 na mesa</span>
      </div>
      <div className="live-player-area">
        {group ? (
          <div className="player-rack">
            {visibleBalls.length ? visibleBalls.map((ball) => (
              <LiveBallButton key={ball} ball={ball} onClick={(event) => {
                event.stopPropagation();
                onBallTap(ball, playerId);
              }} />
            )) : groupCleared && !oneDown ? (
              <LiveBallButton ball={1} onClick={(event) => {
                event.stopPropagation();
                onOneTap();
              }} />
            ) : <div className="rack-empty cleared">Grupo zerado.</div>}
          </div>
        ) : (
          <div className="rack-empty">As bolas aparecem aqui quando o grupo for definido.</div>
        )}
      </div>
    </section>
  );
}

function LiveBallButton({ ball, entry, onClick }) {
  return (
    <button className={`live-ball-btn ${entry ? "marked" : ""} ${entry?.type === "foul" ? "foul" : ""}`} onClick={onClick}>
      <PoolBall num={ball} size={46} />
      {entry && <span>{entry.type === "foul" ? "!" : "✓"}</span>}
    </button>
  );
}

function deriveGroups(match, log) {
  const groups = {};
  for (const entry of log || []) {
    const num = Number(entry.ball);
    if (num >= 2 && num <= 15 && entry.type !== "foul" && !entry.brk && !groups[entry.by]) {
      const group = num % 2 === 0 ? "even" : "odd";
      groups[entry.by] = group;
      const other = entry.by === match.player_a ? match.player_b : match.player_a;
      if (!groups[other]) groups[other] = group === "even" ? "odd" : "even";
    }
  }
  return groups;
}

function BallLogLabel({ ball }) {
  if (ball === "branca") return <WhiteBall size={26} />;
  const num = Number(ball);
  if (num >= 1 && num <= 15) return <PoolBall num={num} size={26} />;
  return <b>{ball}</b>;
}

function PlayerSheet({ stat, rank, playerById }) {
  if (!stat) return null;
  return (
    <>
      <div className="sheet-player-head"><PlayerBall player={stat} size={56} /><div><div className="sheet-title">{stat.name}</div><div className="rank-sub">#{rank} no ranking</div></div></div>
      <div className="row2 sheet-stats">
        <div className="card"><div className="pct stat-num gold-num">{stat.wins}</div><div className="rank-sub">vitórias</div></div>
        <div className="card"><div className="pct stat-num clay-num">{stat.losses}</div><div className="rank-sub">derrotas</div></div>
        <div className="card"><div className="pct stat-num">{stat.pct}%</div><div className="rank-sub">aprov.</div></div>
      </div>
      <div className="rank-sub">Melhor sequência: <b>{stat.bestStreak}</b> · Atual: <b>{stat.curStreak}</b></div>
      <div className="eyebrow sheet-section">últimos jogos</div>
      {stat.history.slice().reverse().slice(0, 12).map(({ match, won }) => {
        const opponent = playerById(match.player_a === stat.id ? match.player_b : match.player_a);
        return <div className="ballrow" key={match.id}><span className="dtag">{fmtDate(match.played_at)}</span><b className={won ? "gold-text" : "clay-text"}>{won ? "V" : "D"}</b><span>vs {opponent?.name}</span></div>;
      })}
    </>
  );
}

function MatchSheet({ match, playerById, playerName, isAdmin, onDelete }) {
  if (!match) return null;
  const playerA = playerById(match.player_a);
  const playerB = playerById(match.player_b);
  const winner = playerById(match.winner_id);
  const live = match.status === "live";
  return (
    <>
      <div className="match-sheet-head">
        <div className="rank-sub">{fmtFull(match.played_at)}</div>
        <div className="match-sheet-vs">
          <div><PlayerBall player={playerA} size={48} /><div className={match.winner_id === playerA?.id ? "gold-text" : ""}>{playerA?.name}</div></div>
          <div className="vs">VS</div>
          <div><PlayerBall player={playerB} size={48} /><div className={match.winner_id === playerB?.id ? "gold-text" : ""}>{playerB?.name}</div></div>
        </div>
        <div>{live ? <span className="chalk-text">● em andamento</span> : <>venceu <b className="gold-text">{winner?.name}</b></>}</div>
      </div>
      <hr className="brass" />
      <div className="eyebrow sheet-section">ordem das bolas</div>
      {(match.ball_log || []).length ? (match.ball_log || []).map((entry) => (
        <div className="ballrow" key={`${entry.n}-${entry.ball}-${entry.by}`}>
          <span className="n">{entry.n}</span>
          <BallLogLabel ball={entry.ball} />
          <span className="log-desc">— {entry.type === "foul" ? `falta de ${playerName(entry.by)}${foulReasonText(entry.reason) ? ` (${foulReasonText(entry.reason)})` : ""}` : `${playerName(entry.by)}${entry.brk ? " (estouro)" : ""}`}</span>
        </div>
      )) : <div className="empty small-empty">{live ? "Ainda sem bolas marcadas." : "Essa partida não teve a ordem das bolas registrada."}</div>}
      {isAdmin && !live && <button className="btn ghost delete-btn" onClick={() => onDelete(match.id)}>Apagar partida</button>}
    </>
  );
}
