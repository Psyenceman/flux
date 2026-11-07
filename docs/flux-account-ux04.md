# UX-04 — account access and contrast repair
2026-11-07. TEST only; baseline f7e80c7.

## Fixes
FCX Sign in was a strong text element with no handler. It is now an accessible button; when signed out it opens the account dialog. Add FCX and the compact wallet badge also route guests to account access. Signed-in balance opens existing wallet details.

Account module mounts in active canvas, shares the existing Supabase client from canvas-cloud.js and existing storage. Email/password login, actionable error states, cleared password fields, session restoration and sign-out. Private overview loads verified user email and owner-scoped plan/wallet rows through existing RLS. It does not create fictitious plan entitlements or enable purchases. Missing plan/wallet records and network errors are displayed explicitly. No new auth store, service key or DB schema.

Palette: neutral surfaces and blue action accent; dashboard hero uses navy with explicit white heading and light copy; removes purple decorative layers and fixes heading/background contrast. Accessible focus styles, mobile dialog dimensions retained.

## Validation
117 automated tests pass, Studio build passes. Login tests verify client reuse, credential validation and safe actionable errors. Published browser checks pending. No production changes. Signup/reset, full IT localization of new account dialog and paid subscription management remain separate work.

## Published browser QA
Deploy 6aef61a286109342208b5277 ready at a639db0. Account button opened verified signed-in identity. Sign out completed; private account section hidden and sign-in form displayed. Closed account dialog then clicked FCX balance button: sign-in form opened correctly. No credential submission required for these checks. Follow-up fixes use server-authorized coins event for unlimited Super Admin display and clear old automation options / wallet progress accessibility values after logout. 117 tests and build pass after these changes. Final palette removes remaining purple primary actions. Real login through new dialog remains separately unverified (existing session restored for signed-in QA).
