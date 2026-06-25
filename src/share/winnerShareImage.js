import { fmtPeriod } from "../utils/date.js";
import { hashColor, initials } from "../utils/player.js";

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

export async function createWinnerShareImage({ selectedDay, rangeStart, rangeEnd, leader, ranked, matches }) {
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
