import { useState } from "react";
import { PlayerBall } from "../components/balls.jsx";
import { ViewHead } from "../components/layout.jsx";
import { fmtDate } from "../utils/date.js";
import { matchMode, matchPlayerIds, matchSides, sideLabel, winnerSide } from "../domain/match.js";

export function MatchesView({ finished, liveMatches = [], clips = [], isAdmin, playerById, openMatch, go }) {
  const [filter, setFilter] = useState("");
  const list = finished.slice().reverse().filter((match) => {
    const query = filter.trim().toLowerCase();
    if (!query) return true;
    return matchPlayerIds(match).some((id) => playerById(id)?.name.toLowerCase().includes(query));
  });
  return (
    <>
      <ViewHead eyebrow="histórico" title="Partidas" />
      {liveMatches.map((liveMatch) => (
        <button key={liveMatch.id} className="card live-card" onClick={() => (isAdmin ? go("admin") : openMatch(liveMatch.id))}>
          <div className="live-label"><span /> <span className="eyebrow">ao vivo agora</span></div>
          <div className="live-row">
            <strong>{sideLabel(liveMatch, "a", (id) => playerById(id)?.name)} <span>vs</span> {sideLabel(liveMatch, "b", (id) => playerById(id)?.name)}</strong>
            <span className="rank-sub">{(liveMatch.ball_log || []).length} bolas</span>
          </div>
        </button>
      ))}
      <input className="search" placeholder="filtrar por nome..." value={filter} onChange={(event) => setFilter(event.target.value)} />
      {!list.length ? <div className="empty">{finished.length ? "Nenhuma partida com esse nome." : "Nenhuma partida finalizada ainda."}</div> : (
        <div className="match-list">
          {list.map((match) => {
            const sides = matchSides(match);
            const playerA = playerById(sides.a[0]);
            const playerB = playerById(sides.b[0]);
            const playerAWon = winnerSide(match) === "a";
            const playerBWon = winnerSide(match) === "b";
            const clipCount = clips.filter((clip) => clip.match_id === match.id).length;
            return (
              <button key={match.id} className="match" onClick={() => openMatch(match.id)}>
                <div className="side"><PlayerBall player={playerA} size={30} /><span className={`pname ${playerAWon ? "win" : ""}`}>{sideLabel(match, "a", (id) => playerById(id)?.name)}</span></div>
                <div className="match-center"><div className="vs">VS</div><div className="date">{matchMode(match)} · {fmtDate(match.played_at)}{(match.ball_log || []).length ? ` · ${match.ball_log.length} bolas` : ""}{clipCount ? ` · ${clipCount} clipe${clipCount !== 1 ? "s" : ""}` : ""}</div></div>
                <div className="side right"><span className={`pname ${playerBWon ? "win" : ""}`}>{sideLabel(match, "b", (id) => playerById(id)?.name)}</span><PlayerBall player={playerB} size={30} /></div>
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
