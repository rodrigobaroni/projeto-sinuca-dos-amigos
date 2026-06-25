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
