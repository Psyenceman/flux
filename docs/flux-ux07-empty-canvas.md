# UX-07 — Intentional empty canvas and soft blue workspace

2026-11-08. TEST only: Psyenceman/flux `test/trello-popup-feedback`, Netlify flux-studio-test, `studio/flow-canvas.html` built into `site`. Production excluded.

User observed a prefilled four-block automation without signing in. This came from an unconditional inline `example()` call, not account data. Fresh visits now render the existing empty graph and show the existing Add your first block CTA; this applies equally to guests and authenticated users. Saved cloud and local workflows are not deleted or rewritten and remain explicitly openable. The demo remains available through More actions → Load example, with its existing replacement confirmation. Existing loaded canvases are not cleared on signout.

Reused the existing empty-state and library instead of adding another onboarding flow. Replaced the canvas background with soft blue #edf4fc and subtle blue grid dots; surrounding workspace #f1f5fb. White blocks/panels and existing blue action contrast are retained. Grid is a visual aid, not required for execution.

Verification: build, existing regression suite, fresh-entry browser check (zero nodes, first-block CTA), explicit demo loading and saved workflow reopening to record after TEST deployment. No new tests for these bounded reversible edits; browser behavior and existing tests are the acceptance checks. Guest iCloud/account behavior remains as documented in UX-06, not part of this change.

## Published acceptance

188 tests passed; Studio build and whitespace checks passed. Initial source `7835e95f0400b81eae4c111980066adc3fc81e89`; small CSS follow-up `d6e3e7483fd29b8d01da3d6db97ef19ac91644c3` exposes the existing Load example button previously hidden by a generic toolbar rule. Final TEST deploy `6af0a870208d400c3479bb38` ready at the follow-up commit, exact match.

Browser guest QA used the immutable TEST deployment origin to obtain a genuinely unauthenticated session without signing the existing user out: Sign in visible, zero canvas nodes, Add your first block opens the library, computed viewport background rgb(237,244,252). More actions → Load example plus explicit confirmation loads exactly four nodes. Reload returns to zero nodes, confirming the example no longer auto-loads. Screenshot captured of the empty soft-blue canvas. In the existing authenticated TEST tab, reloaded and explicitly opened saved GitHub · Read issues · TEST: all five nodes restored. No cloud data was modified or deleted. Production untouched. Guest testing does not assert private-data isolation beyond these observed UI flows.
