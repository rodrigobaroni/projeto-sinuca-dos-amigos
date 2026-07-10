import { PlayerBall } from "./balls.jsx";

export function DefaultPlayerPanel({ players, currentPlayerId, onCurrentPlayerChange }) {
  if (!players.length) return null;

  return (
    <section className="default-player-panel">
      <div>
        <div className="record-section-title">perfil padrão</div>
        <p>Escolha qual jogador abre em Meu perfil neste navegador.</p>
      </div>
      <div className="player-carousel default-player-carousel" aria-label="Selecionar perfil padrão">
        {players.map((player) => {
          const active = player.id === currentPlayerId;
          return (
            <button
              key={player.id}
              type="button"
              className={`player-chip ${active ? "active" : ""}`}
              onClick={() => onCurrentPlayerChange?.(player.id)}
              aria-pressed={active}
            >
              <PlayerBall player={player} size={28} />
              <span>{player.name}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
