import { useState } from "react";
import { PlayerBall } from "./balls.jsx";
import { matchPlayerIds } from "../domain/match.js";

// Bloco da fila no painel: cabecalho com o dono de cada mesa ativa, a lista
// de quem esta esperando (ja com a mesa sugerida calculada em queue.entries)
// e a folha "quem chegou". Fica num .card comum porque ja mora dentro do
// .panel do AdminView, ao lado do StartMatchPanel.
//
// Presenca nao e auditada (nem aqui, nem na folha): dezenas de eventos por
// noite afogariam a aba Logs, e a fila ja esta visivel na tela pra quem
// precisa saber quem chegou.
export function QueuePanel({ queue, liveMatches, players, playerById, showToast }) {
  const [showArrivalSheet, setShowArrivalSheet] = useState(false);
  const { activeTables, holders, entries, available, markDeparture } = queue;

  const handleDeparture = async (playerId) => {
    try {
      await markDeparture(playerId);
    } catch (error) {
      showToast(`Erro: ${error.message}`);
    }
  };

  return (
    <div className="card queue-panel">
      {activeTables.length > 0 && (
        <div className="queue-tables-head">
          {activeTables.map((table) => {
            const live = liveMatches.some((match) => match.table_id === table.id);
            const holderNames = (holders[table.id] || []).map((id) => playerById(id)?.name).filter(Boolean).join(" e ");
            const status = live ? "em jogo" : holderNames ? `${holderNames} segurando` : "livre";
            return (
              <div className={`queue-table-chip ${live ? "live" : ""} ${holderNames ? "held" : ""}`} key={table.id}>
                <span className="queue-table-dot" />
                <strong>{table.name}</strong>
                <span>{status}</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="queue-head-row">
        <div className="record-section-title">fila da noite · {entries.length} esperando</div>
        <button type="button" className="btn ghost small" onClick={() => setShowArrivalSheet(true)}>Quem chegou</button>
      </div>

      {available === false ? (
        <div className="empty small-empty">Fila indisponível — a migração 20260915 ainda não rodou neste banco.</div>
      ) : entries.length ? (
        <div className="queue-list">
          {entries.map((entry, index) => {
            const player = playerById(entry.player_id);
            return (
              <div className="queue-row" key={entry.id}>
                <span className="queue-position">{index + 1}</span>
                <PlayerBall player={player} size={30} />
                <strong className="queue-row-name">{player?.name || "?"}</strong>
                {entry.label && <span className="queue-table-label">{entry.label}</span>}
                <button
                  type="button"
                  className="queue-remove"
                  aria-label={`${player?.name || "jogador"} foi embora`}
                  onClick={() => handleDeparture(entry.player_id)}
                >
                  ⨯
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty small-empty">Ninguém esperando. Marque quem chegou pra começar a fila.</div>
      )}

      {showArrivalSheet && (
        <ArrivalSheet
          players={players}
          queue={queue}
          liveMatches={liveMatches}
          showToast={showToast}
          onClose={() => setShowArrivalSheet(false)}
        />
      )}
    </div>
  );
}

// Overlay local, nao o PlayerPickerModal: aquele fecha no primeiro toque (e
// no clique fora), e aqui o admin precisa marcar varias pessoas em sequencia.
// Reaproveita .identity-alert-bg / .identity-alert / .identity-grid do
// mesmo jeito, so que sem o onClose no fundo.
function ArrivalSheet({ players, queue, liveMatches, showToast, onClose }) {
  const { attendance, gameDay, holders, entries, markArrived } = queue;
  const queueIds = new Set(entries.map((entry) => entry.player_id));
  const holderIds = new Set(Object.values(holders || {}).flat());
  const busyIds = new Set(liveMatches.flatMap((match) => matchPlayerIds(match)));

  const stateFor = (playerId) => {
    if (busyIds.has(playerId)) return "jogando";
    if (holderIds.has(playerId)) return "na mesa";
    const row = attendance.find((item) => item.player_id === playerId && item.game_day === gameDay);
    if (row?.left_at) return "foi embora";
    if (queueIds.has(playerId)) return "na fila";
    return "";
  };

  const handleArrival = async (playerId) => {
    try {
      await markArrived(playerId);
    } catch (error) {
      showToast(`Erro: ${error.message}`);
    }
  };

  return (
    <div className="identity-alert-bg">
      <section className="identity-alert" role="alertdialog" aria-modal="true" aria-labelledby="arrival-sheet-title">
        <div className="eyebrow">fila</div>
        <div id="arrival-sheet-title" className="confirm-title">Quem chegou?</div>
        <p>Toque pra marcar presença. Quem foi embora e voltou também entra por aqui.</p>
        <div className="identity-grid" aria-label="Quem chegou">
          {players.map((player) => {
            const state = stateFor(player.id);
            return (
              <button
                key={player.id}
                type="button"
                className="identity-player"
                onClick={() => handleArrival(player.id)}
              >
                <PlayerBall player={player} size={40} />
                <span>
                  <strong>{player.name}</strong>
                  {state && <em>{state}</em>}
                </span>
              </button>
            );
          })}
        </div>
        <button type="button" className="btn chalk" style={{ marginTop: 14 }} onClick={onClose}>Concluir</button>
      </section>
    </div>
  );
}
