import { useEffect, useMemo, useState } from "react";
import { PlayerBall } from "../components/balls.jsx";
import { DefaultPlayerPanel } from "../components/DefaultPlayerPanel.jsx";
import { ViewHead } from "../components/layout.jsx";
import { fmtPeriod, gameDayKey, monthKey, monthLabel } from "../utils/date.js";
import { matchMode, matchPlayerIds, matchSides, playerSide, playerWon, sideLabel, winnerSide } from "../domain/match.js";
import { doublesPlayerStats } from "../domain/stats.js";

const PROFILE_MODE_KEY = "sinuca-profile-mode";

export function PlayerView({ players, finished, stats, clips = [], selectedPlayerId = "", onCurrentPlayerChange, playerById, openMatch }) {
  const firstActive = useMemo(() => players.find((player) => stats[player.id]?.total > 0)?.id || players[0]?.id || "", [players, stats]);
  const preferredPlayer = useMemo(
    () => players.some((player) => player.id === selectedPlayerId) ? selectedPlayerId : firstActive,
    [firstActive, players, selectedPlayerId],
  );
  const [selectedPlayer, setSelectedPlayer] = useState(preferredPlayer);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedPeriodOpponent, setSelectedPeriodOpponent] = useState("");
  const [selectedPeriodRange, setSelectedPeriodRange] = useState("");
  const [profileMode, setProfileMode] = useState(() => window.localStorage.getItem(PROFILE_MODE_KEY) === "2x2" ? "2x2" : "1x1");
  const [showAllOpponents, setShowAllOpponents] = useState(false);

  useEffect(() => {
    if (preferredPlayer && selectedPlayer !== preferredPlayer) setSelectedPlayer(preferredPlayer);
  }, [preferredPlayer, selectedPlayer]);

  useEffect(() => {
    setSelectedMonth("");
    setSelectedDay("");
    setSelectedPeriodOpponent("");
    setSelectedPeriodRange("");
    setShowAllOpponents(false);
  }, [selectedPlayer]);

  useEffect(() => {
    setSelectedPeriodOpponent("");
    setSelectedPeriodRange("");
  }, [selectedMonth, selectedDay]);

  useEffect(() => {
    setSelectedPeriodRange("");
  }, [selectedPeriodOpponent]);

  const player = playerById(selectedPlayer);
  const playerStats = stats[selectedPlayer] || { wins: 0, losses: 0, total: 0, pct: 0, bestStreak: 0 };
  const playerMatches = useMemo(
    () => finished.filter((match) => matchMode(match) === "1x1" && (match.player_a === selectedPlayer || match.player_b === selectedPlayer)),
    [finished, selectedPlayer],
  );
  const playerMatchesDesc = useMemo(
    () => playerMatches.slice().sort((a, b) => new Date(b.played_at) - new Date(a.played_at)),
    [playerMatches],
  );

  const dayRows = useMemo(() => {
    const byDay = {};
    playerMatches.forEach((match) => {
      const key = gameDayKey(match.played_at);
      if (!byDay[key]) byDay[key] = { key, total: 0, wins: 0, losses: 0 };
      byDay[key].total += 1;
      if (match.winner_id === selectedPlayer) byDay[key].wins += 1;
      else byDay[key].losses += 1;
    });
    return Object.values(byDay).sort((a, b) => b.key.localeCompare(a.key));
  }, [playerMatches, selectedPlayer]);

  const opponentRows = useMemo(() => {
    const byOpponent = {};
    playerMatches.forEach((match) => {
      const opponentId = match.player_a === selectedPlayer ? match.player_b : match.player_a;
      if (!byOpponent[opponentId]) byOpponent[opponentId] = { id: opponentId, total: 0, wins: 0, losses: 0 };
      byOpponent[opponentId].total += 1;
      if (match.winner_id === selectedPlayer) byOpponent[opponentId].wins += 1;
      else byOpponent[opponentId].losses += 1;
    });
    return Object.values(byOpponent);
  }, [playerMatches, selectedPlayer]);

  const gameDayMonth = (match) => monthKey(`${gameDayKey(match.played_at)}T12:00:00`);
  const months = useMemo(() => [...new Set(playerMatches.map((match) => gameDayMonth(match)))].sort().reverse(), [playerMatches]);
  const playableDays = useMemo(() => [...new Set(playerMatches.map((match) => gameDayKey(match.played_at)))].sort().reverse(), [playerMatches]);

  const filteredMatches = useMemo(() => playerMatchesDesc.filter((match) => {
    if (selectedMonth && gameDayMonth(match) !== selectedMonth) return false;
    if (selectedDay && gameDayKey(match.played_at) !== selectedDay) return false;
    return true;
  }), [playerMatchesDesc, selectedMonth, selectedDay]);

  const periodConfrontationRows = useMemo(() => {
    const byOpponent = {};
    filteredMatches.forEach((match) => {
      const opponentId = match.player_a === selectedPlayer ? match.player_b : match.player_a;
      if (!byOpponent[opponentId]) byOpponent[opponentId] = { id: opponentId, total: 0, wins: 0, losses: 0, matches: [] };
      byOpponent[opponentId].total += 1;
      byOpponent[opponentId].matches.push(match);
      if (match.winner_id === selectedPlayer) byOpponent[opponentId].wins += 1;
      else byOpponent[opponentId].losses += 1;
    });
    return Object.values(byOpponent)
      .map((row) => ({ ...row, pct: row.total ? Math.round((row.wins / row.total) * 100) : 0 }))
      .sort((a, b) => b.total - a.total || b.wins - a.wins || playerById(a.id)?.name?.localeCompare(playerById(b.id)?.name || "") || 0);
  }, [filteredMatches, playerById, selectedPlayer]);
  const selectedPeriodOpponentRow = periodConfrontationRows.find((row) => row.id === selectedPeriodOpponent);

  const fmtDay = (key) => key ? new Date(`${key}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "-";
  const filterLabel = selectedDay ? fmtDay(selectedDay) : selectedMonth ? monthLabel(selectedMonth) : "Geral";
  const selectGeneralPeriod = () => {
    setSelectedMonth("");
    setSelectedDay("");
  };
  const selectMonthPeriod = (value) => {
    setSelectedMonth(value);
    setSelectedDay("");
  };
  const selectDayPeriod = (value) => {
    setSelectedDay(value);
    setSelectedMonth("");
  };
  const bestDay = (field, direction = "max") => {
    if (!dayRows.length) return null;
    return dayRows.slice().sort((a, b) => direction === "max" ? b[field] - a[field] || b.total - a.total : a[field] - b[field] || b.total - a.total)[0];
  };
  const bestOpponent = (field) => opponentRows.slice().sort((a, b) => b[field] - a[field] || b.total - a.total)[0];
  const presence = dayRows.length;
  const avg = (value) => presence ? (value / presence).toFixed(1).replace(".", ",") : "-";
  const mostWinsDay = bestDay("wins");
  const leastWinsDay = bestDay("wins", "min");
  const mostLossesDay = bestDay("losses");
  const leastLossesDay = bestDay("losses", "min");
  const mostLostToPlayer = bestOpponent("wins");
  const mostBeatPlayer = bestOpponent("losses");
  const mostPlayedAgainst = bestOpponent("total");
  const playerMetrics = [
    { label: "presença", desc: "Quantidade de dias que apareceu para jogar.", value: presence, holder: "dias de jogo" },
    { label: "partidas jogadas", desc: "Total de partidas finalizadas.", value: playerStats.total, holder: player?.name },
    { label: "média por dia", desc: "Partidas por dia em que jogou.", value: avg(playerStats.total), holder: "partidas/dia" },
    { label: "média de vitórias", desc: "Vitórias por dia em que jogou.", value: avg(playerStats.wins), holder: "vitórias/dia" },
    { label: "média de derrotas", desc: "Derrotas por dia em que jogou.", value: avg(playerStats.losses), holder: "derrotas/dia" },
    { label: "dia com mais vitória", desc: "Melhor dia em número de vitórias.", value: mostWinsDay?.wins ?? "-", holder: fmtDay(mostWinsDay?.key) },
    { label: "dia com menos vitória", desc: "Menor quantidade de vitórias em dia jogado.", value: leastWinsDay?.wins ?? "-", holder: fmtDay(leastWinsDay?.key) },
    { label: "dia com mais derrota", desc: "Dia com mais derrotas acumuladas.", value: mostLossesDay?.losses ?? "-", holder: fmtDay(mostLossesDay?.key) },
    { label: "dia com menos derrota", desc: "Menor quantidade de derrotas em dia jogado.", value: leastLossesDay?.losses ?? "-", holder: fmtDay(leastLossesDay?.key) },
    { label: "maior sequência", desc: "Vitórias seguidas no histórico.", value: playerStats.bestStreak || "-", holder: "vitórias seguidas" },
    { label: "mais perdeu para ele", desc: "Adversário que mais perdeu para o jogador.", value: mostLostToPlayer?.wins || "-", holder: playerById(mostLostToPlayer?.id)?.name || "sem registro" },
    { label: "mais ganhou dele", desc: "Adversário que mais venceu o jogador.", value: mostBeatPlayer?.losses || "-", holder: playerById(mostBeatPlayer?.id)?.name || "sem registro" },
    { label: "mais enfrentou", desc: "Adversário com mais partidas contra.", value: mostPlayedAgainst?.total || "-", holder: playerById(mostPlayedAgainst?.id)?.name || "sem registro" },
  ];
  const selectedPeriodTotalRow = selectedPeriodOpponentRow ? summarizeH2H("total", selectedPeriodOpponentRow.matches, selectedPlayer) : null;
  const selectedPeriodDayRows = selectedPeriodOpponentRow ? summarizeH2HByDay(selectedPeriodOpponentRow.matches, selectedPlayer) : [];
  const selectedPeriodRangeRow = selectedPeriodRange === "total"
    ? selectedPeriodTotalRow
    : selectedPeriodDayRows.find((row) => row.key === selectedPeriodRange);
  const evolution = useMemo(() => buildPlayerEvolution({
    allMatches: finished.filter((match) => matchMode(match) === "1x1"),
    playerId: selectedPlayer,
    players,
  }), [finished, players, selectedPlayer]);
  const chooseProfileMode = (mode) => {
    setProfileMode(mode);
    window.localStorage.setItem(PROFILE_MODE_KEY, mode);
  };

  return (
    <section className="player-page">
      <ViewHead eyebrow="raio-x individual" title="Jogador" />
      {!players.length ? (
        <div className="empty">Cadastre jogadores para ver o raio-x individual.</div>
      ) : (
        <>
          <section className="player-hero">
            <PlayerBall player={player} size={70} />
              <div className="player-hero-main">
                <div className="eyebrow">perfil</div>
                <h2>{player?.name || "Jogador"}</h2>
                <div className="player-hero-stats">
                  <span>{profileMode === "1x1" ? "Individual 1x1" : "Duplas 2x2"}</span>
                </div>
              </div>
          </section>

          <details className="profile-player-switcher">
            <summary>Trocar jogador</summary>
            <DefaultPlayerPanel players={players} currentPlayerId={selectedPlayerId} onCurrentPlayerChange={onCurrentPlayerChange} />
          </details>

          <div className="mode-switch profile-mode-switch" role="group" aria-label="Modalidade do perfil">
            <button className={profileMode === "1x1" ? "active" : ""} onClick={() => chooseProfileMode("1x1")}>Individual 1x1</button>
            <button className={profileMode === "2x2" ? "active" : ""} onClick={() => chooseProfileMode("2x2")}>Duplas 2x2</button>
          </div>

          {profileMode === "2x2" ? (
            <DoublesProfile player={player} playerId={selectedPlayer} players={players} finished={finished} clips={clips} playerById={playerById} openMatch={openMatch} />
          ) : !playerMatches.length ? (
            <div className="empty">Esse jogador ainda não tem partidas finalizadas.</div>
          ) : (
            <>
              <ProfileKpis total={playerStats.total} wins={playerStats.wins} losses={playerStats.losses} pct={playerStats.pct} />
              <PlayerMetricsSection metrics={playerMetrics} />
              <PlayerEvolutionSection evolution={evolution} />

              <section className="player-history-section">
                <div className="section-head compact">
                  <div>
                    <div className="eyebrow">recorte</div>
                    <h2>Período</h2>
                  </div>
                  <span className="rank-sub">{filterLabel} · {filteredMatches.length} partida{filteredMatches.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="player-period-filters">
                  <button className={`player-period-filter ${!selectedMonth && !selectedDay ? "active" : ""}`} type="button" onClick={selectGeneralPeriod}>
                    <span>recorte</span>
                    <strong>Geral</strong>
                  </button>
                  <label className={`player-period-filter ${selectedMonth ? "active" : ""}`}>
                    <span>mês</span>
                    <select value={selectedMonth} onChange={(event) => selectMonthPeriod(event.target.value)}>
                      <option value="">Selecionar</option>
                      {months.map((key) => <option key={key} value={key}>{monthLabel(key)}</option>)}
                    </select>
                  </label>
                  <label className={`player-period-filter ${selectedDay ? "active" : ""}`}>
                    <span>dia jogado</span>
                    <select value={selectedDay} onChange={(event) => selectDayPeriod(event.target.value)}>
                      <option value="">Selecionar</option>
                      {playableDays.map((key) => <option key={key} value={key}>{fmtDay(key)}</option>)}
                    </select>
                  </label>
                </div>
                {!periodConfrontationRows.length ? <div className="empty compact-empty">Nenhum confronto nesse recorte.</div> : selectedPeriodOpponentRow ? (
                  <div className="period-detail-view">
                    <div className="section-head compact">
                      <div>
                        <div className="eyebrow">histórico do recorte</div>
                        <h2>{playerById(selectedPeriodOpponentRow.id)?.name}</h2>
                      </div>
                      <button className="btn ghost small" type="button" onClick={() => setSelectedPeriodOpponent("")}>Voltar</button>
                    </div>
                    <div className="player-h2h-score-list">
                      <PlayerH2HScoreCard
                        label="total do recorte"
                        player={player}
                        opponent={playerById(selectedPeriodOpponentRow.id)}
                        row={selectedPeriodTotalRow}
                        active={selectedPeriodRange === "total"}
                        onClick={() => setSelectedPeriodRange(selectedPeriodRange === "total" ? "" : "total")}
                        highlight
                      />
                      {selectedPeriodDayRows.map((row) => (
                        <PlayerH2HScoreCard
                          key={row.key}
                          label={fmtDay(row.key)}
                          player={player}
                          opponent={playerById(selectedPeriodOpponentRow.id)}
                          row={row}
                          active={selectedPeriodRange === row.key}
                          onClick={() => setSelectedPeriodRange(selectedPeriodRange === row.key ? "" : row.key)}
                        />
                      ))}
                    </div>
                    {selectedPeriodRangeRow && (
                      <div className="player-h2h-detail">
                        <div className="section-head compact">
                          <div>
                            <div className="eyebrow">partidas do placar</div>
                            <h2>{selectedPeriodRange === "total" ? "Total do recorte" : fmtDay(selectedPeriodRangeRow.key)}</h2>
                          </div>
                          <span className="rank-sub">{selectedPeriodRangeRow.matches.length} partida{selectedPeriodRangeRow.matches.length !== 1 ? "s" : ""}</span>
                        </div>
                        <PlayerMatchRows matches={selectedPeriodRangeRow.matches} selectedPlayer={selectedPlayer} playerById={playerById} clips={clips} openMatch={openMatch} />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="period-matchup-list">
                    {(showAllOpponents ? periodConfrontationRows : periodConfrontationRows.slice(0, 3)).map((row) => (
                      <PeriodMatchupRow
                        key={row.id}
                        row={row}
                        player={player}
                        opponent={playerById(row.id)}
                        onDetails={() => setSelectedPeriodOpponent(row.id)}
                      />
                    ))}
                    {periodConfrontationRows.length > 3 && (
                      <button className="btn ghost small period-show-all" type="button" onClick={() => setShowAllOpponents(!showAllOpponents)}>
                        {showAllOpponents ? "Mostrar principais" : `Ver todos os ${periodConfrontationRows.length} confrontos`}
                      </button>
                    )}
                  </div>
                )}
              </section>

            </>
          )}
        </>
      )}
    </section>
  );
}

function ProfileKpis({ total, wins, losses, pct, extra }) {
  return (
    <section className="profile-kpi-grid">
      <div><span>partidas</span><strong>{total}</strong></div>
      <div><span>vitórias</span><strong>{wins}</strong></div>
      <div><span>derrotas</span><strong>{losses}</strong></div>
      <div><span>aproveitamento</span><strong>{pct}%</strong></div>
      {extra}
    </section>
  );
}

function DoublesProfile({ player, playerId, players, finished, clips, playerById, openMatch }) {
  const [partnerFilter, setPartnerFilter] = useState("");
  const [resultFilter, setResultFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const matches = useMemo(() => finished
    .filter((match) => matchMode(match) === "2x2" && matchPlayerIds(match).includes(playerId))
    .sort((a, b) => new Date(b.played_at) - new Date(a.played_at)), [finished, playerId]);
  const partners = useMemo(() => doublesPlayerStats(players, matches, playerId), [matches, playerId, players]);
  const wins = matches.filter((match) => playerWon(match, playerId)).length;
  const losses = matches.length - wins;
  const pct = matches.length ? Math.round((wins / matches.length) * 100) : 0;
  const streaks = doublesWinStreaks(matches, playerId);
  const mostUsed = partners.slice().sort((a, b) => b.total - a.total || b.wins - a.wins)[0];
  const qualifiedPartners = partners.filter((row) => row.total >= 2);
  const bestPartner = (qualifiedPartners.length ? qualifiedPartners : partners).slice().sort((a, b) => b.pct - a.pct || b.total - a.total)[0];
  const months = [...new Set(matches.map((match) => monthKey(`${gameDayKey(match.played_at)}T12:00:00`)))].sort().reverse();
  const opponentTeams = useMemo(() => {
    const rows = {};
    matches.forEach((match) => {
      const ownSide = playerSide(match, playerId);
      const opponentSide = ownSide === "a" ? "b" : "a";
      const ids = matchSides(match)[opponentSide].slice().sort();
      const key = ids.join("|");
      if (!rows[key]) rows[key] = { id: key, ids, total: 0, wins: 0, losses: 0 };
      rows[key].total += 1;
      if (playerWon(match, playerId)) rows[key].wins += 1;
      else rows[key].losses += 1;
    });
    return Object.values(rows).sort((a, b) => b.total - a.total || b.wins - a.wins);
  }, [matches, playerId]);
  const filtered = matches.filter((match) => {
    if (partnerFilter) {
      const ownSide = playerSide(match, playerId);
      if (!matchSides(match)[ownSide].includes(partnerFilter)) return false;
    }
    if (resultFilter && (playerWon(match, playerId) ? "win" : "loss") !== resultFilter) return false;
    if (monthFilter && monthKey(`${gameDayKey(match.played_at)}T12:00:00`) !== monthFilter) return false;
    return true;
  });

  return (
    <div className="doubles-profile">
      <ProfileKpis
        total={matches.length}
        wins={wins}
        losses={losses}
        pct={pct}
        extra={<div><span>parceiros</span><strong>{partners.length}</strong></div>}
      />

      {!matches.length ? <div className="empty">Esse jogador ainda não disputou partidas 2x2.</div> : (
        <>
          <section className="doubles-highlights">
            <article>
              <span>parceria mais frequente</span>
              <strong>{mostUsed?.name}</strong>
              <small>{mostUsed?.total} jogos · {mostUsed?.wins}V–{mostUsed?.losses}D</small>
            </article>
            <article>
              <span>melhor aproveitamento</span>
              <strong>{bestPartner?.name}</strong>
              <small>{bestPartner?.pct}% em {bestPartner?.total} jogos</small>
            </article>
            <article>
              <span>melhor sequência</span>
              <strong>{streaks.best || "-"}</strong>
              <small>vitórias seguidas em duplas</small>
            </article>
          </section>

          <section className="player-history-section">
            <div className="section-head compact">
              <div><div className="eyebrow">entrosamento</div><h2>Minhas parcerias</h2></div>
              <span className="rank-sub">{partners.length} parceiro{partners.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="doubles-partner-grid">
              {partners.map((row) => (
                <button className={partnerFilter === row.id ? "active" : ""} type="button" key={row.id} onClick={() => setPartnerFilter(partnerFilter === row.id ? "" : row.id)}>
                  <PlayerBall player={playerById(row.id)} size={44} />
                  <div><span>com</span><strong>{row.name}</strong><small>{row.total} jogos</small></div>
                  <div><strong>{row.wins}V–{row.losses}D</strong><span>{row.pct}%</span></div>
                </button>
              ))}
            </div>
          </section>

          <section className="player-history-section">
            <div className="section-head compact">
              <div><div className="eyebrow">do outro lado</div><h2>Duplas mais enfrentadas</h2></div>
            </div>
            <div className="opponent-team-list">
              {opponentTeams.slice(0, 5).map((row) => (
                <div key={row.id}>
                  <span>{row.ids.map((id) => playerById(id)?.name).join(" + ")}</span>
                  <strong>{row.wins}V–{row.losses}D</strong>
                  <small>{row.total} jogo{row.total !== 1 ? "s" : ""}</small>
                </div>
              ))}
            </div>
          </section>

          <section className="player-history-section">
            <div className="section-head compact">
              <div><div className="eyebrow">jogo a jogo</div><h2>Histórico 2x2</h2></div>
              <span className="rank-sub">{filtered.length} partida{filtered.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="doubles-history-filters">
              <label><span>parceiro</span><select value={partnerFilter} onChange={(event) => setPartnerFilter(event.target.value)}><option value="">Todos</option>{partners.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
              <label><span>resultado</span><select value={resultFilter} onChange={(event) => setResultFilter(event.target.value)}><option value="">Todos</option><option value="win">Vitórias</option><option value="loss">Derrotas</option></select></label>
              <label><span>mês</span><select value={monthFilter} onChange={(event) => setMonthFilter(event.target.value)}><option value="">Todos</option>{months.map((key) => <option key={key} value={key}>{monthLabel(key)}</option>)}</select></label>
            </div>
            {!filtered.length ? <div className="empty compact-empty">Nenhuma partida corresponde aos filtros.</div> : (
              <div className="doubles-match-list">
                {filtered.map((match) => <DoublesMatchRow key={match.id} match={match} player={player} playerId={playerId} playerById={playerById} clips={clips} openMatch={openMatch} />)}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function doublesWinStreaks(matches, playerId) {
  let current = 0;
  let best = 0;
  matches.slice().reverse().forEach((match) => {
    if (playerWon(match, playerId)) {
      current += 1;
      best = Math.max(best, current);
    } else current = 0;
  });
  return { current, best };
}

function DoublesMatchRow({ match, player, playerId, playerById, clips, openMatch }) {
  const ownSide = playerSide(match, playerId);
  const opponentSide = ownSide === "a" ? "b" : "a";
  const ownIds = matchSides(match)[ownSide];
  const partnerId = ownIds.find((id) => id !== playerId);
  const won = winnerSide(match) === ownSide;
  const clipCount = clips.filter((clip) => clip.match_id === match.id).length;
  return (
    <button type="button" className={`doubles-match-row ${won ? "win" : "loss"}`} onClick={() => openMatch(match.id)}>
      <div className="doubles-match-result"><strong>{won ? "Vitória" : "Derrota"}</strong><span>{fmtPeriod(match.played_at)}</span></div>
      <div className="doubles-match-sides">
        <div><span>sua dupla</span><strong>{player?.name} + {playerById(partnerId)?.name}</strong></div>
        <em>VS</em>
        <div><span>adversários</span><strong>{sideLabel(match, opponentSide, (id) => playerById(id)?.name)}</strong></div>
      </div>
      <div className="doubles-match-meta">
        <span>{match.breaker_id === playerId ? "Você quebrou" : `${playerById(match.breaker_id)?.name || "Jogador"} quebrou`}</span>
        {(match.ball_log || []).length > 0 && <span>{match.ball_log.length} bolas</span>}
        {clipCount > 0 && <span>{clipCount} clipe{clipCount !== 1 ? "s" : ""}</span>}
      </div>
      <b>Ver detalhes →</b>
    </button>
  );
}

function summarizeH2H(key, matches, selectedPlayer) {
  const wins = matches.filter((match) => match.winner_id === selectedPlayer).length;
  return {
    key,
    matches,
    total: matches.length,
    wins,
    losses: matches.length - wins,
  };
}

function summarizeH2HByDay(matches, selectedPlayer) {
  const byDay = {};
  matches.forEach((match) => {
    const key = gameDayKey(match.played_at);
    if (!byDay[key]) byDay[key] = [];
    byDay[key].push(match);
  });
  return Object.entries(byDay)
    .map(([key, dayMatches]) => summarizeH2H(key, dayMatches, selectedPlayer))
    .sort((a, b) => b.key.localeCompare(a.key));
}

function buildPlayerEvolution({ allMatches, playerId, players }) {
  const playerDayKeys = [...new Set(
    allMatches
      .filter((match) => match.player_a === playerId || match.player_b === playerId)
      .map((match) => gameDayKey(match.played_at)),
  )].sort().slice(-10);

  const byDay = {};
  allMatches.forEach((match) => {
    const key = gameDayKey(match.played_at);
    if (!byDay[key]) byDay[key] = [];
    byDay[key].push(match);
  });

  const dayWins = playerDayKeys.map((key) => {
    const matches = byDay[key] || [];
    const activePlayers = new Set(matches.flatMap((match) => [match.player_a, match.player_b]));
    return {
      key,
      label: shortDayLabel(key),
      player: matches.filter((match) => match.winner_id === playerId).length,
      average: activePlayers.size ? Number((matches.length / activePlayers.size).toFixed(2)) : 0,
    };
  });

  const cumulativePct = playerDayKeys.map((key) => {
    const matchesUntilDay = allMatches.filter((match) => gameDayKey(match.played_at) <= key);
    const playerMatchesUntilDay = matchesUntilDay.filter((match) => match.player_a === playerId || match.player_b === playerId);
    const playerWins = playerMatchesUntilDay.filter((match) => match.winner_id === playerId).length;
    const playerPct = playerMatchesUntilDay.length ? Math.round((playerWins / playerMatchesUntilDay.length) * 100) : 0;
    const playerPcts = players
      .map((player) => {
        const ownMatches = matchesUntilDay.filter((match) => match.player_a === player.id || match.player_b === player.id);
        if (!ownMatches.length) return null;
        const wins = ownMatches.filter((match) => match.winner_id === player.id).length;
        return (wins / ownMatches.length) * 100;
      })
      .filter((value) => value != null);
    const averagePct = playerPcts.length ? Math.round(playerPcts.reduce((sum, value) => sum + value, 0) / playerPcts.length) : 0;
    return { key, label: shortDayLabel(key), player: playerPct, average: averagePct };
  });

  return { dayWins, cumulativePct };
}

function shortDayLabel(key) {
  return new Date(`${key}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function PlayerMetricsSection({ metrics }) {
  return (
    <details className="player-metrics-section">
      <summary>
        <span>
          <strong>Dados do jogador</strong>
          <em>Resumo de presença, médias, sequências e principais marcas desse perfil.</em>
        </span>
      </summary>
      <div className="player-metrics-list">
        {metrics.map((metric) => (
          <article className="player-metric-row" key={metric.label}>
            <div className="player-metric-copy">
              <strong>{metric.label}</strong>
              <span>{metric.desc}</span>
            </div>
            <div className="player-metric-value">
              <b className="stat-num">{metric.value}</b>
              <span>{metric.holder}</span>
            </div>
          </article>
        ))}
      </div>
    </details>
  );
}

function PlayerEvolutionSection({ evolution }) {
  return (
    <details className="player-evolution-section">
      <summary>
        <span>
          <strong>Evolução</strong>
          <em>Gráficos dos últimos 10 dias de jogatina comparando seu desempenho com a média da galera.</em>
        </span>
      </summary>
      <div className="player-evolution-grid">
        <LineChartCard
          title="Vitórias por dia"
          subtitle="Sua quantidade de vitórias por dia contra a média de vitórias por jogador no mesmo dia."
          data={evolution.dayWins}
          valueSuffix=""
          emptyText="Sem dias suficientes para mostrar vitórias."
          playerLabel="Você"
          averageLabel="Média"
        />
        <LineChartCard
          title="Aproveitamento"
          subtitle="Sua porcentagem acumulada contra a média acumulada dos jogadores."
          data={evolution.cumulativePct}
          valueSuffix="%"
          maxValue={100}
          emptyText="Sem dias suficientes para mostrar aproveitamento."
          playerLabel="Você"
          averageLabel="Média"
        />
      </div>
    </details>
  );
}

function LineChartCard({ title, subtitle, data, valueSuffix, maxValue, emptyText, playerLabel, averageLabel }) {
  const hasData = data.length > 0;
  const width = 320;
  const height = 170;
  const pad = { top: 18, right: 18, bottom: 32, left: 34 };
  const values = data.flatMap((point) => [point.player, point.average]);
  const topValue = Math.max(maxValue || 0, ...values, 1);
  const yMax = maxValue || Math.ceil(topValue);
  const xFor = (index) => data.length <= 1
    ? pad.left + ((width - pad.left - pad.right) / 2)
    : pad.left + (index * (width - pad.left - pad.right)) / (data.length - 1);
  const yFor = (value) => height - pad.bottom - (Number(value || 0) / yMax) * (height - pad.top - pad.bottom);
  const pathFor = (field) => data.map((point, index) => `${index === 0 ? "M" : "L"}${xFor(index).toFixed(1)} ${yFor(point[field]).toFixed(1)}`).join(" ");
  const last = data[data.length - 1];

  return (
    <article className="evolution-chart-card">
      <div className="evolution-chart-head">
        <div>
          <strong>{title}</strong>
          <span>{subtitle}</span>
        </div>
        {last && (
          <div className="evolution-latest">
            <b>{last.player}{valueSuffix}</b>
            <span>último dia</span>
          </div>
        )}
      </div>
      {!hasData ? <div className="empty compact-empty">{emptyText}</div> : (
        <>
          <svg className="evolution-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
            <line className="chart-grid-line" x1={pad.left} y1={pad.top} x2={pad.left} y2={height - pad.bottom} />
            <line className="chart-grid-line" x1={pad.left} y1={height - pad.bottom} x2={width - pad.right} y2={height - pad.bottom} />
            <text className="chart-axis-label" x={pad.left - 6} y={pad.top + 4} textAnchor="end">{yMax}{valueSuffix}</text>
            <text className="chart-axis-label" x={pad.left - 6} y={height - pad.bottom + 4} textAnchor="end">0</text>
            <path className="chart-line average" d={pathFor("average")} />
            <path className="chart-line player" d={pathFor("player")} />
            {data.map((point, index) => (
              <g
                className="chart-point-group"
                key={point.key}
                tabIndex="0"
                aria-label={`${point.label}: ${playerLabel} ${point.player}${valueSuffix}, ${averageLabel} ${point.average}${valueSuffix}`}
              >
                <title>{`${point.label} · ${playerLabel}: ${point.player}${valueSuffix} · ${averageLabel}: ${point.average}${valueSuffix}`}</title>
                <line className="chart-hover-line" x1={xFor(index)} y1={pad.top} x2={xFor(index)} y2={height - pad.bottom} />
                <rect
                  className="chart-tooltip-bg"
                  x={Math.min(Math.max(xFor(index) - 54, pad.left), width - pad.right - 108)}
                  y={pad.top}
                  width="108"
                  height="38"
                  rx="8"
                />
                <text
                  className="chart-tooltip-title"
                  x={Math.min(Math.max(xFor(index), pad.left + 54), width - pad.right - 54)}
                  y={pad.top + 15}
                  textAnchor="middle"
                >
                  {point.label}
                </text>
                <text
                  className="chart-tooltip-text"
                  x={Math.min(Math.max(xFor(index), pad.left + 54), width - pad.right - 54)}
                  y={pad.top + 30}
                  textAnchor="middle"
                >
                  {`${playerLabel} ${point.player}${valueSuffix} · ${averageLabel} ${point.average}${valueSuffix}`}
                </text>
                <circle className="chart-dot average" cx={xFor(index)} cy={yFor(point.average)} r="3" />
                <circle className="chart-dot player" cx={xFor(index)} cy={yFor(point.player)} r="3.6" />
                <circle className="chart-hit-area" cx={xFor(index)} cy={yFor(point.player)} r="14" />
              </g>
            ))}
            {data.map((point, index) => (
              (index === 0 || index === data.length - 1) && (
                <text key={`label-${point.key}`} className="chart-axis-label" x={xFor(index)} y={height - 10} textAnchor={index === 0 ? "start" : "end"}>{point.label}</text>
              )
            ))}
          </svg>
          <div className="chart-legend">
            <span className="player">{playerLabel}</span>
            <span className="average">{averageLabel}</span>
          </div>
        </>
      )}
    </article>
  );
}

function PeriodMatchupRow({ row, player, opponent, onDetails }) {
  const opponentPct = 100 - row.pct;
  const recentMatches = row.matches.slice(0, 5);
  return (
    <article className="period-matchup-row">
      <div className="period-matchup-player">
        <PlayerBall player={opponent} size={48} />
        <div>
          <strong>{opponent?.name}</strong>
          <div className="period-matchup-recent">
            <span>Últimas 5 partidas</span>
            <div aria-label="Últimas 5 partidas">
              {recentMatches.map((match) => (
                <i
                  key={match.id}
                  className={match.winner_id === player?.id ? "win" : "loss"}
                  title={match.winner_id === player?.id ? "Você ganhou" : `${opponent?.name || "Adversário"} ganhou`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="period-matchup-score">
        <div>
          <span>você ganhou</span>
          <strong>{row.wins}</strong>
        </div>
        <em>x</em>
        <div className="loss">
          <span>ele ganhou</span>
          <strong>{row.losses}</strong>
        </div>
        <small>{row.total} partida{row.total !== 1 ? "s" : ""} contra você</small>
      </div>
      <div className="period-matchup-pct">
        <span>seu aproveitamento</span>
        <strong>{row.pct}%</strong>
        <div className="period-pct-bar">
          <i style={{ width: `${row.pct}%` }} />
          <b style={{ width: `${opponentPct}%` }} />
        </div>
        <div className="period-pct-labels">
          <small>Você {row.pct}%</small>
          <small>{opponentPct}% {opponent?.name}</small>
        </div>
      </div>
      <button className="period-details-btn" type="button" onClick={onDetails}>Ver detalhes</button>
    </article>
  );
}

function PlayerH2HScoreCard({ label, player, opponent, row, active = false, highlight = false, onClick }) {
  if (!row) return null;
  const leader = row.wins === row.losses ? "Confronto empatado" : row.wins > row.losses ? `${player?.name} na frente` : `${opponent?.name} na frente`;
  return (
    <button className={`player-h2h-score-card ${active ? "active" : ""} ${highlight ? "highlight" : ""}`} type="button" onClick={onClick}>
      <div className="player-h2h-score-top">
        <span>{label}</span>
        <em>{row.total} jogo{row.total !== 1 ? "s" : ""}</em>
      </div>
      <div className="player-h2h-score-body">
        <div className="player-h2h-score-side">
          <PlayerBall player={player} size={40} />
          <strong>{player?.name}</strong>
        </div>
        <div className="player-h2h-score-board stat-num">
          <b>{row.wins}</b>
          <span>x</span>
          <b>{row.losses}</b>
        </div>
        <div className="player-h2h-score-side right">
          <strong>{opponent?.name}</strong>
          <PlayerBall player={opponent} size={40} />
        </div>
      </div>
      <div className="player-h2h-score-leader">{leader}</div>
    </button>
  );
}

function PlayerMatchRows({ matches, selectedPlayer, playerById, clips, openMatch }) {
  return (
    <div className="player-history-list">
      {matches.map((match) => {
        const opponent = playerById(match.player_a === selectedPlayer ? match.player_b : match.player_a);
        const won = match.winner_id === selectedPlayer;
        const clipCount = clips.filter((clip) => clip.match_id === match.id).length;
        return (
          <button className="player-history-row" key={match.id} onClick={() => openMatch(match.id)}>
            <span className="dtag">{fmtPeriod(match.played_at)}</span>
            <PlayerBall player={opponent} size={30} />
            <strong>vs {opponent?.name}</strong>
            {clipCount > 0 && <span className="clip-badge">{clipCount} clipe{clipCount !== 1 ? "s" : ""}</span>}
            <b className={won ? "gold-text" : "clay-text"}>{won ? "Vitória" : "Derrota"}</b>
          </button>
        );
      })}
    </div>
  );
}
