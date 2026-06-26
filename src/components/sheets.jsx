import { PlayerBall, PoolBall, WhiteBall } from "./balls.jsx";
import { foulReasonText } from "../domain/rules.js";
import { fmtDate, fmtFull } from "../utils/date.js";

function BallLogLabel({ ball }) {
  if (ball === "branca") return <WhiteBall size={26} />;
  const num = Number(ball);
  if (num >= 1 && num <= 15) return <PoolBall num={num} size={26} />;
  return <b>{ball}</b>;
}

export function PlayerSheet({ stat, rank, playerById }) {
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

function clipDuration(seconds) {
  const value = Number(seconds) || 0;
  const minutes = Math.floor(value / 60);
  const rest = value % 60;
  if (!minutes) return `${rest}s`;
  return `${minutes}min ${String(rest).padStart(2, "0")}s`;
}

export function MatchSheet({ match, clips = [], playerById, playerName, isAdmin, onDelete }) {
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
      <div className="eyebrow sheet-section">clipes da partida</div>
      {clips.length ? (
        <div className="clip-list">
          {clips.map((clip, index) => (
            <div className="clip-row" key={clip.id}>
              <div>
                <strong>{clip.label || `Clipe ${index + 1}`}</strong>
                <span>{clipDuration(clip.duration_seconds)} · {fmtFull(clip.created_at)}</span>
              </div>
              <a className="btn ghost small clip-download" href={clip.public_url} download={clip.file_name || true} target="_blank" rel="noreferrer">Baixar</a>
            </div>
          ))}
        </div>
      ) : <div className="empty small-empty">Nenhum clipe salvo para essa partida.</div>}
      {isAdmin && !live && <button className="btn ghost delete-btn" onClick={() => onDelete(match.id)}>Apagar partida</button>}
    </>
  );
}
