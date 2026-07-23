import { useState } from "react";
import { PlayerBall } from "../components/balls.jsx";
import { ViewHead } from "../components/layout.jsx";
import { fmtDate } from "../utils/date.js";

export function MatchesView({ finished, liveMatches = [], clips = [], isAdmin, playerById, openMatch, go }) {
  const [filter, setFilter] = useState("");
  const list = finished.slice().reverse().filter((match) => {
    const query = filter.trim().toLowerCase();
    if (!query) return true;
    return [match.player_a, match.player_b].some((id) => playerById(id)?.name.toLowerCase().includes(query));
  });
  return (
    <>
      <ViewHead eyebrow="histórico" title="Partidas" />
      {liveMatches.map((liveMatch) => (
        <button key={liveMatch.id} className="card live-card" onClick={() => (isAdmin ? go("admin") : openMatch(liveMatch.id))}>
          <div className="live-label"><span /> <span className="eyebrow">ao vivo agora</span></div>
          <div className="live-row">
            <strong>{playerById(liveMatch.player_a)?.name} <span>vs</span> {playerById(liveMatch.player_b)?.name}</strong>
            <span className="rank-sub">{(liveMatch.ball_log || []).length} bolas</span>
          </div>
        </button>
      ))}
      <input className="search" placeholder="filtrar por nome..." value={filter} onChange={(event) => setFilter(event.target.value)} />
      {!list.length ? <div className="empty">{finished.length ? "Nenhuma partida com esse nome." : "Nenhuma partida finalizada ainda."}</div> : (
        <div className="match-list">
          {list.map((match) => {
            const playerA = playerById(match.player_a);
            const playerB = playerById(match.player_b);
            const playerAWon = match.winner_id === match.player_a;
            const playerBWon = match.winner_id === match.player_b;
            const clipCount = clips.filter((clip) => clip.match_id === match.id).length;
            return (
              <button key={match.id} className="match" onClick={() => openMatch(match.id)}>
                <div className="side"><PlayerBall player={playerA} size={30} /><span className={`pname ${playerAWon ? "win" : ""}`}>{playerA?.name}</span></div>
                <div className="match-center"><div className="vs">VS</div><div className="date">{fmtDate(match.played_at)}{(match.ball_log || []).length ? ` · ${match.ball_log.length} bolas` : ""}{clipCount ? ` · ${clipCount} clipe${clipCount !== 1 ? "s" : ""}` : ""}</div></div>
                <div className="side right"><span className={`pname ${playerBWon ? "win" : ""}`}>{playerB?.name}</span><PlayerBall player={playerB} size={30} /></div>
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
