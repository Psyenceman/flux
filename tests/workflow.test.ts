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

test('planned actions are traceable without side effects', () => {
  const source = ['workflow "Lead" {',' step "Notify" {','  customer = {email: "ada@example.com"}','  plan "send-email" with {to: customer.email, subject: "Welcome"}',' }','}'].join('\n');
  const result = runWorkflow(source,true);
  const action = result.trace.find(event => event.kind === 'action');
  assert.equal(action?.status,'planned');
  assert.equal(action?.label,'send-email');
  assert.match(action?.detail || '', /ada@example.com/);
});
test('planned actions outside workflow are rejected', () => {
  assert.throws(() => run('plan "send-email" with {to: "a"}'), /plan requires a workflow/);
});
