import { useEffect, useMemo, useState } from "react";
import { PlayerBall, RankBall } from "../components/balls.jsx";
import { ViewHead } from "../components/layout.jsx";
import { computeStats, rankedFrom } from "../domain/stats.js";
import { createWinnerShareImage } from "../share/winnerShareImage.js";
import { defaultGameDay, fmtPeriod, gameDayKey, gameDayRange, matchesInRange } from "../utils/date.js";

export function RankingView({ players, finished, ranked, isAdmin, showToast, playerById, openPlayer }) {
  const initialDay = useMemo(() => defaultGameDay(finished), [finished]);
  const [selectedDay, setSelectedDay] = useState(initialDay);
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
  const availableDays = useMemo(() => {
    const days = {};
    finished.forEach((match) => {
      const key = gameDayKey(match.played_at);
      days[key] = (days[key] || 0) + 1;
    });
    return Object.entries(days)
      .map(([key, total]) => ({ key, total }))
      .sort((a, b) => b.key.localeCompare(a.key));
  }, [finished]);
  const fmtDayChip = (key) => new Date(`${key}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

  const shareSummary = async () => {
    if (isSharing) return;
    setIsSharing(true);
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
        await navigator.share({ files: [image] });
      } else {
        const url = URL.createObjectURL(image);
        const link = document.createElement("a");
        link.href = url;
        link.download = image.name;
        link.click();
        URL.revokeObjectURL(url);
        showToast("Imagem baixada");
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
        <div className="empty">Nenhuma partida ainda.<br />{isAdmin ? "Vá no Painel e registre o primeiro jogo." : "Peça pro admin lançar a primeira partida."}</div>
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
              </div>
            </div>
            <RankingList ranked={ranked.filter((stat) => stat.total > 0)} openPlayer={openPlayer} featured />
          </section>

          <section className="ranking-section period-panel full-span">
            <div className="section-head compact">
              <div>
                <div className="eyebrow">jogatina</div>
                <h2>Vitorioso do dia</h2>
              </div>
              <button className="btn chalk small share-btn" onClick={shareSummary} disabled={isSharing}>{isSharing ? "Gerando..." : "Compartilhar"}</button>
            </div>
            <div className="period-fields">
              <label className="fld"><span>dia da jogatina</span><input className="search no-margin" type="date" value={selectedDay} onChange={(event) => setSelectedDay(event.target.value)} /></label>
              <div className="available-days">
                <span>Dias com jogos</span>
                <div>
                  {availableDays.map((day) => (
                    <button
                      key={day.key}
                      type="button"
                      className={`day-chip ${selectedDay === day.key ? "active" : ""}`}
                      onClick={() => setSelectedDay(day.key)}
                    >
                      <strong>{fmtDayChip(day.key)}</strong>
                      <small>{day.total}</small>
                    </button>
                  ))}
                </div>
              </div>
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
                <div className="rank-season-body">
                  <div className="rank-season-record stat-num">
                    <span>
                      <em>vitórias</em>
                      <strong>{stat.wins}</strong>
                    </span>
                    <span className="loss">
                      <em>derrotas</em>
                      <strong>{stat.losses}</strong>
                    </span>
                  </div>
                  <div className="rank-season-meta">
                    <span>{stat.total} jogos</span>
                    <span>melhor seq. {stat.bestStreak}</span>
                  </div>
                </div>
              ) : (
                <div className="rank-sub">{stat.total} jogos · melhor seq. {stat.bestStreak} {stat.curStreak >= 2 && <span className="streak">▲ {stat.curStreak} seguidas</span>}</div>
              )}
            </div>
            <div className="rank-wl">
              <div className="pct stat-num">{stat.pct}%</div>
              <div className="wl">aproveitamento</div>
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
