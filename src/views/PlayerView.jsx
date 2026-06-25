import { useEffect, useMemo, useState } from "react";
import { PlayerBall } from "../components/balls.jsx";
import { ViewHead } from "../components/layout.jsx";
import { Record, RecordSection } from "../components/recordCards.jsx";
import { fmtPeriod, gameDayKey, monthKey, monthLabel } from "../utils/date.js";

export function PlayerView({ players, finished, stats, playerById, openMatch }) {
  const firstActive = useMemo(() => players.find((player) => stats[player.id]?.total > 0)?.id || players[0]?.id || "", [players, stats]);
  const [selectedPlayer, setSelectedPlayer] = useState(firstActive);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedDay, setSelectedDay] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!selectedPlayer || !players.some((player) => player.id === selectedPlayer)) setSelectedPlayer(firstActive);
  }, [firstActive, players, selectedPlayer]);

  useEffect(() => {
    setSelectedMonth("");
    setSelectedDay("");
    setPage(1);
  }, [selectedPlayer]);

  useEffect(() => {
    setSelectedDay("");
    setPage(1);
  }, [selectedMonth]);

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
  const playableDays = useMemo(() => {
    const matches = selectedMonth ? playerMatches.filter((match) => gameDayMonth(match) === selectedMonth) : playerMatches;
    return [...new Set(matches.map((match) => gameDayKey(match.played_at)))].sort().reverse();
  }, [playerMatches, selectedMonth]);

  const filteredMatches = useMemo(() => playerMatchesDesc.filter((match) => {
    if (selectedMonth && gameDayMonth(match) !== selectedMonth) return false;
    if (selectedDay && gameDayKey(match.played_at) !== selectedDay) return false;
    return true;
  }), [playerMatchesDesc, selectedMonth, selectedDay]);

  useEffect(() => {
    setPage(1);
  }, [selectedDay, selectedMonth]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredMatches.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedMatches = filteredMatches.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const fmtDay = (key) => key ? new Date(`${key}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "-";
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
          <label className="fld player-selector"><span>jogador</span><select className="select" value={selectedPlayer} onChange={(event) => setSelectedPlayer(event.target.value)}>{players.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>

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
                    <div className="eyebrow">histórico completo</div>
                    <h2>Partidas</h2>
                  </div>
                  <span className="rank-sub">{filteredMatches.length} partida{filteredMatches.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="player-history-filters">
                  <label className="fld"><span>mês</span><select className="select" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)}><option value="">Todos</option>{months.map((key) => <option key={key} value={key}>{monthLabel(key)}</option>)}</select></label>
                  <label className="fld"><span>dia jogado</span><select className="select" value={selectedDay} onChange={(event) => setSelectedDay(event.target.value)}><option value="">Todos</option>{playableDays.map((key) => <option key={key} value={key}>{fmtDay(key)}</option>)}</select></label>
                </div>
                {!pagedMatches.length ? <div className="empty compact-empty">Nenhuma partida nesse filtro.</div> : (
                  <div className="player-history-list">
                    {pagedMatches.map((match) => {
                      const opponent = playerById(match.player_a === selectedPlayer ? match.player_b : match.player_a);
                      const won = match.winner_id === selectedPlayer;
                      return (
                        <button className="player-history-row" key={match.id} onClick={() => openMatch(match.id)}>
                          <span className="dtag">{fmtPeriod(match.played_at)}</span>
                          <PlayerBall player={opponent} size={30} />
                          <strong>vs {opponent?.name}</strong>
                          <b className={won ? "gold-text" : "clay-text"}>{won ? "Vitória" : "Derrota"}</b>
                        </button>
                      );
                    })}
                  </div>
                )}
                <div className="pagination">
                  <button className="btn ghost small" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Anterior</button>
                  <span>{currentPage} / {totalPages}</span>
                  <button className="btn ghost small" disabled={currentPage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Próxima</button>
                </div>
              </section>
            </>
          )}
        </>
      )}
    </section>
  );
}
