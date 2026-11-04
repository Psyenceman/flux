// Lightweight Flux syntax highlighter. Never inserts user code as HTML.
const escapeHTML = text => text.replace(/[&<>"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[char]));
export function highlight(source) {
  const tokens = /#[^\n]*|"(?:[^"\\]|\\.)*"|\b(?:print|if|else|while|function|true|false)\b|\b\d+(?:\.\d+)?\b/g;
  let result = '', cursor = 0, match;
  while ((match = tokens.exec(source))) {
    result += escapeHTML(source.slice(cursor, match.index));
    const token = match[0];
    const kind = token.startsWith('#') ? 'comment' : token.startsWith('"') ? 'string' : /^\d/.test(token) ? 'number' : 'keyword';
    result += '<span class="flux-' + kind + '">' + escapeHTML(token) + '</span>';
    cursor = tokens.lastIndex;
  }
  return result + escapeHTML(source.slice(cursor)) + '\n';
}
export const commands = ['print','if','else','while','function','true','false'];
