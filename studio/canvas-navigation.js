// Navigation is view-only: graph coordinates and cloud snapshots remain unchanged.
const viewport = document.getElementById('viewport');
const canvas = document.getElementById('canvas');
const readout = document.getElementById('zoom-value');
const MIN = 0.35, MAX = 2.5;
let zoom = 1, panning = null, spaceHeld = false;
window.fluxCanvasZoom = 1;
const clamp = n => Math.max(MIN, Math.min(MAX, n));
function applyZoom(next, clientX, clientY) {
  const rect = viewport.getBoundingClientRect();
  const x = (clientX ?? (rect.left + rect.width / 2)) - rect.left;
  const y = (clientY ?? (rect.top + rect.height / 2)) - rect.top;
  const graphX = (viewport.scrollLeft + x) / zoom;
  const graphY = (viewport.scrollTop + y) / zoom;
  zoom = clamp(next);
  window.fluxCanvasZoom = zoom;
  canvas.style.transform = 'scale(' + zoom + ')';
  readout.textContent = Math.round(zoom * 100) + '%';
  viewport.scrollLeft = graphX * zoom - x;
  viewport.scrollTop = graphY * zoom - y;
}
document.getElementById('zoom-in').addEventListener('click', () => applyZoom(zoom * 1.2));
document.getElementById('zoom-out').addEventListener('click', () => applyZoom(zoom / 1.2));
document.getElementById('zoom-reset').addEventListener('click', () => applyZoom(1));
document.getElementById('zoom-fit').addEventListener('click', () => {
  const nodes = [...canvas.querySelectorAll('.node')];
  if (!nodes.length) return applyZoom(1);
  const left = Math.min(...nodes.map(n => n.offsetLeft)) - 70;
  const top = Math.min(...nodes.map(n => n.offsetTop)) - 70;
  const right = Math.max(...nodes.map(n => n.offsetLeft + n.offsetWidth)) + 70;
  const bottom = Math.max(...nodes.map(n => n.offsetTop + n.offsetHeight)) + 70;
  const next = clamp(Math.min(viewport.clientWidth / (right - left), viewport.clientHeight / (bottom - top), 1));
  zoom = next;
  window.fluxCanvasZoom = next;
  canvas.style.transform = 'scale(' + next + ')';
  readout.textContent = Math.round(next * 100) + '%';
  viewport.scrollLeft = Math.max(0, (left + right) / 2 * next - viewport.clientWidth / 2);
  viewport.scrollTop = Math.max(0, (top + bottom) / 2 * next - viewport.clientHeight / 2);

  // The canvas can extend below the visible browser window.
  const rects = nodes.map(node => node.getBoundingClientRect());
  const visibleTop = Math.min(...rects.map(rect => rect.top));
  const visibleBottom = Math.max(...rects.map(rect => rect.bottom));
  if (visibleTop < 0 || visibleBottom > window.innerHeight) {
    window.scrollBy(0, (visibleTop + visibleBottom - window.innerHeight) / 2);
  }
});
viewport.addEventListener('wheel', event => {
  if (event.target.closest('input,select,textarea')) return;
  if (!event.metaKey && !event.altKey) return;
  event.preventDefault();
  applyZoom(zoom * Math.exp(-event.deltaY * 0.0012), event.clientX, event.clientY);
}, { passive: false });
document.addEventListener('keydown', event => {
  if (event.code === 'Space' && !['INPUT','TEXTAREA','SELECT','BUTTON'].includes(document.activeElement?.tagName)) {
    spaceHeld = true;
    if (event.target === document.body || viewport.contains(event.target)) event.preventDefault();
  }
});
document.addEventListener('keyup', event => { if (event.code === 'Space') spaceHeld = false; });
window.addEventListener('blur', () => { spaceHeld = false; panning = null; viewport.classList.remove('is-panning'); });
viewport.addEventListener('pointerdown', event => {
  // Workflow move mode owns primary-button drags; never steal its pointer capture.
  if (window.fluxMoveAll && event.button === 0 && !spaceHeld) return;
  if (event.button !== 0 && event.button !== 1) return;
  if (!spaceHeld && event.button !== 1 && event.target.closest('.node,button,input,select,textarea,.port')) return;
  panning = { id: event.pointerId, x: event.clientX, y: event.clientY, left: viewport.scrollLeft, top: viewport.scrollTop };
  viewport.classList.add('is-panning');
  viewport.setPointerCapture(event.pointerId);
  event.preventDefault();
});
viewport.addEventListener('pointermove', event => {
  if (!panning || panning.id !== event.pointerId) return;
  viewport.scrollLeft = panning.left - (event.clientX - panning.x);
  viewport.scrollTop = panning.top - (event.clientY - panning.y);
});
function endPan(event) {
  if (!panning || panning.id !== event.pointerId) return;
  panning = null;
  viewport.classList.remove('is-panning');
  if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
}
viewport.addEventListener('pointerup', endPan);
viewport.addEventListener('pointercancel', endPan);
// Start at actual size (100%); users may choose Fit manually.
requestAnimationFrame(() => applyZoom(1));
