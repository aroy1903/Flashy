// Strip common markdown syntax for plain-text rendering / comparison.
// Definitions are stored verbatim (so Flashcard.jsx can render them via
// react-markdown), but other modes — Learn, Match, Gravity, Quiz — render
// `card.definition` as plain text or compare it against typed input, so the
// raw `**`, `` ` ``, `##`, list markers etc. need to be removed first.
export function stripMarkdown(md) {
  if (!md) return '';
  return String(md)
    .replace(/```[\s\S]*?```/g, ' ')           // fenced code blocks
    .replace(/`([^`]+)`/g, '$1')               // inline code
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')      // images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')   // links → text
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')        // headings
    .replace(/^\s{0,3}>\s?/gm, '')             // blockquotes
    .replace(/^\s*[-*+]\s+/gm, '')             // bullet markers
    .replace(/^\s*\d+\.\s+/gm, '')             // ordered list markers
    .replace(/^\s*\|.*\|\s*$/gm, ' ')          // table rows
    .replace(/^\s*[-*_]{3,}\s*$/gm, ' ')       // horizontal rules
    .replace(/\*\*([^*]+)\*\*/g, '$1')         // bold
    .replace(/__([^_]+)__/g, '$1')             // bold (alt)
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1$2') // italic
    .replace(/(^|[^_])_([^_\n]+)_/g, '$1$2')   // italic (alt)
    .replace(/~~([^~]+)~~/g, '$1')             // strikethrough
    .replace(/\s+/g, ' ')
    .trim();
}
