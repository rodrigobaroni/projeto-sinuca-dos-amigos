import { useEffect, useMemo, useState } from "react";
import { PlayerBall, RankBall } from "../components/balls.jsx";
import { ViewHead } from "../components/layout.jsx";
import { computeDoublesStats, computeStats, rankedFrom } from "../domain/stats.js";
import { createWinnerShareImage } from "../share/winnerShareImage.js";
import { defaultGameDay, fmtPeriod, gameDayKey, gameDayRange, matchesInRange } from "../utils/date.js";
import { matchMode, matchPlayerIds } from "../domain/match.js";

export function RankingView({ players, finished, ranked, doublesRanked = [], isAdmin, showToast, playerById, openPlayer }) {
  const [mode, setMode] = useState("1x1");
  const individualFinished = useMemo(() => finished.filter((match) => matchMode(match) === "1x1"), [finished]);
  const initialDay = useMemo(() => defaultGameDay(finished), [finished]);
  const [selectedDay, setSelectedDay] = useState(initialDay);
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    setSelectedDay(initialDay);
  }, [initialDay]);

  const { start: rangeStart, end: rangeEnd } = useMemo(() => gameDayRange(selectedDay), [selectedDay]);
  const periodMatches = useMemo(() => matchesInRange(finished, rangeStart, rangeEnd), [finished, rangeStart, rangeEnd]);
  const periodSingles = useMemo(() => periodMatches.filter((match) => matchMode(match) === "1x1"), [periodMatches]);
  const periodDoubles = useMemo(() => periodMatches.filter((match) => matchMode(match) === "2x2"), [periodMatches]);
  const periodStats = useMemo(() => computeStats(players, periodSingles), [players, periodSingles]);
  const periodRanked = useMemo(() => rankedFrom(periodStats), [periodStats]);
  const periodLeader = periodRanked.find((stat) => stat.total > 0);
  const periodDoublesRanked = useMemo(() => rankedFrom(computeDoublesStats(players, periodDoubles)), [players, periodDoubles]);
  const periodDoublesLeader = periodDoublesRanked.find((team) => team.total > 0);
  const totalGames = individualFinished.length;
  const totalPlayers = ranked.filter((stat) => stat.total > 0).length;
  const availableDays = useMemo(() => {
    const days = {};
    finished.forEach((match) => {
      const key = gameDayKey(match.played_at);
      if (!days[key]) days[key] = { key, total: 0, singles: 0, doubles: 0 };
      days[key].total += 1;
      if (matchMode(match) === "2x2") days[key].doubles += 1;
      else days[key].singles += 1;
    });
    return Object.values(days)
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
        individualLeader: periodLeader,
        doublesLeader: periodDoublesLeader,
        individualRanked: periodRanked,
        doublesRanked: periodDoublesRanked,
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
      <div className="mode-switch" role="group" aria-label="Modalidade do ranking">
        <button className={mode === "1x1" ? "active" : ""} onClick={() => setMode("1x1")}>Individual 1x1</button>
        <button className={mode === "2x2" ? "active" : ""} onClick={() => setMode("2x2")}>Duplas 2x2</button>
      </div>
      {mode === "2x2" ? (
        <div className="ranking-dashboard">
          <section className="ranking-section full-span">
            <div className="section-head">
              <div><div className="eyebrow">placar de parcerias</div><h2>Ranking de duplas</h2></div>
              <div className="general-kpis"><div><strong>{doublesRanked.reduce((sum, team) => sum + team.total, 0) / 2}</strong><span>jogos 2x2</span></div></div>
            </div>
            <DoublesRankingList ranked={doublesRanked} playerById={playerById} openPlayer={openPlayer} />
          </section>
          <PeriodPanel {...{ selectedDay, setSelectedDay, availableDays, fmtDayChip, rangeStart, rangeEnd, periodMatches, periodSingles, periodDoubles, periodLeader, periodDoublesLeader, periodRanked, periodDoublesRanked, playerById, openPlayer, shareSummary, isSharing, finished }} />
        </div>
      ) : !ranked.length || !individualFinished.length ? (
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

          <PeriodPanel {...{ selectedDay, setSelectedDay, availableDays, fmtDayChip, rangeStart, rangeEnd, periodMatches, periodSingles, periodDoubles, periodLeader, periodDoublesLeader, periodRanked, periodDoublesRanked, playerById, openPlayer, shareSummary, isSharing, finished }} />
        </div>
      )}
    </>
  );
}

