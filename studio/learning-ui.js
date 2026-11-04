import { lessons, reference } from './learn.js';
const $ = selector => document.querySelector(selector);
const editor = $('#code');
let current = 0;
let lastRun = null;
let completed = [];
try { const saved = JSON.parse(localStorage.getItem('flux-lessons-v1') || '[]'); if (Array.isArray(saved)) completed = saved.filter(n => Number.isInteger(n) && n >= 1 && n <= lessons.length); } catch {}
function view(name) {
  for (const section of ['editor','learn','docs']) $('#view-' + section).hidden = section !== name;
  for (const tab of document.querySelectorAll('[data-view]')) {
    const active = tab.dataset.view === name;
    tab.classList.toggle('active', active);
    if (active) tab.setAttribute('aria-current','page'); else tab.removeAttribute('aria-current');
  }
}
document.querySelectorAll('[data-view]').forEach(tab => tab.addEventListener('click', () => view(tab.dataset.view)));
function renderLesson() {
  const lesson = lessons[current];
  $('#lesson-title').textContent = lesson.title;
  $('#lesson-number').textContent = 'Lesson ' + lesson.id;
  $('#lesson-description').textContent = lesson.description;
  $('#lesson-example').textContent = lesson.example;
  $('#lesson-challenge').textContent = lesson.challenge;
  $('#lesson-solution').textContent = lesson.solution;
  $('#lesson-solution').hidden = true;
  $('#show-solution').textContent = 'Show solution';
  $('#lesson-progress').textContent = completed.length + ' / ' + lessons.length;
  const list = $('#lesson-list');
  list.replaceChildren();
  lessons.forEach((item, index) => {
    const button = document.createElement('button');
    button.className = 'lesson-link' + (index === current ? ' selected' : '');
    button.textContent = (completed.includes(item.id) ? '✓ ' : '') + item.id + '. ' + item.title;
    button.addEventListener('click', () => { current = index; renderLesson(); });
    list.append(button);
  });
}
$('#try-lesson').addEventListener('click', () => {
  editor.value = lessons[current].example;
  editor.dispatchEvent(new Event('input'));
  $('#check-lesson').hidden = false;
  $('#check-lesson').dataset.lesson = String(lessons[current].id);
  view('editor');
  editor.focus();
});
$('#show-solution').addEventListener('click', () => {
  const el = $('#lesson-solution'); el.hidden = !el.hidden;
  $('#show-solution').textContent = el.hidden ? 'Show solution' : 'Hide solution';
});
window.addEventListener('flux:result', event => { lastRun = event.detail; });
$('#check-lesson').addEventListener('click', () => {
  const lesson = lessons.find(l => l.id === Number($('#check-lesson').dataset.lesson));
  if (!lesson) return;
  if (!lastRun || lastRun.source !== editor.value) { $('#output').textContent = 'Run your current code first, then check the challenge.'; return; }
  if (lastRun.failed) { $('#output').textContent += '\nFix the error and run again before checking.'; return; }
  if (lastRun.message.trim() === lesson.expected.trim()) {
    if (!completed.includes(lesson.id)) completed.push(lesson.id);
    try { localStorage.setItem('flux-lessons-v1', JSON.stringify(completed)); } catch {}
    $('#status').textContent = 'Challenge complete!';
    $('#output').textContent += '\n✓ Challenge complete! Open Learn for the next lesson.';
    renderLesson();
  } else {
    $('#output').textContent += '\nNot quite. Expected output: ' + lesson.expected.replaceAll('\n',' | ') + '. Try again.';
  }
});
function renderDocs() {
  const query = $('#docs-search').value.toLowerCase().trim();
  const list = $('#docs-list'); list.replaceChildren();
  for (const item of reference.filter(x => (x.title + x.syntax + x.detail).toLowerCase().includes(query))) {
    const card = document.createElement('article'); card.className = 'panel doc-card';
    const title = document.createElement('h2'); title.textContent = item.title;
    const syntax = document.createElement('pre'); syntax.className = 'code-example'; syntax.textContent = item.syntax.replaceAll('\\n','\n');
    const description = document.createElement('p'); description.textContent = item.detail;
    const copy = document.createElement('button'); copy.className = 'secondary'; copy.textContent = 'Copy example';
    copy.addEventListener('click', () => navigator.clipboard?.writeText(syntax.textContent));
    card.append(title,syntax,description,copy); list.append(card);
  }
  if (!list.childElementCount) list.textContent = 'No matching commands.';
}
$('#docs-search').addEventListener('input', renderDocs);
renderLesson(); renderDocs();
