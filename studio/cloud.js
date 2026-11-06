import { supabaseUrl, supabasePublishableKey } from './supabase-config.js';

let client;
const editor = document.querySelector('#code');
const root = document.querySelector('#flux-account');
root.innerHTML = `
  <div class="cloud-bar">
    <strong>My Flux Cloud</strong>
    <span id="cloud-user">Not signed in · Local editor stays available</span>
    <button type="button" id="cloud-logout" hidden>Sign out</button>
  </div>
  <form id="cloud-login" class="cloud-form">
    <label>Email <input id="cloud-email" type="email" autocomplete="email" required></label>
    <label>Password <input id="cloud-password" type="password" autocomplete="current-password" minlength="8" required></label>
    <button type="submit" data-mode="login">Sign in</button>
    <button type="button" id="cloud-register">Create account</button>
  </form>
  <div id="cloud-projects" hidden>
    <div class="cloud-form">
      <label>Project name <input id="cloud-project-name" maxlength="120" placeholder="My first Flux project"></label>
      <button id="cloud-save" type="button">Save as new</button>
      <button id="cloud-update" type="button" disabled>Update selected</button>
      <button id="cloud-refresh" type="button">Refresh</button>
    </div>
    <label for="cloud-list">Your projects</label>
    <select id="cloud-list"><option value="">Select a project to load</option></select>
    <button id="cloud-load" type="button">Load selected into editor</button>
  </div>
  <p id="cloud-message" role="status" aria-live="polite"></p>
  <section id="flux-automations" hidden>
    <h3>My Automations <small>TEST · Drafts only, not running</small></h3>
    <p>Design automations linked to your Flux projects. Execution, scheduling and webhooks are not active yet.</p>
    <form id="automation-form" class="cloud-form">
      <label>Name <input id="automation-name" required maxlength="120" placeholder="Daily report"></label>
      <label>Project <select id="automation-project" required></select></label>
      <label>Trigger <select id="automation-trigger"><option value="manual">Manual</option><option value="schedule">Schedule (planned)</option><option value="webhook">Webhook (planned)</option></select></label>
      <label>Notes / trigger settings <input id="automation-notes" maxlength="500" placeholder="e.g. Every weekday at 09:00"></label>
      <button type="submit" id="automation-save">Create draft</button>
    </form>
    <div class="cloud-form">
      <label>Saved automations <select id="automation-list"><option value="">Select an automation</option></select></label>
      <button id="automation-delete" type="button" disabled>Delete draft</button>
      <button id="automation-refresh" type="button">Refresh</button>
    </div>
    <div class="automation-designer">
      <h4>Visual workflow builder <small>Draft designer</small></h4>
      <p>Choose a saved automation, add steps and save its visual workflow. Steps do not execute yet.</p>
      <div class="cloud-form">
        <label>Step type <select id="flow-step-type">
          <option value="condition">Condition</option>
          <option value="transform">Transform data</option>
          <option value="notify">Notification</option>
          <option value="http">HTTP request (planned)</option>
        </select></label>
        <label>Step label <input id="flow-step-label" maxlength="100" placeholder="Describe this step"></label>
        <button id="flow-add" type="button">Add step</button>
        <button id="flow-save" type="button" disabled>Save workflow</button>
      </div>
      <ol id="flow-steps" class="flow-steps"></ol>
      <p id="flow-status" role="status" aria-live="polite"></p>
    </div>
    <p id="automation-status" role="status" aria-live="polite"></p>
  </section>
`;
const $ = selector => root.querySelector(selector);
let session = null;
let selected = null;
let projects = [];
const message = text => { $('#cloud-message').textContent = text; };
function setSession(next) {
  session = next;
  $('#cloud-user').textContent = next?.user?.email || 'Not signed in · Local editor stays available';
  $('#cloud-login').hidden = !!next;
  $('#cloud-projects').hidden = !next;
  $('#cloud-logout').hidden = !next;
  $('#flux-automations').hidden = !next;
  if (!next) { projects = []; selected = null; $('#cloud-update').disabled = true; }
}
async function refresh() {
  if (!session) return;
  const { data, error } = await client.from('projects').select('id,name,updated_at').order('updated_at', { ascending: false });
  if (error) return message(error.message);
  projects = data || [];
  const list = $('#cloud-list');
  list.replaceChildren(new Option('Select a project to load', ''));
  for (const project of projects) list.add(new Option(project.name, project.id));
  if (selected && projects.some(p => p.id === selected)) {
    list.value = selected;
    $('#cloud-update').disabled = false;
  } else {
    selected = null;
    $('#cloud-update').disabled = true;
  }
  message(projects.length + ' cloud project(s) available.');
  const projectSelect = $('#automation-project');
  projectSelect.replaceChildren(new Option('Select a project', ''));
  for (const project of projects) projectSelect.add(new Option(project.name, project.id));
  await refreshAutomations();
}
async function authenticate(mode) {
  const email = $('#cloud-email').value.trim();
  const password = $('#cloud-password').value;
  if (!client) return message('Cloud connection is still loading.');
  const { error } = mode === 'register'
    ? await client.auth.signUp({ email, password })
    : await client.auth.signInWithPassword({ email, password });
  message(error ? error.message : mode === 'register' ? 'Account created. Check your email if confirmation is required.' : 'Signed in.');
}
$('#cloud-login').addEventListener('submit', event => { event.preventDefault(); authenticate('login'); });
$('#cloud-register').addEventListener('click', () => authenticate('register'));
$('#cloud-logout').addEventListener('click', async () => {
  const { error } = await client.auth.signOut();
  message(error?.message || 'Signed out. Your local draft is still available.');
});
$('#cloud-refresh').addEventListener('click', refresh);
$('#cloud-save').addEventListener('click', async () => {
  if (!session) return;
  const name = $('#cloud-project-name').value.trim();
  if (!name) return message('Enter a project name.');
  const { data, error } = await client.from('projects').insert({ owner_id: session.user.id, name, source_code: editor.value }).select('id').single();
  if (error) return message(error.message);
  selected = data.id;
  await refresh();
  message('Saved a new cloud project.');
});
$('#cloud-list').addEventListener('change', event => {
  selected = event.target.value || null;
  $('#cloud-update').disabled = !selected;
});
$('#cloud-load').addEventListener('click', async () => {
  selected = $('#cloud-list').value || selected;
  if (!selected) return message('Select a project first.');
  if (!window.confirm('Replace the current editor content? Save or download your local draft first.')) return;
  const { data, error } = await client.from('projects').select('name,source_code').eq('id', selected).single();
  if (error) return message(error.message);
  editor.value = data.source_code;
  editor.dispatchEvent(new Event('input'));
  $('#cloud-project-name').value = data.name;
  $('#cloud-update').disabled = false;
  message('Project loaded into the editor. You can now update this project.');
});
$('#cloud-update').addEventListener('click', async () => {
  selected = $('#cloud-list').value || selected;
  if (!selected) return message('Select a project first.');
  if (!window.confirm('Overwrite the selected cloud project with the current editor content?')) return;
  const name = $('#cloud-project-name').value.trim();
  if (!name) return message('Enter a project name.');
  const { error } = await client.from('projects').update({ name, source_code: editor.value, updated_at: new Date().toISOString() }).eq('id', selected);
  if (error) return message(error.message);
  await refresh();
  message('Cloud project updated.');
});

