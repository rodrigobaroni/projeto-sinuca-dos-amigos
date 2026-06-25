import { useEffect, useMemo, useState } from "react";
import { PlayerBall, RankBall } from "../components/balls.jsx";
import { ViewHead } from "../components/layout.jsx";
import { computeStats, rankedFrom } from "../domain/stats.js";
import { createWinnerShareImage } from "../share/winnerShareImage.js";
import { defaultGameDay, fmtPeriod, gameDayRange, matchesInRange } from "../utils/date.js";

export function RankingView({ players, finished, ranked, isAdmin, showToast, playerById, openPlayer }) {
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
        <label className="fld"><span>jogador 1</span><select className="select" value={playerA} onChange={(event) => setPlayerA(event.target.value)}><option value="">-</option>{players.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}</select></label>
        <label className="fld"><span>jogador 2</span><select className="select" value={playerB} onChange={(event) => setPlayerB(event.target.value)}><option value="">-</option>{players.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}</select></label>
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
