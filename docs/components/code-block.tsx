import { highlightCode, languageFromTitle } from "@/lib/highlight-code";

export function CodeBlock({
  children,
  title,
  language,
  plain = false,
  fill = false,
}: {
  children: string;
  title?: string;
  language?: "srpc" | "typescript" | "json" | "shell";
  plain?: boolean;
  fill?: boolean;
}) {
  const lang = language ?? languageFromTitle(title);
  const html = highlightCode(children, lang);

  if (plain) {
    return (
      <div className="code-plain">
        {title ? (
          <p className="code-plain-title font-mono text-xs">{title}</p>
        ) : null}
        <pre className="code-block overflow-x-auto text-[13px] leading-[1.65]">
          <code dangerouslySetInnerHTML={{ __html: html }} />
        </pre>
      </div>
    );
  }

  return (
    <div className={`code-block-panel${fill ? " code-block-panel-fill" : ""}`}>
      <div className="code-block-header">
        <div className="code-block-dots" aria-hidden>
          <span />
          <span />
          <span />
        </div>
        {title ? (
          <span className="font-mono text-[11px] text-muted">{title}</span>
        ) : (
          <span />
        )}
      </div>
      <pre
        className={`code-block overflow-x-auto p-4 text-[13px] leading-[1.65] sm:p-5${
          fill ? " code-block-fill" : ""
        }`}
      >
        <code dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
    </div>
  );
}
