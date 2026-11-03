import { parseExpression, type Expression } from './parser.js';
export type Value = string | number | boolean;
export function run(source: string): string[] {
  const variables = new Map<string, Value>();
  const output: string[] = [];
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
        if (typeof a !== 'number' || typeof b !== 'number') throw new Error(`Line ${line}: arithmetic requires numbers`);
        if (expr.op === '+') return a + b;
        if (expr.op === '-') return a - b;
        if (expr.op === '*') return a * b;
        if (b === 0) throw new Error(`Line ${line}: division by zero`);
        return a / b;
      }
    }
  }
  source.split(/\r?\n/).forEach((original, index) => {
    const line = index + 1, statement = original.trim();
    if (!statement || statement.startsWith('#')) return;
    const assignment = statement.match(/^([A-Za-z_]\w*)\s*=\s*(.+)$/);
    const print = statement.match(/^print\s+(.+)$/);
    if (!assignment && !print) throw new Error(`Line ${line}: unknown statement '${statement}'`);
    const expression = assignment ? assignment[2] : print![1];
    let value: Value;
    try { value = evaluate(parseExpression(expression), line); }
    catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(message.startsWith('Line ') ? message : `Line ${line}: ${message}`);
    }
    if (assignment) variables.set(assignment[1], value);
    else output.push(String(value));
  });
  return output;
}
