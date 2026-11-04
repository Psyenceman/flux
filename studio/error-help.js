export function explainError(message) {
  const line = /^Line (\d+):\s*(.*)$/s.exec(message);
  const detail = line ? line[2] : message;
  const location = line ? Number(line[1]) : null;
  let hint = 'Check the command syntax and compare it with the Documentation examples.';
  if (/unknown variable/.test(detail)) hint = 'This variable has not been assigned yet. Check its spelling or define it first with name = value.';
  else if (/unknown function/.test(detail)) hint = 'Define the function before calling it. Example: function greet(name) { print name } (put each command on its own line).';
  else if (/unknown statement/.test(detail)) hint = 'Flux supports print, assignments, if, while and function calls. Check spelling and punctuation.';
  else if (/missing closing brace/.test(detail)) hint = 'Add a closing } for every if, while or function block.';
  else if (/unexpected closing brace/.test(detail)) hint = 'Remove the extra } or check where the block begins.';
  else if (/division by zero/.test(detail)) hint = 'The divisor cannot be zero. Check the value before dividing.';
  else if (/arithmetic and ordering require numbers/.test(detail)) hint = 'Math and ordering comparisons work with numbers. Check whether a value is text.';
  else if (/requires a boolean condition/.test(detail)) hint = 'Use a comparison such as count > 0, not just a number or string.';
  else if (/expects \d+ arguments/.test(detail)) hint = 'Check the number of arguments passed to the function.';
  else if (/execution limit exceeded|timed out/.test(detail)) hint = 'Check whether your while loop changes its condition so it can stop.';
  else if (/maximum function call depth/.test(detail)) hint = 'A function may be calling itself repeatedly. Flux limits nested calls.';
  else if (/Unable to load Flux runtime/.test(detail)) hint = 'Refresh the page. If the problem persists, check the latest deployment.';
  return { line: location, hint };
}
