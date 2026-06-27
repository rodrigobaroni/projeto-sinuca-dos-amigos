import { useEffect, useMemo, useState } from "react";
import { PlayerBall } from "../components/balls.jsx";
import { ViewHead } from "../components/layout.jsx";
import { Record, RecordSection } from "../components/recordCards.jsx";
import { fmtPeriod, gameDayKey, monthKey, monthLabel } from "../utils/date.js";

export function PlayerView({ players, finished, stats, clips = [], playerById, openMatch }) {
  const firstActive = useMemo(() => players.find((player) => stats[player.id]?.total > 0)?.id || players[0]?.id || "", [players, stats]);
  const [selectedPlayer, setSelectedPlayer] = useState(firstActive);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedPeriodOpponent, setSelectedPeriodOpponent] = useState("");
  const [opponentFilter, setOpponentFilter] = useState("");
  const [selectedH2HRange, setSelectedH2HRange] = useState("");

  useEffect(() => {
    if (!selectedPlayer || !players.some((player) => player.id === selectedPlayer)) setSelectedPlayer(firstActive);
  }, [firstActive, players, selectedPlayer]);

  useEffect(() => {
    setSelectedMonth("");
    setSelectedDay("");
    setSelectedPeriodOpponent("");
    setOpponentFilter("");
    setSelectedH2HRange("");
  }, [selectedPlayer]);

  useEffect(() => {
    setSelectedPeriodOpponent("");
  }, [selectedMonth, selectedDay]);

  const player = playerById(selectedPlayer);
  const playerStats = stats[selectedPlayer] || { wins: 0, losses: 0, total: 0, pct: 0, bestStreak: 0 };
  const playerMatches = useMemo(
    () => finished.filter((match) => match.player_a === selectedPlayer || match.player_b === selectedPlayer),
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

  useEffect(() => {
    setSelectedH2HRange("");
  }, [opponentFilter]);

  const opponentOptions = useMemo(
    () => opponentRows.slice().sort((a, b) => playerById(a.id)?.name?.localeCompare(playerById(b.id)?.name || "") || 0),
    [opponentRows, playerById],
  );
  const opponentFilteredMatches = useMemo(() => (
    opponentFilter
      ? playerMatchesDesc.filter((match) => match.player_a === opponentFilter || match.player_b === opponentFilter)
      : []
  ), [playerMatchesDesc, opponentFilter]);
  const opponentTotalRow = useMemo(() => {
    if (!opponentFilter) return null;
    return summarizeH2H("histórico total", opponentFilteredMatches, selectedPlayer);
  }, [opponentFilteredMatches, opponentFilter, selectedPlayer]);
  const opponentDayRows = useMemo(() => {
    if (!opponentFilter) return [];
    const byDay = {};
    opponentFilteredMatches.forEach((match) => {
      const key = gameDayKey(match.played_at);
      if (!byDay[key]) byDay[key] = [];
      byDay[key].push(match);
    });
    return Object.entries(byDay)
      .map(([key, matches]) => summarizeH2H(key, matches, selectedPlayer))
      .sort((a, b) => b.key.localeCompare(a.key));
  }, [opponentFilteredMatches, opponentFilter, selectedPlayer]);
  const selectedH2HRow = selectedH2HRange === "total"
    ? opponentTotalRow
    : opponentDayRows.find((row) => row.key === selectedH2HRange);
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

  return (
    <section className="player-page">
      <ViewHead eyebrow="raio-x individual" title="Jogador" />
      {!players.length ? (
        <div className="empty">Cadastre jogadores para ver o raio-x individual.</div>
      ) : (
        <>
          <div className="player-carousel" aria-label="Selecionar jogador">
            {players.map((item) => {
              const active = item.id === selectedPlayer;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`player-chip ${active ? "active" : ""}`}
                  onClick={() => setSelectedPlayer(item.id)}
                  aria-pressed={active}
                >
                  <PlayerBall player={item} size={28} />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </div>

          <section className="player-hero">
            <PlayerBall player={player} size={70} />
            <div className="player-hero-main">
              <div className="eyebrow">perfil</div>
              <h2>{player?.name || "Jogador"}</h2>
              <div className="player-hero-stats">
                <span><strong>{playerStats.total}</strong> partidas</span>
                <span><strong>{playerStats.wins}</strong> vitórias</span>
                <span><strong>{playerStats.losses}</strong> derrotas</span>
                <span><strong>{playerStats.pct}%</strong> aproveitamento</span>
              </div>
            </div>
          </section>

          {!playerMatches.length ? (
            <div className="empty">Esse jogador ainda não tem partidas finalizadas.</div>
          ) : (
            <>
              <RecordSection title="dados do jogador">
                <Record label="presença" desc="Quantidade de dias que apareceu para jogar." value={presence} holder="dias de jogo" />
                <Record label="partidas jogadas" desc="Total de partidas finalizadas." value={playerStats.total} holder={player?.name} />
                <Record label="média por dia" desc="Partidas por dia em que jogou." value={avg(playerStats.total)} holder="partidas/dia" />
                <Record label="média de vitórias" desc="Vitórias por dia em que jogou." value={avg(playerStats.wins)} holder="vitórias/dia" />
                <Record label="média de derrotas" desc="Derrotas por dia em que jogou." value={avg(playerStats.losses)} holder="derrotas/dia" />
                <Record label="dia com mais vitória" desc="Melhor dia em número de vitórias." value={mostWinsDay?.wins ?? "-"} holder={fmtDay(mostWinsDay?.key)} />
                <Record label="dia com menos vitória" desc="Menor quantidade de vitórias em dia jogado." value={leastWinsDay?.wins ?? "-"} holder={fmtDay(leastWinsDay?.key)} />
                <Record label="dia com mais derrota" desc="Dia com mais derrotas acumuladas." value={mostLossesDay?.losses ?? "-"} holder={fmtDay(mostLossesDay?.key)} />
                <Record label="dia com menos derrota" desc="Menor quantidade de derrotas em dia jogado." value={leastLossesDay?.losses ?? "-"} holder={fmtDay(leastLossesDay?.key)} />
                <Record label="maior sequência" desc="Vitórias seguidas no histórico." value={playerStats.bestStreak || "-"} holder="vitórias seguidas" />
                <Record label="mais perdeu para ele" desc="Adversário que mais perdeu para o jogador." value={mostLostToPlayer?.wins || "-"} holder={playerById(mostLostToPlayer?.id)?.name || "sem registro"} />
                <Record label="mais ganhou dele" desc="Adversário que mais venceu o jogador." value={mostBeatPlayer?.losses || "-"} holder={playerById(mostBeatPlayer?.id)?.name || "sem registro"} />
                <Record label="mais enfrentou" desc="Adversário com mais partidas contra." value={mostPlayedAgainst?.total || "-"} holder={playerById(mostPlayedAgainst?.id)?.name || "sem registro"} />
              </RecordSection>

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
                {!periodConfrontationRows.length ? <div className="empty compact-empty">Nenhum confronto nesse recorte.</div> : (
                  <>
                    <div className="player-h2h-list period-h2h-list">
                      {periodConfrontationRows.map((row) => {
                        const opponent = playerById(row.id);
                        const active = selectedPeriodOpponent === row.id;
                        return (
                          <button
                            className={`player-h2h-card ${active ? "active" : ""}`}
                            key={row.id}
                            type="button"
                            onClick={() => setSelectedPeriodOpponent(active ? "" : row.id)}
                          >
                            <PlayerBall player={opponent} size={42} />
                            <div className="player-h2h-main">
                              <strong>{opponent?.name}</strong>
                              <span>{row.total} partida{row.total !== 1 ? "s" : ""} no recorte</span>
                            </div>
                            <div className="player-h2h-score stat-num">
                              <span><b>{row.wins}</b>V</span>
                              <em>x</em>
                              <span><b>{row.losses}</b>D</span>
                              <strong>{row.pct}%</strong>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {selectedPeriodOpponentRow && (
                      <div className="player-h2h-detail">
                        <div className="section-head compact">
                          <div>
                            <div className="eyebrow">partidas do recorte</div>
                            <h2>{playerById(selectedPeriodOpponentRow.id)?.name}</h2>
                          </div>
                          <span className="rank-sub">{selectedPeriodOpponentRow.matches.length} partida{selectedPeriodOpponentRow.matches.length !== 1 ? "s" : ""}</span>
                        </div>
                        <PlayerMatchRows matches={selectedPeriodOpponentRow.matches} selectedPlayer={selectedPlayer} playerById={playerById} clips={clips} openMatch={openMatch} />
                      </div>
                    )}
                  </>
                )}
              </section>

              <section className="player-history-section">
                <div className="section-head compact">
                  <div>
                    <div className="eyebrow">confronto direto</div>
                    <h2>Adversário</h2>
                  </div>
                  <span className="rank-sub">{opponentFilter ? playerById(opponentFilter)?.name : "Selecione um adversário"}</span>
                </div>
                <div className="player-carousel opponent-carousel" aria-label="Selecionar adversário">
                  {opponentOptions.map((row) => {
                    const opponent = playerById(row.id);
                    const active = row.id === opponentFilter;
                    return (
                      <button
                        key={row.id}
                        type="button"
                        className={`player-chip ${active ? "active" : ""}`}
                        onClick={() => setOpponentFilter(active ? "" : row.id)}
                        aria-pressed={active}
                      >
                        <PlayerBall player={opponent} size={28} />
                        <span>{opponent?.name}</span>
                      </button>
                    );
                  })}
                </div>
                {!opponentOptions.length ? <div className="empty compact-empty">Esse jogador ainda não tem adversários no histórico.</div> : opponentFilter ? (
                  !opponentFilteredMatches.length ? <div className="empty compact-empty">Nenhuma partida contra esse adversário.</div> : (
                  <>
                    <div className="player-h2h-score-list">
                      <PlayerH2HScoreCard
                        label="histórico total"
                        player={player}
                        opponent={playerById(opponentFilter)}
                        row={opponentTotalRow}
                        active={selectedH2HRange === "total"}
                        onClick={() => setSelectedH2HRange(selectedH2HRange === "total" ? "" : "total")}
                        highlight
                      />
                      {opponentDayRows.map((row) => (
                        <PlayerH2HScoreCard
                          key={row.key}
                          label={fmtDay(row.key)}
                          player={player}
                          opponent={playerById(opponentFilter)}
                          row={row}
                          active={selectedH2HRange === row.key}
                          onClick={() => setSelectedH2HRange(selectedH2HRange === row.key ? "" : row.key)}
                        />
                      ))}
                    </div>

                    {selectedH2HRow && (
                      <div className="player-h2h-detail">
                        <div className="section-head compact">
                          <div>
                            <div className="eyebrow">partidas do placar</div>
                            <h2>{selectedH2HRange === "total" ? "Histórico total" : fmtDay(selectedH2HRow.key)}</h2>
                          </div>
                          <span className="rank-sub">{selectedH2HRow.matches.length} partida{selectedH2HRow.matches.length !== 1 ? "s" : ""}</span>
                        </div>
                        <PlayerMatchRows matches={selectedH2HRow.matches} selectedPlayer={selectedPlayer} playerById={playerById} clips={clips} openMatch={openMatch} />
                      </div>
                    )}
                  </>
                  )
                ) : <div className="empty compact-empty">Selecione um adversário para ver o placar geral e os dias jogados.</div>}
              </section>
            </>
          )}
        </>
      )}
    </section>
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
