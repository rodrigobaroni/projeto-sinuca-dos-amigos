export function RecordSection({ title, tone = "glory", children }) {
  return (
    <section className={`record-section ${tone}`}>
      <div className="record-section-title">{title}</div>
      <div className="rec-grid">{children}</div>
    </section>
  );
}

export function Record({ label, desc, value, holder, sub }) {
  return (
    <article className="rec" tabIndex="0">
      <div className="label">{label}</div>
      {desc && <div className="rec-desc">{desc}</div>}
      <div className="val stat-num">{value}</div>
      <div className="holder">{holder}</div>
      {sub && <div className="rec-sub">{sub}</div>}
    </article>
  );
}