function PeriodPanel({ selectedDay, setSelectedDay, availableDays, fmtDayChip, rangeStart, rangeEnd, periodMatches, periodSingles, periodDoubles, periodLeader, periodDoublesLeader, periodRanked, periodDoublesRanked, playerById, openPlayer, shareSummary, isSharing, finished }) {
  const hasSingles = periodSingles.length > 0;
  const hasDoubles = periodDoubles.length > 0;
  const mixed = hasSingles && hasDoubles;
  const [rankingMode, setRankingMode] = useState(hasDoubles && !hasSingles ? "2x2" : "1x1");
  useEffect(() => {
    setRankingMode(hasDoubles && !hasSingles ? "2x2" : "1x1");
  }, [hasDoubles, hasSingles, selectedDay]);
  const participants = new Set(periodMatches.flatMap(matchPlayerIds)).size;
  const title = mixed ? "Resumo da jogatina" : hasDoubles ? "Dupla da jogatina" : "Vitorioso do dia";

  return (
    <section className={`ranking-section period-panel adaptive-period-panel ${mixed ? "mixed" : "single-mode"} full-span`}>
      <div className="section-head compact">
        <div><div className="eyebrow">jogatina</div><h2>{title}</h2></div>
        <button className="btn chalk small share-btn" onClick={shareSummary} disabled={isSharing || !periodMatches.length}>{isSharing ? "Gerando..." : "Compartilhar"}</button>
      </div>
      <div className="period-fields">
        <label className="fld"><span>dia da jogatina</span><input className="search no-margin" type="date" value={selectedDay} onChange={(event) => setSelectedDay(event.target.value)} /></label>
        <div className="available-days">
          <span>Dias com jogos</span>
          <div>
            {availableDays.map((day) => (
              <button key={day.key} type="button" className={`day-chip ${selectedDay === day.key ? "active" : ""}`} onClick={() => setSelectedDay(day.key)}>
                <strong>{fmtDayChip(day.key)}</strong>
                <small>{day.total}</small>
              </button>
            ))}
          </div>
        </div>
      </div>
      <button className="btn ghost small latest-btn" onClick={() => setSelectedDay(defaultGameDay(finished))}>Usar última jogatina</button>

      <div className="period-adaptive-content">
        {!!periodMatches.length && (
          <div className="period-overview">
            <div><strong>{periodMatches.length}</strong><span>partidas</span></div>
            {hasSingles && <div><strong>{periodSingles.length}</strong><span>1x1</span></div>}
            {hasDoubles && <div><strong>{periodDoubles.length}</strong><span>2x2</span></div>}
            <div><strong>{participants}</strong><span>jogadores</span></div>
          </div>
        )}

        {!periodMatches.length ? <div className="empty compact-empty">Nenhum jogo nesse período.</div> : (
          <div className={`period-winner-grid ${mixed ? "mixed" : ""}`}>
            {hasSingles && <IndividualWinnerCard leader={periodLeader} label={mixed ? "rei do 1x1" : "líder do recorte"} />}
            {hasDoubles && <DoublesWinnerCard team={periodDoublesLeader} playerById={playerById} label={mixed ? "dupla da jogatina" : "melhor dupla"} />}
          </div>
        )}

        <div className="period-meta">{periodMatches.length} jogo{periodMatches.length !== 1 ? "s" : ""} entre {fmtPeriod(rangeStart)} e {fmtPeriod(rangeEnd)}</div>

        {mixed && (
          <div className="mode-switch period-ranking-switch" role="group" aria-label="Ranking da jogatina">
            <button className={rankingMode === "1x1" ? "active" : ""} onClick={() => setRankingMode("1x1")}>Ranking individual</button>
            <button className={rankingMode === "2x2" ? "active" : ""} onClick={() => setRankingMode("2x2")}>Ranking de duplas</button>
          </div>
        )}
        {(rankingMode === "2x2" || (!hasSingles && hasDoubles))
          ? <PeriodDoublesRankingList ranked={periodDoublesRanked} playerById={playerById} openPlayer={openPlayer} />
          : <PeriodRankingList ranked={periodRanked.filter((stat) => stat.total > 0)} openPlayer={openPlayer} />}
      </div>
    </section>
  );
}

