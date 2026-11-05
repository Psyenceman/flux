/* Keep the visual editor above secondary tools; no functionality is removed. */
(()=>{
 const main=document.querySelector('#canvas-shell > main');
 const bar=main?.querySelector('.workspace-bar');
 const library=document.getElementById('flux-automation-library');
 const cloud=document.getElementById('canvas-cloud');
 const assistant=document.getElementById('flux-assistant-panel');
 const logs=document.getElementById('flux-automation-logs');
 const toolbar=main?.querySelector('.toolbar:not(#canvas-cloud)');
 const runner=document.getElementById('runner');
 const tools=main?.querySelector('.canvas-tools');
 const viewport=document.getElementById('viewport');
 if(!main||!bar||!library||!cloud||!assistant||!logs||!toolbar||!runner||!tools||!viewport)return;
 // Visual hierarchy: workspace > automation > actions > canvas > secondary tools.
 main.insertBefore(library,cloud);
 main.insertBefore(toolbar,cloud);
 main.insertBefore(tools,cloud);
 main.insertBefore(viewport,cloud);
 const drawer=(name,panel)=>{
  const details=document.createElement('details');details.className='flux-drawer';
  const summary=document.createElement('summary');summary.textContent=name;
  details.append(summary,panel);main.insertBefore(details,cloud);
  return details;
 };
 drawer('✦ Flux Assistant & Repair',assistant);
 const logsDrawer=drawer('Debug & execution history',logs);
 // Keep logs discoverable immediately after a run without hiding the canvas.
 window.addEventListener('flux:run-summary',()=>{logsDrawer.open=true;});
 // Runner remains available as part of execution workflow.
 main.insertBefore(runner,cloud);
})();
