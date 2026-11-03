export type Expression =
  | { kind: 'number'; value: number }
  | { kind: 'string'; value: string }
  | { kind: 'boolean'; value: boolean }
  | { kind: 'variable'; name: string }
  | { kind: 'binary'; op: '+' | '-' | '*' | '/' | '==' | '!=' | '<' | '<=' | '>' | '>='; left: Expression; right: Expression };

type Token = { kind: 'number' | 'string' | 'identifier' | 'operator' | 'lparen' | 'rparen' | 'eof'; text: string; offset: number };

export function parseExpression(source: string): Expression {
  const tokens: Token[] = [];
  let pos = 0;
  while (pos < source.length) {
    if (/\s/.test(source[pos])) { pos++; continue; }
    const start = pos;
    const rest = source.slice(pos);
    const number = rest.match(/^\d+(?:\.\d+)?/);
    if (number) { tokens.push({ kind: 'number', text: number[0], offset: start }); pos += number[0].length; continue; }
    if (source[pos] === '"') {
      let end = pos + 1;
      while (end < source.length) {
        if (source[end] === '\\') { end += 2; continue; }
        if (source[end] === '"') break;
        end++;
      }
      if (end >= source.length) throw new Error('Unterminated string at column ' + (start + 1));
      tokens.push({ kind: 'string', text: source.slice(pos, end + 1), offset: start });
      pos = end + 1; continue;
    }
    const id = rest.match(/^[A-Za-z_]\w*/);
    if (id) { tokens.push({ kind: 'identifier', text: id[0], offset: start }); pos += id[0].length; continue; }
    const pair = source.slice(pos, pos + 2);
    if (['==', '!=', '<=', '>='].includes(pair)) { tokens.push({ kind: 'operator', text: pair, offset: start }); pos += 2; continue; }
    const char = source[pos++];
    if ('+-*/<>'.includes(char)) tokens.push({ kind: 'operator', text: char, offset: start });
    else if (char === '(') tokens.push({ kind: 'lparen', text: char, offset: start });
    else if (char === ')') tokens.push({ kind: 'rparen', text: char, offset: start });
    else throw new Error('Unexpected character ' + JSON.stringify(char) + ' at column ' + (start + 1));
  }
  tokens.push({ kind: 'eof', text: '', offset: pos });
  let i = 0;
  const peek = () => tokens[i];
  const take = () => tokens[i++];

  function primary(): Expression {
    const t = take();
    if (t.kind === 'number') return { kind: 'number', value: Number(t.text) };
    if (t.kind === 'string') return { kind: 'string', value: JSON.parse(t.text) as string };
    if (t.kind === 'identifier') {
      if (t.text === 'true' || t.text === 'false') return { kind: 'boolean', value: t.text === 'true' };
      return { kind: 'variable', name: t.text };
    }
    if (t.kind === 'lparen') {
      const expr = expression(0);
      if (peek().kind !== 'rparen') throw new Error('Expected closing parenthesis at column ' + (peek().offset + 1));
      take(); return expr;
    }
    if (t.kind === 'operator' && t.text === '-') return { kind: 'binary', op: '-', left: { kind: 'number', value: 0 }, right: primary() };
    throw new Error('Expected expression at column ' + (t.offset + 1));
  }

  function expression(min: number): Expression {
    let left = primary();
    while (peek().kind === 'operator') {
      const op = peek().text as '+' | '-' | '*' | '/' | '==' | '!=' | '<' | '<=' | '>' | '>=';
      const precedence = ['==', '!=', '<', '<=', '>', '>='].includes(op) ? 1 : op === '+' || op === '-' ? 2 : 3;
      if (precedence < min) break;
      take();
      const right = expression(precedence + 1);
      left = { kind: 'binary', op, left, right };
    }
    return left;
  }
  const result = expression(0);
  if (peek().kind !== 'eof') throw new Error('Unexpected token at column ' + (peek().offset + 1));
  return result;
}
