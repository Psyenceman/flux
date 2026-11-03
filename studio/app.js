const examples = {
  hello: '# Your first Flux program\nname = "World"\nprint "Hello, {name}!"\n',
  discount: '# A simple business rule\ncustomer = "Ada"\ntotal = 120\ndiscount = 20\nif total >= 100 {\n  final = total - discount\n} else {\n  final = total\n}\nprint "Total for {customer}: {final}"\n',
  loop: 'count = 5\nwhile count > 0 {\n  print count\n  count = count - 1\n}\nprint "Go!"\n',
  functions: 'function greet(name) {\n  print "Hello, {name}!"\n}\ngreet("Ada")\ngreet("Luca")\n'
};
const editor = document.querySelector('#code');
const output = document.querySelector('#output');
const status = document.querySelector('#status');
const runButton = document.querySelector('#run');
const selector = document.querySelector('#examples');
const key = 'flux-studio-code-v1';
try { editor.value = localStorage.getItem(key) ?? examples.hello; } catch { editor.value = examples.hello; }
editor.addEventListener('input', () => { try { localStorage.setItem(key, editor.value); } catch {} });
selector.addEventListener('change', () => { editor.value = examples[selector.value]; editor.dispatchEvent(new Event('input')); });
document.querySelector('#reset').addEventListener('click', () => { editor.value = examples[selector.value]; editor.dispatchEvent(new Event('input')); });
document.querySelector('#download').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([editor.value], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = 'main.flux'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
let activeWorker = null;
function run() {
  if (activeWorker) activeWorker.terminate();
  const worker = new Worker('./runner.js', { type: 'module' });
  activeWorker = worker;
  runButton.disabled = true;
  status.textContent = 'Running…';
  output.classList.remove('error');
  output.textContent = '';
  const timeout = setTimeout(() => finish('Execution timed out (2 seconds). Check for an infinite loop.', true), 2000);
  function finish(message, failed) {
    if (activeWorker !== worker) return;
    clearTimeout(timeout); worker.terminate(); activeWorker = null;
    runButton.disabled = false;
    output.textContent = message;
    output.classList.toggle('error', failed);
    status.textContent = failed ? 'Error' : 'Finished';
  }
  worker.onmessage = event => {
    if (event.data && typeof event.data.message === 'string' && typeof event.data.ok === 'boolean') finish(event.data.message, !event.data.ok);
    else finish('Invalid worker response.', true);
  };
  worker.onerror = () => finish('Unable to load Flux runtime. Build the project and serve its root directory over HTTP.', true);
  worker.postMessage(editor.value);
}
runButton.addEventListener('click', run);
editor.addEventListener('keydown', event => {
  if (event.key === 'Tab') {
    event.preventDefault(); const start = editor.selectionStart; const end = editor.selectionEnd;
    editor.setRangeText('  ', start, end, 'end'); editor.dispatchEvent(new Event('input'));
  }
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); run(); }
});
