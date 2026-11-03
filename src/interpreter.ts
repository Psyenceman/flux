import { parseExpression, type Expression } from './parser.js';
export type Value = string | number | boolean;
type Statement = { kind: 'function'; name: string; params: string[]; body: Statement[]; line: number } | { kind: 'call'; name: string; args: Expression[]; line: number } | { kind: 'while'; condition: Expression; body: Statement[]; line: number } | { kind: 'assign'; name: string; expr: Expression; line: number } | { kind: 'print'; expr: Expression; line: number } | { kind: 'if'; condition: Expression; yes: Statement[]; no: Statement[]; line: number };
export function run(source: string): string[] {
  let variables = new Map<string, Value>();
  const functions = new Map<string, { params: string[]; body: Statement[] }>();
  let callDepth = 0;
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
      const definition = statement.match(/^function\s+([A-Za-z_]\w*)\s*\(([^()]*)\)\s*\{$/);
      if (definition) {
        const params = definition[2].trim() ? definition[2].split(',').map(p => p.trim()) : [];
        if (params.some(p => !/^[A-Za-z_]\w*$/.test(p)) || new Set(params).size !== params.length) throw new Error(`Line ${line}: invalid function parameters`);
        result.push({ kind: 'function', name: definition[1], params, body: block(true), line });
        continue;
      }
      const call = statement.match(/^([A-Za-z_]\w*)\s*\((.*)\)$/);
      if (call) {
        const parts = call[2].trim() ? call[2].split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(p => p.trim()) : [];
        result.push({ kind: 'call', name: call[1], args: parts.map(p => parse(p, line)), line });
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
      if (stmt.kind === 'function') {
        if (functions.has(stmt.name)) throw new Error(`Line ${stmt.line}: function '${stmt.name}' already defined`);
        functions.set(stmt.name, { params: stmt.params, body: stmt.body });
      } else if (stmt.kind === 'call') {
        const fn = functions.get(stmt.name);
        if (!fn) throw new Error(`Line ${stmt.line}: unknown function '${stmt.name}'`);
        if (fn.params.length !== stmt.args.length) throw new Error(`Line ${stmt.line}: function '${stmt.name}' expects ${fn.params.length} arguments`);
        const values = stmt.args.map(a => evaluate(a, stmt.line));
        if (++callDepth > 100) throw new Error(`Line ${stmt.line}: maximum function call depth exceeded`);
        const previous = variables;
        variables = new Map(fn.params.map((name, i) => [name, values[i]]));
        try { execute(fn.body); } finally { variables = previous; callDepth--; }
      } else if (stmt.kind === 'while') {
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
