export type Value = string | number | boolean;

export function run(source: string): string[] {
  const variables = new Map<string, Value>();
  const output: string[] = [];
  const lines = source.split(/\r?\n/);

  function evaluate(raw: string, line: number): Value {
    const expr = raw.trim();
    if (/^"(?:[^"\\]|\\.)*"$/.test(expr)) {
      const value = JSON.parse(expr) as string;
      return value.replace(/\{([a-zA-Z_][a-zA-Z_0-9]*)\}/g, (_, name: string) => {
        if (!variables.has(name)) throw new Error(`Line ${line}: unknown variable '${name}'`);
        return String(variables.get(name));
      });
    }
    if (/^(true|false)$/.test(expr)) return expr === 'true';
    if (/^-?\d+(?:\.\d+)?$/.test(expr)) return Number(expr);
    if (/^[a-zA-Z_][a-zA-Z_0-9]*$/.test(expr)) {
      if (!variables.has(expr)) throw new Error(`Line ${line}: unknown variable '${expr}'`);
      return variables.get(expr)!;
    }
    const arithmetic = expr.match(/^([a-zA-Z_]\w*|-?\d+(?:\.\d+)?)\s*([+*/-])\s*([a-zA-Z_]\w*|-?\d+(?:\.\d+)?)$/);
    if (arithmetic) {
      const left = evaluate(arithmetic[1], line);
      const right = evaluate(arithmetic[3], line);
      if (typeof left !== 'number' || typeof right !== 'number') throw new Error(`Line ${line}: arithmetic requires numbers`);
      switch (arithmetic[2]) {
        case '+': return left + right;
        case '-': return left - right;
        case '*': return left * right;
        case '/': if (right === 0) throw new Error(`Line ${line}: division by zero`); return left / right;
      }
    }
    throw new Error(`Line ${line}: unsupported expression '${expr}'`);
  }

  lines.forEach((original, index) => {
    const line = index + 1;
    const statement = original.trim();
    if (!statement || statement.startsWith('#')) return;
    const assignment = statement.match(/^([a-zA-Z_]\w*)\s*=\s*(.+)$/);
    if (assignment) { variables.set(assignment[1], evaluate(assignment[2], line)); return; }
    const print = statement.match(/^print\s+(.+)$/);
    if (print) { output.push(String(evaluate(print[1], line))); return; }
    throw new Error(`Line ${line}: unknown statement '${statement}'`);
  });
  return output;
}
