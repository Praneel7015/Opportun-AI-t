import { Fragment, type ElementType, type ReactNode } from "react";

interface MarkdownLiteProps {
  value: string;
  className?: string;
}

/**
 * Renders the small Markdown subset emitted by briefing reports. Text is always
 * passed to React as text nodes; raw HTML in report content is never executed.
 */
export function MarkdownLite({ value, className }: MarkdownLiteProps) {
  const blocks: ReactNode[] = [];
  const lines = value.replace(/\r\n?/g, "\n").split("\n");
  let paragraph: string[] = [];
  let quote: string[] = [];
  let list: string[] = [];
  let key = 0;

  const nextKey = () => `markdown-${key++}`;
  const inline = (text: string) => renderInline(text, nextKey);

  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push(
      <p key={nextKey()} className="leading-relaxed">
        {renderLines(paragraph, inline)}
      </p>,
    );
    paragraph = [];
  };

  const flushQuote = () => {
    if (!quote.length) return;
    blocks.push(
      <blockquote
        key={nextKey()}
        className="border-l-2 border-[var(--accent)] pl-4 text-[var(--muted)]"
      >
        {renderLines(quote, inline)}
      </blockquote>,
    );
    quote = [];
  };

  const flushList = () => {
    if (!list.length) return;
    blocks.push(
      <ul key={nextKey()} className="list-disc space-y-1 pl-5">
        {list.map((item) => (
          <li key={nextKey()}>{inline(item)}</li>
        ))}
      </ul>,
    );
    list = [];
  };

  for (const line of lines) {
    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    const quoteLine = /^>\s?(.*)$/.exec(line);
    const listLine = /^(?:[-*+]\s+|\d+[.)]\s+)(.+)$/.exec(line);

    if (!line.trim()) {
      flushParagraph();
      flushQuote();
      flushList();
    } else if (heading) {
      flushParagraph();
      flushQuote();
      flushList();
      const level = heading[1].length;
      const classNames = [
        "text-xl font-semibold",
        "text-lg font-semibold",
        "text-base font-semibold",
        "text-sm font-semibold",
        "text-sm font-semibold",
        "text-sm font-semibold",
      ];
      const Tag = `h${level}` as ElementType;
      blocks.push(
        <Tag key={nextKey()} className={classNames[level - 1]}>
          {inline(heading[2])}
        </Tag>,
      );
    } else if (quoteLine) {
      flushParagraph();
      flushList();
      quote.push(quoteLine[1]);
    } else if (listLine) {
      flushParagraph();
      flushQuote();
      list.push(listLine[1]);
    } else {
      flushQuote();
      flushList();
      paragraph.push(line);
    }
  }

  flushParagraph();
  flushQuote();
  flushList();

  return <div className={className}>{blocks}</div>;
}

export function markdownToPlainText(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/^(?:[-*+]\s+|\d+[.)]\s+)/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\n+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function renderLines(
  lines: string[],
  inline: (text: string) => ReactNode,
): ReactNode[] {
  return lines.flatMap((line, index) => [
    index > 0 ? <br key={`break-${index}`} /> : null,
    <Fragment key={`line-${index}`}>{inline(line)}</Fragment>,
  ]);
}

function renderInline(
  value: string,
  nextKey: () => string,
): ReactNode[] {
  return value.split(/(\*\*[^*]+\*\*)/g).map((part) => {
    const bold = /^\*\*([^*]+)\*\*$/.exec(part);
    return bold ? <strong key={nextKey()}>{bold[1]}</strong> : part;
  });
}
