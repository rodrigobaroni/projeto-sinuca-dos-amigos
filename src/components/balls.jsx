import { BALL_COLORS, POOL_COLORS } from "../constants.js";
import { hashColor, initials } from "../utils/player.js";

export function Ball({ size = 34, color = "#1c1c1c", num, text, striped = false }) {
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

export function PlayerBall({ player, size = 34 }) {
  return <InitialBall name={player?.name} size={size} />;
}

export function InitialBall({ name, size = 34 }) {
  const label = initials(name);
  const textSize = Math.max(11, Math.round(size * (label.length > 1 ? 0.34 : 0.42)));
  return (
    <span
      className="initial-ball"
      style={{
        width: size,
        height: size,
        "--initial-color": hashColor(name),
        "--initial-text-size": `${textSize}px`,
      }}
      title={name || "Jogador"}
      aria-label={name || "Jogador"}
    >
      <span className="initial-ball__text" aria-hidden="true">{label}</span>
    </span>
  );
}

export function RankBall({ rank, size = 34 }) {
  return <Ball size={size} color={POOL_COLORS[(rank - 1) % POOL_COLORS.length]} num={rank} />;
}

export function PoolBall({ num, size = 42 }) {
  const number = Number(num);
  return <Ball size={size} color={BALL_COLORS[number] || "#444"} num={number} striped={number >= 9} />;
}

export function WhiteBall({ size = 42 }) {
  return <span className="ball" style={{ width: size, height: size, background: "#f4f1e6", border: "1px solid rgba(0,0,0,.15)" }} />;
}
