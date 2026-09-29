function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function inline(value) {
  return escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}

/** Render the lesson-script markdown subset: headings, speaker lines, italics and pause cues. */
export function renderTranscript(markdown) {
  const html = [];
  for (const raw of String(markdown).replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('### ')) {
      html.push(`<h4>${inline(line.slice(4))}</h4>`);
      continue;
    }
    if (line.startsWith('## ')) {
      html.push(`<h3>${inline(line.slice(3))}</h3>`);
      continue;
    }
    if (line.startsWith('# ')) {
      html.push(`<h3>${inline(line.slice(2))}</h3>`);
      continue;
    }
    const formatted = inline(line);
    const cue = /^\*(?:\[|&lt;)/.test(line) || line.startsWith('*[pause') || line.startsWith('*[Pause');
    html.push(cue ? `<p class="cue">${formatted}</p>` : `<p>${formatted}</p>`);
  }
  return html.join('\n');
}