let automationRows = [];
const automationMessage = text => { $('#automation-status').textContent = text; };
async function refreshAutomations() {
  if (!session || !client) return;
  const { data, error } = await client.from('automations')
    .select('id,name,project_id,trigger_type,trigger_config,action_config,enabled,updated_at')
    .order('updated_at', { ascending: false });
  if (error) return automationMessage(error.message);
  automationRows = data || [];
  const list = $('#automation-list');
  list.replaceChildren(new Option('Select an automation', ''));
  for (const item of automationRows) {
    const project = projects.find(p => p.id === item.project_id);
    list.add(new Option(item.name + ' · ' + (project?.name || 'Project') + ' · Draft', item.id));
  }
  $('#automation-delete').disabled = true;
  $('#flow-save').disabled = true;
  flowSteps = [];
  renderFlow();
  automationMessage(automationRows.length + ' saved draft(s). All are inactive.');
}
$('#automation-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (!session || !client) return;
  const name = $('#automation-name').value.trim();
  const projectId = $('#automation-project').value;
  if (!name || !projectId) return automationMessage('Enter a name and choose a project.');
  const trigger = $('#automation-trigger').value;
  const notes = $('#automation-notes').value.trim();
  const { error } = await client.from('automations').insert({
    owner_id: session.user.id, project_id: projectId, name,
    trigger_type: trigger, trigger_config: { notes },
    action_config: { type: 'flux_project', project_id: projectId },
    enabled: false
  });
  if (error) return automationMessage(error.message);
  $('#automation-form').reset();
  await refreshAutomations();
  automationMessage('Automation draft saved. No execution was scheduled.');
});
$('#automation-list').addEventListener('change', event => {
  const item = automationRows.find(row => row.id === event.target.value);
  $('#automation-delete').disabled = !item;
  if (item) {
    $('#automation-name').value = item.name;
    $('#automation-project').value = item.project_id;
    $('#automation-trigger').value = item.trigger_type;
    $('#automation-notes').value = item.trigger_config?.notes || '';
    flowSteps = Array.isArray(item.action_config?.steps) ? item.action_config.steps.filter(step => ['condition','transform','notify','http'].includes(step.type)).map(step => ({ type: step.type, label: String(step.label || '').slice(0,100) })).slice(0,30) : [];
    renderFlow();
    $('#flow-save').disabled = false;
    automationMessage('Draft selected. Edit its steps below, then Save workflow.');
  }
});
$('#automation-delete').addEventListener('click', async () => {
  const id = $('#automation-list').value;
  if (!id || !window.confirm('Permanently delete this automation draft?')) return;
  const { error } = await client.from('automations').delete().eq('id', id);
  if (error) return automationMessage(error.message);
  await refreshAutomations();
  automationMessage('Automation draft deleted.');
});
$('#automation-refresh').addEventListener('click', refreshAutomations);


