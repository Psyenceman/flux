export type Expression =
  | { kind: 'number'; value: number }
  | { kind: 'string'; value: string }
  | { kind: 'boolean'; value: boolean }
  | { kind: 'null' }
  | { kind: 'list'; items: Expression[] }
  | { kind: 'record'; fields: { name: string; value: Expression }[] }
  | { kind: 'index'; target: Expression; index: Expression }
  | { kind: 'field'; target: Expression; name: string }
  | { kind: 'call'; name: string; args: Expression[] }
  | { kind: 'variable'; name: string }
  | { kind: 'binary'; op: '+' | '-' | '*' | '/' | '==' | '!=' | '<' | '<=' | '>' | '>='; left: Expression; right: Expression };

type Token = { kind: 'number' | 'string' | 'identifier' | 'operator' | 'lparen' | 'rparen' | 'lbracket' | 'rbracket' | 'lbrace' | 'rbrace' | 'comma' | 'colon' | 'dot' | 'eof'; text: string; offset: number };

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
    else if ('[]{}:,.'.includes(char)) tokens.push({kind: ({'[':'lbracket',']':'rbracket','{':'lbrace','}':'rbrace',':':'colon',',':'comma','.':'dot'} as const)[char as '['|']'|'{'|'}'|':'|','|'.'],text:char,offset:start});
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
      if (t.text === 'null') return {kind:'null'};
      if (t.text === 'true' || t.text === 'false') return { kind: 'boolean', value: t.text === 'true' };
      return { kind: 'variable', name: t.text };
    }
    if (t.kind === 'lbracket') {
      const items: Expression[] = [];
      if (peek().kind !== 'rbracket') { do { items.push(expression(0)); if (peek().kind !== 'comma') break; take(); } while (true); }
      if (peek().kind !== 'rbracket') throw new Error('Expected closing bracket at column ' + (peek().offset + 1));
      take(); return {kind:'list',items};
    }
    if (t.kind === 'lbrace') {
      const fields: {name:string;value:Expression}[] = [];
      if (peek().kind !== 'rbrace') { do {
        const name = take();
        if (name.kind !== 'identifier' && name.kind !== 'string') throw new Error('Expected record field name at column ' + (name.offset + 1));
        if (peek().kind !== 'colon') throw new Error('Expected colon at column ' + (peek().offset + 1));
        take(); fields.push({name:name.kind === 'string' ? JSON.parse(name.text) as string : name.text,value:expression(0)});
        if (peek().kind !== 'comma') break; take();
      } while (true); }
      if (peek().kind !== 'rbrace') throw new Error('Expected closing brace at column ' + (peek().offset + 1));
      take(); return {kind:'record',fields};
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
    while (true) {
      const token = peek();
      if (token.kind === 'dot') {
        take(); const name = take();
        if (name.kind !== 'identifier') throw new Error('Expected field name at column ' + (name.offset + 1));
        left = {kind:'field',target:left,name:name.text};
      } else if (token.kind === 'lbracket') {
        take(); const index = expression(0);
        if (peek().kind !== 'rbracket') throw new Error('Expected closing bracket at column ' + (peek().offset + 1));
        take(); left = {kind:'index',target:left,index};
      } else if (token.kind === 'lparen' && left.kind === 'variable') {
        take(); const args: Expression[] = [];
        if (peek().kind !== 'rparen') { do { args.push(expression(0)); if (peek().kind !== 'comma') break; take(); } while(true); }
        if (peek().kind !== 'rparen') throw new Error('Expected closing parenthesis at column ' + (peek().offset + 1));
        take(); left = {kind:'call',name:left.name,args};
      } else break;
    }
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
