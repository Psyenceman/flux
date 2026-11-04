import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { run, runWorkflow } from '../src/interpreter.js';

test('workflow traces named steps', () => {
  const code = ['workflow "Requests" {', ' step "Validate" {', '  approved = true', ' }', ' step "Report" {', '  print "ok"', ' }', '}'].join('\n');
  const result = runWorkflow(code);
  assert.deepEqual(result.output, ['ok']);
  assert.deepEqual(result.trace.filter(e => e.kind === 'step' && e.status === 'completed').map(e => e.label), ['Validate', 'Report']);
});

test('dry run traces safe execution', () => {
  const code = ['workflow "Test" {', ' step "Calculate" {', '  print 2 + 3', ' }', '}'].join('\n');
  const result = runWorkflow(code, true);
  assert.deepEqual(result.output, ['5']);
  assert.equal(result.trace.some(e => e.kind === 'workflow' && e.status === 'completed'), true);
});

test('reject steps outside workflow', () => {
  assert.throws(() => run(['step "Invalid" {', ' print 1', '}'].join('\n')), /step requires a workflow/);
});
