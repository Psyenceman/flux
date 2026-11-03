import { run } from './dist/src/interpreter.js';
self.onmessage = event => {
  try {
    if (typeof event.data !== 'string' || event.data.length > 100000) throw new Error('Program is too large.');
    const lines = run(event.data);
    self.postMessage({ ok: true, message: lines.join('\n') || '(No output)' });
  } catch (error) {
    self.postMessage({ ok: false, message: error instanceof Error ? error.message : String(error) });
  }
};
