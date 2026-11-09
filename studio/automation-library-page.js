export const AUTOMATIONS_PER_PAGE = 10;

export function automationLibraryPage(rows, { query = '', state = 'all', page = 1 } = {}) {
 const needle = query.trim().toLowerCase();
 const matches = rows.filter(row => {
  const matchesName = row.name.toLowerCase().includes(needle);
  const matchesState = state === 'all' || Boolean(row.enabled) === (state === 'active');
  return matchesName && matchesState;
 });
 const pages = Math.max(1, Math.ceil(matches.length / AUTOMATIONS_PER_PAGE));
 const current = Math.min(pages, Math.max(1, page));
 const offset = (current - 1) * AUTOMATIONS_PER_PAGE;
 return { items: matches.slice(offset, offset + AUTOMATIONS_PER_PAGE), current, pages, total: matches.length, offset };
}
