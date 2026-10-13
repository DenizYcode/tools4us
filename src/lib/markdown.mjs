// A small Markdown subset for story bodies: paragraphs, ## and ### headings, "- " lists, **bold**, *italic* and
// links. Raw HTML is always escaped. A link renders only when it is https on cisco.com or meraki.com (the same
// hosts check-dist allows), otherwise its text is shown without a link; the story validator turns that into a
// build error, so it never reaches readers.

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ESCAPES[c]);

const ALLOWED_HOST = /(^|\.)(cisco|meraki)\.com$/i;

/** True for an https URL on cisco.com or meraki.com. */
export function isAllowedLink(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && ALLOWED_HOST.test(u.hostname);
  } catch {
    return false;
  }
}

const LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g;

/** Every [text](url) in a Markdown string, for the validator. */
export function extractLinks(md) {
  return [...String(md).matchAll(LINK)].map((m) => ({ text: m[1], url: m[2] }));
}

const emphasis = (escaped) => escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>');

const ICON =
  '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false"><path d="M6 3H3v10h10v-3M9 2h5v5M14 2 7 9" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function inline(text, externalNote) {
  let out = '';
  let last = 0;
  for (const m of text.matchAll(LINK)) {
    out += emphasis(escapeHtml(text.slice(last, m.index)));
    const label = emphasis(escapeHtml(m[1]));
    out += isAllowedLink(m[2])
      ? `<a class="ext" href="${escapeHtml(m[2])}" target="_blank" rel="noopener noreferrer">${label}${ICON}<span class="sr">${escapeHtml(externalNote)}</span></a>`
      : label;
    last = m.index + m[0].length;
  }
  return out + emphasis(escapeHtml(text.slice(last)));
}

/** Markdown subset to HTML. `externalNote` is the visually hidden "(opens in a new tab)" text. */
export function renderMarkdown(md, { externalNote = '' } = {}) {
  const blocks = String(md).replace(/\r\n?/g, '\n').trim().split(/\n{2,}/);
  const html = [];
  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trimEnd());
    if (lines.every((l) => /^- /.test(l))) {
      html.push(`<ul>${lines.map((l) => `<li>${inline(l.slice(2), externalNote)}</li>`).join('')}</ul>`);
    } else if (/^###? /.test(lines[0]) && lines.length === 1) {
      const level = lines[0].startsWith('###') ? 3 : 2;
      html.push(`<h${level}>${inline(lines[0].replace(/^###? /, ''), externalNote)}</h${level}>`);
    } else {
      html.push(`<p>${inline(lines.join(' '), externalNote)}</p>`);
    }
  }
  return html.join('\n');
}
