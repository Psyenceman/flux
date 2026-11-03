import { parseExpression, type Expression } from './parser.js';
export type Value = string | number | boolean;
type Statement = { kind: 'while'; condition: Expression; body: Statement[]; line: number } | { kind: 'assign'; name: string; expr: Expression; line: number } | { kind: 'print'; expr: Expression; line: number } | { kind: 'if'; condition: Expression; yes: Statement[]; no: Statement[]; line: number };
export function run(source: string): string[] {
  const variables = new Map<string, Value>();
  const output: string[] = [];
  const lines = source.split(/\r?\n/);
  let cursor = 0;
  function parse(raw: string, line: number): Expression {
    try { return parseExpression(raw); }
    catch (e) { throw new Error(`Line ${line}: ${e instanceof Error ? e.message : String(e)}`); }
  }
  function block(nested: boolean): Statement[] {
    const result: Statement[] = [];
    while (cursor < lines.length) {
      const line = cursor + 1, statement = lines[cursor++].trim();
      if (!statement || statement.startsWith('#')) continue;
      if (statement === '}' || statement === '} else {') {
        if (statement === '} else {') lines.splice(cursor, 0, 'else {');
        if (!nested) throw new Error(`Line ${line}: unexpected closing brace`);
        return result;
      }
      const condition = statement.match(/^if\s+(.+?)\s*\{$/);
      if (condition) {
        const yes = block(true);
        let no: Statement[] = [];
        let next = cursor;
        while (next < lines.length && (!lines[next].trim() || lines[next].trim().startsWith('#'))) next++;
        if (next < lines.length && lines[next].trim() === 'else {') { cursor = next + 1; no = block(true); }
        result.push({ kind: 'if', condition: parse(condition[1], line), yes, no, line });
        continue;
      }
      const loop = statement.match(/^while\s+(.+?)\s*\{$/);
      if (loop) {
        result.push({ kind: 'while', condition: parse(loop[1], line), body: block(true), line });
        continue;
      }
      const assignment = statement.match(/^([A-Za-z_]\w*)\s*=\s*(.+)$/);
      const print = statement.match(/^print\s+(.+)$/);
      if (assignment) { result.push({ kind: 'assign', name: assignment[1], expr: parse(assignment[2], line), line }); continue; }
      if (print) { result.push({ kind: 'print', expr: parse(print[1], line), line }); continue; }
      throw new Error(`Line ${line}: unknown statement '${statement}'`);
    }
    if (nested) throw new Error(`Line ${lines.length}: missing closing brace`);
    return result;
  }
  function evaluate(expr: Expression, line: number): Value {
    switch (expr.kind) {
      case 'number': case 'boolean': return expr.value;
      case 'string':
        return expr.value.replace(/\{([A-Za-z_]\w*)\}/g, (_, name: string) => {
          if (!variables.has(name)) throw new Error(`Line ${line}: unknown variable '${name}'`);
          return String(variables.get(name));
        });
      case 'variable':
        if (!variables.has(expr.name)) throw new Error(`Line ${line}: unknown variable '${expr.name}'`);
        return variables.get(expr.name)!;
      case 'binary': {
        const a = evaluate(expr.left, line), b = evaluate(expr.right, line);
        if (expr.op === '==') return a === b;
        if (expr.op === '!=') return a !== b;
        if (typeof a !== 'number' || typeof b !== 'number') throw new Error(`Line ${line}: arithmetic and ordering require numbers`);
        switch (expr.op) {
          case '+': return a + b;
          case '-': return a - b;
          case '*': return a * b;
          case '/': if (b === 0) throw new Error(`Line ${line}: division by zero`); return a / b;
          case '<': return a < b;
          case '<=': return a <= b;
          case '>': return a > b;
          case '>=': return a >= b;
        }
      }
    }
  }
  let steps = 0;
  const maxSteps = 100000;
  function execute(statements: Statement[]): void {
    for (const stmt of statements) {
      if (++steps > maxSteps) throw new Error(`Line ${stmt.line}: execution limit exceeded (${maxSteps} steps)`);
      if (stmt.kind === 'while') {
        while (true) {
          if (++steps > maxSteps) throw new Error(`Line ${stmt.line}: execution limit exceeded (${maxSteps} steps)`);
          const condition = evaluate(stmt.condition, stmt.line);
          if (typeof condition !== 'boolean') throw new Error(`Line ${stmt.line}: while requires a boolean condition`);
          if (!condition) break;
          execute(stmt.body);
        }
      } else if (stmt.kind === 'if') {
        const condition = evaluate(stmt.condition, stmt.line);
        if (typeof condition !== 'boolean') throw new Error(`Line ${stmt.line}: if requires a boolean condition`);
        execute(condition ? stmt.yes : stmt.no);
      } else {
        const value = evaluate(stmt.expr, stmt.line);
        if (stmt.kind === 'assign') variables.set(stmt.name, value);
        else output.push(String(value));
      }
    }
  }
  execute(block(false));
  return output;
}
