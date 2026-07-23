import { PlayerBall } from "./balls.jsx";

export function PlayerPickerModal({ eyebrow = "selecionar jogador", title, subtitle, note, players, onChoose, onClose }) {
  return (
    <div className="identity-alert-bg" onClick={(event) => event.target === event.currentTarget && onClose?.()}>
      <section
        className="identity-alert"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="player-picker-title"
      >
        <div className="eyebrow">{eyebrow}</div>
        <div id="player-picker-title" className="confirm-title">{title}</div>
        {subtitle && <p>{subtitle}</p>}
        <div className="identity-grid" aria-label={title}>
          {players.map((player, index) => (
            <button
              key={player.id}
              type="button"
              className="identity-player"
              autoFocus={index === 0}
              onClick={() => onChoose(player.id)}
            >
              <PlayerBall player={player} size={40} />
              <span>
                <strong>{player.name}</strong>
                {player.meta && <em>{player.meta}</em>}
              </span>
            </button>
          ))}
        </div>
        {note && <small className="identity-alert-note">{note}</small>}
        {onClose && <button type="button" className="btn ghost" style={{ marginTop: 14 }} onClick={onClose}>Cancelar</button>}
      </section>
    </div>
  );
}
