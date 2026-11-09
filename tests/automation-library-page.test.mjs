import test from 'node:test';
import assert from 'node:assert/strict';
import {automationLibraryPage} from '../studio/automation-library-page.js';

const rows = Array.from({length: 100}, (_, i) => ({
 name: 'Workflow ' + (i + 1),
 enabled: i % 2 === 0
}));

test('100 automations are browsable across ten pages without gaps or duplicates', () => {
 const collected = [];
 for (let page = 1; page <= 10; page++) {
  const result = automationLibraryPage(rows, {page});
  assert.equal(result.pages, 10);
  assert.equal(result.items.length, 10);
  collected.push(...result.items);
 }
 assert.deepEqual(collected, rows);
});

test('search covers later pages, combines with status and clamps an invalidated page', () => {
 const result = automationLibraryPage(rows, {query: ' WORKFLOW 99 ', state: 'active', page: 10});
 assert.deepEqual(result.items, [rows[98]]);
 assert.equal(result.current, 1);
 assert.equal(automationLibraryPage(rows, {query: '99', state: 'paused'}).total, 0);
});
