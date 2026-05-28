export function SectionPanel({ children, className = '', id, title, eyebrow, aside }) {
  return (
    <section className={`panel section-panel ${className}`.trim()} id={id}>
      {(title || eyebrow || aside) ? (
        <div className="panel-heading">
          <div>
            {eyebrow ? <p className="overline">{eyebrow}</p> : null}
            {title ? <h2>{title}</h2> : null}
          </div>
          {aside}
        </div>
      ) : null}
      {children}
    </section>
  );
}