let flowSteps = [];
function renderFlow() {
  const list = $('#flow-steps');
  list.replaceChildren();
  if (!flowSteps.length) {
    const empty = document.createElement('li');
    empty.textContent = 'No steps yet. Add your first step.';
    list.append(empty);
  }
  flowSteps.forEach((step, index) => {
    const item = document.createElement('li');
    const label = document.createElement('span');
    label.textContent = (index + 1) + '. ' + step.type + ': ' + step.label;
    const up = document.createElement('button');
    up.type = 'button'; up.textContent = 'Move up'; up.disabled = index === 0;
    up.addEventListener('click', () => { [flowSteps[index - 1], flowSteps[index]] = [flowSteps[index], flowSteps[index - 1]]; renderFlow(); });
    const remove = document.createElement('button');
    remove.type = 'button'; remove.textContent = 'Remove';
    remove.addEventListener('click', () => { flowSteps.splice(index, 1); renderFlow(); });
    item.append(label, up, remove);
    list.append(item);
  });
}
$('#flow-add').addEventListener('click', () => {
  if (!$('#automation-list').value) return $('#flow-status').textContent = 'Select a saved automation first.';
  if (flowSteps.length >= 30) return $('#flow-status').textContent = 'Maximum 30 steps per draft.';
  const label = $('#flow-step-label').value.trim();
  if (!label) return $('#flow-status').textContent = 'Enter a step label.';
  flowSteps.push({ type: $('#flow-step-type').value, label });
  $('#flow-step-label').value = '';
  renderFlow();
  $('#flow-status').textContent = 'Unsaved changes. Click Save workflow.';
});
$('#flow-save').addEventListener('click', async () => {
  const id = $('#automation-list').value;
  const row = automationRows.find(item => item.id === id);
  if (!row) return $('#flow-status').textContent = 'Select a saved automation.';
  const action_config = { ...row.action_config, steps: flowSteps.map(step => ({...step})), version: 1 };
  const { error } = await client.from('automations').update({ action_config, enabled: false, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) return $('#flow-status').textContent = error.message;
  row.action_config = action_config;
  $('#flow-status').textContent = 'Workflow draft saved to Supabase. Execution remains disabled.';
});

async function initializeCloud() {
  try {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.49.10');
    client = createClient(supabaseUrl, supabasePublishableKey);
  } catch (error) {
    message('Unable to load Supabase client: ' + error.message + '. Check browser console / network policy.');
    $('#cloud-login').querySelectorAll('button').forEach(button => button.disabled = true);
    return;
  }
  client.auth.onAuthStateChange((_event, next) => {
  const oldId = session?.user?.id;
  setSession(next);
  if (next && oldId !== next.user.id) queueMicrotask(() => refresh());
});
const { data, error } = await client.auth.getSession();
if (error) message(error.message);
else { setSession(data.session); if (data.session) await refresh(); }
}
initializeCloud();