function IndividualWinnerCard({ leader, label }) {
  if (!leader) return null;
  return (
    <div className="period-winner">
      <PlayerBall player={leader} size={58} />
      <div><span>{label}</span><strong>{leader.name}</strong><small>{leader.wins} vitórias · {leader.losses} derrotas · {leader.pct}%</small></div>
    </div>
  );
}

function DoublesWinnerCard({ team, playerById, label }) {
  if (!team) return null;
  return (
    <div className="period-winner doubles">
      <div className="period-team-balls">{team.playerIds.map((id) => <PlayerBall key={id} player={playerById(id)} size={48} />)}</div>
      <div><span>{label}</span><strong>{team.name}</strong><small>{team.wins} vitórias · {team.losses} derrotas · {team.pct}%</small></div>
    </div>
  );
}

function DoublesRankingList({ ranked, playerById, openPlayer }) {
  if (!ranked.length) return <div className="empty compact-empty">Nenhuma partida em dupla ainda.</div>;
  return (
    <div className="rank-list rank-list-featured">
      {ranked.map((team, index) => (
        <div key={team.id} className={`rank-row rank-row-large ${index === 0 ? "top" : ""}`}>
          <RankBall rank={index + 1} size={46} />
          <div className="rank-info">
            <div className="rank-name team-rank-name">
              {team.playerIds.map((id, i) => <span key={id}><button type="button" onClick={() => openPlayer(id)}>{playerById(id)?.name}</button>{i === 0 ? " + " : ""}</span>)}
            </div>
            <div className="rank-season-body">
              <div className="rank-season-record stat-num">
                <span><em>vitórias</em><strong>{team.wins}</strong></span>
                <span className="loss"><em>derrotas</em><strong>{team.losses}</strong></span>
              </div>
              <div className="rank-season-meta"><span>{team.total} jogos</span></div>
            </div>
          </div>
          <div className="rank-wl"><div className="pct stat-num">{team.pct}%</div><div className="wl">aproveitamento</div></div>
        </div>
      ))}
    </div>
  );
}

function PeriodDoublesRankingList({ ranked, playerById, openPlayer }) {
  if (!ranked.length) return <div className="empty compact-empty">Sem duplas presentes nesse dia.</div>;
  return (
    <div className="period-rank-list">
      {ranked.map((team, index) => (
        <div key={team.id} className={`period-rank-row ${index === 0 ? "top" : ""}`}>
          <RankBall rank={index + 1} size={36} />
          <div className="period-rank-main team-rank-name">
            <strong>{team.playerIds.map((id, i) => <span key={id}><button type="button" onClick={() => openPlayer(id)}>{playerById(id)?.name}</button>{i === 0 ? " + " : ""}</span>)}</strong>
            <span>{team.total} jogos</span>
          </div>
          <div className="period-rank-numbers"><span><b>{team.wins}</b>V</span><span><b>{team.losses}</b>D</span><strong>{team.pct}%</strong></div>
        </div>
      ))}
    </div>
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
