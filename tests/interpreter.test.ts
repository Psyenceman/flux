import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { run } from '../src/interpreter.js';
test('variables and interpolation', () => assert.deepEqual(run('name = "World"\nprint "Hello, {name}!"'), ['Hello, World!']));
test('operator precedence', () => assert.deepEqual(run('print 2 + 3 * 4'), ['14']));
test('parentheses', () => assert.deepEqual(run('print (2 + 3) * 4'), ['20']));
test('arithmetic with variables', () => assert.deepEqual(run('x = 10\nprint x * 2'), ['20']));
test('comparisons', () => assert.deepEqual(run('print 2 + 3 * 4 == 14\nprint 5 >= 6'), ['true', 'false']));
test('if true branch', () => assert.deepEqual(run('score = 80\nif score >= 60 {\n print "pass"\n} else {\n print "fail"\n}'), ['pass']));
test('if false branch', () => assert.deepEqual(run('score = 30\nif score >= 60 {\n print "pass"\n} else {\n print "fail"\n}'), ['fail']));
test('nested if', () => assert.deepEqual(run('if true {\n if 3 > 2 {\n print "yes"\n }\n}'), ['yes']));
test('rejects nonboolean conditions', () => assert.throws(() => run('if 1 {\nprint "x"\n}'), /boolean condition/));
test('rejects missing braces', () => assert.throws(() => run('if true {\nprint "x"'), /missing closing brace/));
test('rejects unknown variables', () => assert.throws(() => run('print missing'), /unknown variable/));
test('rejects unsupported statements', () => assert.throws(() => run('delete everything'), /unknown statement/));
test('division by zero', () => assert.throws(() => run('print 1 / 0'), /division by zero/));

test('while loop counts', () => assert.deepEqual(run('i = 0\nwhile i < 3 {\n print i\n i = i + 1\n}'), ['0', '1', '2']));
test('while false skips body', () => assert.deepEqual(run('while false {\n print "never"\n}\nprint "done"'), ['done']));
test('nested while and if', () => assert.deepEqual(run('i = 0\nwhile i < 3 {\n if i == 1 {\n print "middle"\n }\n i = i + 1\n}'), ['middle']));
test('while requires boolean', () => assert.throws(() => run('while 1 {\n print "never"\n}'), /boolean condition/));
test('infinite loop is bounded', () => assert.throws(() => run('while true {\n}\n'), /execution limit exceeded/));

test('function with arguments', () => assert.deepEqual(run('function greet(name) {\n print "Hello {name}"\n}\ngreet("Ada")'), ['Hello Ada']));
test('function multiple arguments', () => assert.deepEqual(run('function add(a, b) {\n print a + b\n}\nadd(2, 3)'), ['5']));
test('function local scope', () => assert.deepEqual(run('x = 10\nfunction show(x) {\n print x\n}\nshow(2)\nprint x'), ['2', '10']));
test('function no arguments', () => assert.deepEqual(run('function ping() {\n print "pong"\n}\nping()'), ['pong']));
test('function wrong arity', () => assert.throws(() => run('function ping(x) {\n print x\n}\nping()'), /expects 1 arguments/));
test('function undefined', () => assert.throws(() => run('missing()'), /unknown function/));
test('function duplicate parameters', () => assert.throws(() => run('function bad(x, x) {\n print x\n}'), /invalid function parameters/));

test('null literal', () => assert.deepEqual(run('print null'), ['null']));
test('lists and indexing', () => assert.deepEqual(run('items = [10, 20, 30]\nprint items[1]'), ['20']));
test('records and field access', () => assert.deepEqual(run('customer = {name: "Ada", active: true}\nprint customer.name'), ['Ada']));
test('nested structures', () => assert.deepEqual(run('data = {items: [{total: 42}]}\nprint data.items[0].total'), ['42']));
test('return value from function', () => assert.deepEqual(run('function add(a, b) {\n return a + b\n}\nprint add(2, 3)'), ['5']));
test('function without return yields null', () => assert.deepEqual(run('function noop() {\n print "ok"\n}\nprint noop()'), ['ok','null']));
test('return outside function rejected', () => assert.throws(() => run('return 1'), /return outside function/));
test('invalid list index rejected', () => assert.throws(() => run('print [1][3]'), /list index out of range/));
test('unknown record field rejected', () => assert.throws(() => run('print {name: "Ada"}.age'), /unknown field/));

test('iterate over list with while', () => assert.deepEqual(run('items = [3, 5, 7]\ni = 0\nwhile i < items.length {\n print items[i]\n i = i + 1\n}'), ['3','5','7']));
