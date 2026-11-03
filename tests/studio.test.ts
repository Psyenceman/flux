import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';

test('Studio entrypoint and assets exist', () => {
  for (const path of ['studio/index.html', 'studio/style.css', 'studio/app.js', 'studio/runner.js', 'dist/src/interpreter.js', 'dist/src/parser.js']) {
    assert.equal(existsSync(path), true, `Missing ${path}`);
  }
});
test('Studio worker loads the compiled Flux interpreter', () => {
  const worker = readFileSync('studio/runner.js', 'utf8');
  assert.match(worker, /import \{ run \} from '\.\.\/dist\/src\/interpreter\.js'/);
});
test('Studio has code execution and accessible output', () => {
  const html = readFileSync('studio/index.html', 'utf8');
  assert.match(html, /id="code"/);
  assert.match(html, /id="run"/);
  assert.match(html, /id="output"/);
  assert.match(html, /aria-live="polite"/);
});
