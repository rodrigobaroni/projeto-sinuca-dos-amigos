export function ViewHead({ eyebrow, title, children }) {
  return (
    <div className="view-head">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <div className="viewtitle">{title}</div>
        {children}
      </div>
    </div>
  );
}

export function Toast({ message }) {
  return <div id="toast" className={message ? "show" : ""}>{message}</div>;
}

export function Sheet({ children, onClose }) {
  return (
    <div className={`sheet-bg ${children ? "open" : ""}`} onClick={(event) => event.target.classList.contains("sheet-bg") && onClose()}>
      <div className="sheet">
        <div className="grip" />
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({ request, onCancel, onConfirm }) {
  if (!request) return null;
  return (
    <div className="confirm-bg open" role="presentation" onClick={(event) => event.target.classList.contains("confirm-bg") && onCancel()}>
      <div className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-message">
        <div className="eyebrow">{request.eyebrow || "confirmar ação"}</div>
        <div id="confirm-title" className="confirm-title">{request.title || "Tem certeza?"}</div>
        <p id="confirm-message">{request.message}</p>
        <div className="confirm-actions">
          <button className="btn ghost" type="button" onClick={onCancel}>{request.cancelLabel || "Cancelar"}</button>
          <button className="btn danger" type="button" onClick={onConfirm}>{request.confirmLabel || "Confirmar"}</button>
        </div>
      </div>
    </div>
  );
}
