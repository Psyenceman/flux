# Flux UX-01 — TEST milestone audit and acceptance

## Scope
- Product: international visual automation SaaS; English default, Italian optional.
- GitHub: Psyenceman/flux, branch test/trello-popup-feedback.
- Active TEST editor: studio/flow-canvas.html, not an unused demo page.
- TEST Netlify site: flux-studio-test.netlify.app.
- Production flux.flussia.it: explicitly out of scope.

## Audit findings
1. Active canvas is a large legacy HTML/JS entrypoint augmented by multiple overlay scripts/styles; regressions can occur from cascade and initialization order.
2. Existing canvas-workspace-ui.js already provides navigation, a block picker, and test results; UX-01 extends it without replacing graph state.
3. canvas-guided-operations.js still exposes raw JSON and provider-specific identifiers; future work must replace these with form controls and authenticated resource pickers.
4. flux-graph-engine.mjs accepts 33 block types, but only 16 have explicit executor branches; missing connectors currently return skipped, not an actual integration.
5. FluxCoins UI estimates per completed block, but backend charging has not been reconciled to per-block pricing. Never claim the estimate equals actual debit.
6. Live actions are deliberately restricted in TEST. UX changes must not silently unlock remote writes.

## UX-01 changes
- studio/canvas-milestone-ux01.js: localized introduction, EN/IT switch, simplified labels, safe test feedback, collapsible advanced JSON input, truthful picker availability.
- studio/canvas-milestone-ux01.css: premium light responsive design, focus states, reduced motion.
- studio/flow-canvas.html: imports both assets after the existing UI layers.

## Verification checklist
- [x] GitHub TEST files created and referenced by active entrypoint.
- [x] Code inspection: runner retains existing JSON input and dry-run checkbox, now moved to Advanced settings.
- [x] Code inspection: existing execution endpoint and authentication untouched.
- [x] Code inspection: no change to FluxCoins debit, DB, PROD, or external live permissions.
- [ ] Netlify deployment ready (verify after build).
- [ ] Browser visual smoke: desktop/mobile, EN/IT, Add a step, Advanced settings.
- [ ] Authenticated E2E: Manual Trigger -> Log, dry-run result, wallet verification.
- [ ] Cross-browser keyboard/accessibility pass.

## Next milestone
UX-02: guided configuration with provider resource pickers, clear connection states, and tested flows; do not implement unsupported connectors as cosmetic placeholders.
