// UI-only enhancements. Keep existing event handlers, IDs and workflow semantics.
const bar = document.querySelector('main > .toolbar:not(#canvas-cloud)');
if (bar) {
  bar.classList.add('compact-actions');
  const action = (id, label, icon) => {
    const button = document.getElementById(id);
    if (!button) return null;
    button.textContent = '';
    const mark = document.createElement('span');
    mark.className = 'action-icon'; mark.textContent = icon;
    const text = document.createElement('span'); text.textContent = label;
    button.append(mark, text);
    return button;
  };
  action('save','Save','▣');
  action('load','Open','▤');
  action('export','Export JSON','⇩');
  action('import','Import JSON','⇧');
  action('validate','Validate','✓');
  action('execute','Test workflow','▶');
  action('reset','Reset example','↺');
  const file = document.getElementById('file');
  const group = (title, ids, extraClass = '') => {
    const wrapper = document.createElement('div');
    wrapper.className = 'action-group '+extraClass;
    wrapper.setAttribute('aria-label',title);
    for (const id of ids) {
      const button = document.getElementById(id);
      if (button) wrapper.append(button);
    }
    return wrapper;
  };
  const save = group('Save and open',['save','load'],'main-actions');
  const validate = group('Workflow actions',['flux-add-block','validate','execute','flux-run-live'],'run-actions');
  const more = document.createElement('details');
  more.className = 'more-actions';
  const summary = document.createElement('summary');
  summary.textContent = 'More actions ···';
  more.append(summary,group('File tools',['import','export','reset']));
  bar.replaceChildren(save,validate,more);
  if (file) bar.append(file);
}
const cloud = document.getElementById('canvas-cloud');
if (cloud) {
  cloud.classList.add('compact-cloud');
  const label = document.createElement('strong');
  label.textContent = 'Cloud';
  cloud.prepend(label);
  const load = document.getElementById('canvas-cloud-load');
  const save = document.getElementById('canvas-cloud-save');
  if (load) load.textContent = 'Open cloud';
  if (save) save.textContent = 'Save cloud';
}
