import { runWorkflow } from './dist/src/interpreter.js';
self.onmessage = event => {
  try {
    const payload = event.data;
    const source = typeof payload === 'string' ? payload : payload?.source;
    const dryRun = typeof payload === 'object' && payload?.dryRun === true;
    if (typeof source !== 'string' || source.length > 100000) throw new Error('Program is too large.');
    const result = runWorkflow(source, dryRun);
    self.postMessage({ok:true,message:result.output.join('\n') || '(No output)',trace:result.trace});
  } catch (error) {
    self.postMessage({ok:false,message:error instanceof Error?error.message:String(error)});
  }
};
