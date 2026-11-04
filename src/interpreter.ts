import { parseExpression, type Expression } from './parser.js';
export type Value = string | number | boolean | null | Value[] | { [key: string]: Value };
export type TraceEvent = { line: number; kind: string; status: 'started' | 'completed' | 'skipped' | 'failed' | 'planned'; label?: string; detail?: string };
export type RunOptions = { dryRun?: boolean; onTrace?: (event: TraceEvent) => void };
type Statement = { kind: 'plan'; action: string; payload: Expression; line: number } | { kind: 'workflow'; name: string; body: Statement[]; line: number } | { kind: 'step'; name: string; body: Statement[]; line: number } | { kind: 'return'; expr: Expression; line: number } | { kind: 'function'; name: string; params: string[]; body: Statement[]; line: number } | { kind: 'call'; name: string; args: Expression[]; line: number } | { kind: 'while'; condition: Expression; body: Statement[]; line: number } | { kind: 'assign'; name: string; expr: Expression; line: number } | { kind: 'print'; expr: Expression; line: number } | { kind: 'if'; condition: Expression; yes: Statement[]; no: Statement[]; line: number };
export function run(source: string, options: RunOptions = {}): string[] {
  let variables = new Map<string, Value>();
  const functions = new Map<string, { params: string[]; body: Statement[] }>();
  let callDepth = 0;
  const display = (value: Value): string => value === null ? 'null' : typeof value === 'object' ? JSON.stringify(value) : String(value);
  class ReturnSignal { constructor(readonly value: Value) {} }
  const output: string[] = [];
  const trace = (event: TraceEvent) => options.onTrace?.(event);
  let workflowDepth = 0;
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
      const workflow = statement.match(/^workflow\s+"([^"]+)"\s*\{$/);
      if (workflow) { result.push({kind:'workflow',name:workflow[1],body:block(true),line}); continue; }
      const step = statement.match(/^step\s+"([^"]+)"\s*\{$/);
      if (step) { result.push({kind:'step',name:step[1],body:block(true),line}); continue; }
      const planned = statement.match(/^plan\s+"([^"]+)"\s+with\s+(.+)$/);
      if (planned) { result.push({kind:'plan',action:planned[1],payload:parse(planned[2],line),line}); continue; }
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
      const returned = statement.match(/^return\s+(.+)$/);
      if (returned) { result.push({kind:'return',expr:parse(returned[1],line),line}); continue; }
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
      case 'null': return null;
      case 'list': return expr.items.map(item => evaluate(item,line));
      case 'record': { const record: {[key:string]:Value} = Object.create(null); for (const field of expr.fields) record[field.name] = evaluate(field.value,line); return record; }
      case 'field': { const target = evaluate(expr.target,line); if (Array.isArray(target) && expr.name === 'length') return target.length;
        if (target === null || Array.isArray(target) || typeof target !== 'object') throw new Error(`Line ${line}: field access requires a record`); if (!Object.hasOwn(target,expr.name)) throw new Error(`Line ${line}: unknown field '${expr.name}'`); return target[expr.name]; }
      case 'index': { const target = evaluate(expr.target,line), index = evaluate(expr.index,line); if (!Array.isArray(target)) throw new Error(`Line ${line}: indexing requires a list`); if (typeof index !== 'number' || !Number.isInteger(index) || index < 0 || index >= target.length) throw new Error(`Line ${line}: list index out of range`); return target[index]; }
      case 'call': return invoke(expr.name,expr.args,line);
      case 'number': case 'boolean': return expr.value;
      case 'string':
        return expr.value.replace(/\{([A-Za-z_]\w*)\}/g, (_, name: string) => {
          if (!variables.has(name)) throw new Error(`Line ${line}: unknown variable '${name}'`);
          return display(variables.get(name)!);
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
  function invoke(name: string, args: Expression[], line: number): Value {
    const fn = functions.get(name);
    if (!fn) throw new Error(`Line ${line}: unknown function '${name}'`);
    if (fn.params.length !== args.length) throw new Error(`Line ${line}: function '${name}' expects ${fn.params.length} arguments`);
    const values = args.map(a => evaluate(a,line));
    if (++callDepth > 100) { callDepth--; throw new Error(`Line ${line}: maximum function call depth exceeded`); }
    const previous = variables;
    variables = new Map(fn.params.map((param,i) => [param,values[i]]));
    try { execute(fn.body); return null; }
    catch (error) { if (error instanceof ReturnSignal) return error.value; throw error; }
    finally { variables = previous; callDepth--; }
  }
  let steps = 0;
  const maxSteps = 100000;
  function execute(statements: Statement[]): void {
    for (const stmt of statements) {
      if (++steps > maxSteps) throw new Error(`Line ${stmt.line}: execution limit exceeded (${maxSteps} steps)`);
      if (stmt.kind === 'workflow' || stmt.kind === 'step') {
        if (stmt.kind === 'step' && workflowDepth === 0) throw new Error(`Line ${stmt.line}: step requires a workflow`);
        if (stmt.kind === 'workflow' && workflowDepth > 0) throw new Error(`Line ${stmt.line}: nested workflows are not supported`);
        trace({line:stmt.line,kind:stmt.kind,status:'started',label:stmt.name});
        if (stmt.kind === 'workflow') workflowDepth++;
        try {
          execute(stmt.body);
          trace({line:stmt.line,kind:stmt.kind,status:'completed',label:stmt.name});
        } catch (error) {
          trace({line:stmt.line,kind:stmt.kind,status:'failed',label:stmt.name,detail:error instanceof Error?error.message:String(error)});
          throw error;
        } finally { if (stmt.kind === 'workflow') workflowDepth--; }
      } else if (stmt.kind === 'plan') {
        if (!workflowDepth) throw new Error(`Line ${stmt.line}: plan requires a workflow`);
        const payload = evaluate(stmt.payload,stmt.line);
        if (payload === null || Array.isArray(payload) || typeof payload !== 'object') throw new Error(`Line ${stmt.line}: planned action requires a record`);
        trace({line:stmt.line,kind:'action',status:'planned',label:stmt.action,detail:display(payload)});
      } else if (stmt.kind === 'function') {
        if (functions.has(stmt.name)) throw new Error(`Line ${stmt.line}: function '${stmt.name}' already defined`);
        functions.set(stmt.name, { params: stmt.params, body: stmt.body });
      } else if (stmt.kind === 'call') {
        invoke(stmt.name,stmt.args,stmt.line);
      } else if (stmt.kind === 'return') {
        if (!callDepth) throw new Error(`Line ${stmt.line}: return outside function`);
        throw new ReturnSignal(evaluate(stmt.expr,stmt.line));
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
        trace({line:stmt.line,kind:'if',status:condition?'completed':'skipped',detail:condition?'true':'false'});
        execute(condition ? stmt.yes : stmt.no);
      } else {
        const value = evaluate(stmt.expr, stmt.line);
        if (stmt.kind === 'assign') variables.set(stmt.name, value);
        else output.push(display(value));
        trace({line:stmt.line,kind:stmt.kind,status:'completed',detail:stmt.kind === 'assign' ? stmt.name : display(value)});
      }
    }
  }
  execute(block(false));
  return output;
}

export function runWorkflow(source: string, dryRun = false): { output: string[]; trace: TraceEvent[] } {
  const trace: TraceEvent[] = [];
  const output = run(source, {dryRun,onTrace: event => trace.push(event)});
  return {output,trace};
}
