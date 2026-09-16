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
export function QueuePanel({ queue, liveMatches, players, playerById, showToast, showTables = true }) {
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
      {showTables && activeTables.length > 0 && (
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
  const { attendance, gameDay, holders, entries, markArrived, markDeparture } = queue;
  const queueIds = new Set(entries.map((entry) => entry.player_id));
  const holderIds = new Set(Object.values(holders || {}).flat());
  const busyIds = new Set(liveMatches.flatMap((match) => matchPlayerIds(match)));

  const rowFor = (playerId) => attendance.find((item) => item.player_id === playerId && item.game_day === gameDay);

  const stateFor = (playerId) => {
    if (busyIds.has(playerId)) return "jogando";
    if (holderIds.has(playerId)) return "na mesa";
    if (rowFor(playerId)?.left_at) return "foi embora";
    if (queueIds.has(playerId)) return "na fila";
    return "";
  };

  // Quem da pra marcar como tendo ido embora: quem esta na jogatina agora.
  // A saida e um controle SEPARADO do toque de chegada, nao um botao que
  // muda de sentido conforme o estado - um botao contextual reabriria o
  // risco de toque acidental que a trava de chegada resolveu.
  const canMarkDeparture = (state, left) => !left && ["na fila", "na mesa", "jogando"].includes(state);

  // markArrived recarimba enqueued_at e manda a pessoa pro fim da fila - certo
  // pra quem nunca chegou ou foi embora e voltou, mas um toque acidental em
  // quem ja esta "na fila", "jogando" ou "na mesa" perderia a posicao dela
  // sem aviso nem desfazer. So esses dois estados podem disparar o toque.
  const canMarkArrival = (state) => state === "" || state === "foi embora";

  // Trava local por jogador: enquanto o id esta em pendingIds, o toque e
  // no-op. `state` e um snapshot do render - sem isso, dois toques rapidos
  // no mesmo nome, antes da resposta HTTP do primeiro voltar, disparam dois
  // upserts, e o segundo recarimba enqueued_at de novo, mandando a pessoa pro
  // fim da fila outra vez. Nao resolve dois admins em aparelhos diferentes
  // tocando ao mesmo tempo - isso continua sendo o AUD-06 de sempre.
  // A trava vale para as DUAS acoes, por jogador: enquanto uma esta em voo,
  // nem ela nem a outra disparam de novo no mesmo nome.
  const [pendingIds, setPendingIds] = useState(() => new Set());

  const comTrava = async (playerId, acao) => {
    if (pendingIds.has(playerId)) return;
    setPendingIds((current) => new Set(current).add(playerId));
    try {
      await acao();
    } catch (error) {
      showToast(`Erro: ${error.message}`);
    } finally {
      setPendingIds((current) => {
        const next = new Set(current);
        next.delete(playerId);
        return next;
      });
    }
  };

  const handleArrival = async (playerId, state) => {
    if (!canMarkArrival(state)) return;
    await comTrava(playerId, () => markArrived(playerId));
  };

  const handleDeparture = async (playerId, state, left) => {
    if (!canMarkDeparture(state, left)) return;
    await comTrava(playerId, () => markDeparture(playerId));
  };

  return (
    <div className="identity-alert-bg">
      <section className="identity-alert" role="alertdialog" aria-modal="true" aria-labelledby="arrival-sheet-title">
        <div className="eyebrow">fila</div>
        <div id="arrival-sheet-title" className="confirm-title">Quem chegou?</div>
        <p>Toque no nome pra marcar chegada. O ⨯ marca saída.</p>
        <div className="identity-grid" aria-label="Quem chegou">
          {players.map((player) => {
            const state = stateFor(player.id);
            const left = Boolean(rowFor(player.id)?.left_at);
            const pending = pendingIds.has(player.id);
            const disabled = !canMarkArrival(state) || pending;
            const leaveDisabled = !canMarkDeparture(state, left) || pending;
            // Botoes irmaos, nunca aninhados: o ⨯ nao pode borbulhar pro
            // toque de chegada (mesmo motivo do ADENDO D1 no card ao vivo).
            return (
              <div key={player.id} className="identity-player-row">
                <button
                  type="button"
                  className={`identity-player ${disabled ? "disabled" : ""}`}
                  disabled={disabled}
                  aria-disabled={disabled}
                  onClick={() => handleArrival(player.id, state)}
                >
                  <PlayerBall player={player} size={40} />
                  <span>
                    <strong>{player.name}</strong>
                    {/* Quem esta jogando e ja foi marcado continua "jogando"
                        - e verdade, a partida nao acabou - mas sem o aviso o
                        admin nao ve que a marcacao pegou e toca de novo.
                        "de saida" e nao "saiu" de proposito: o sufixo so
                        aparece junto de "na fila"/"na mesa"/"jogando", e
                        "jogando · saiu" se le como contradicao (jogando =
                        ainda aqui, saiu = ja foi) - exatamente a confusao que
                        o aviso deveria evitar. "de saida" diz pendente sem
                        brigar com o estado ao lado. */}
                    {(state || left) && <em>{[state, left && state !== "foi embora" ? "de saída" : ""].filter(Boolean).join(" · ")}</em>}
                  </span>
                </button>
                <button
                  type="button"
                  className="queue-remove"
                  aria-label={`${player.name} foi embora`}
                  disabled={leaveDisabled}
                  aria-disabled={leaveDisabled}
                  onClick={() => handleDeparture(player.id, state, left)}
                >
                  ⨯
                </button>
              </div>
            );
          })}
        </div>
        <button type="button" className="btn chalk" style={{ marginTop: 14 }} onClick={onClose}>Concluir</button>
      </section>
    </div>
  );
}
