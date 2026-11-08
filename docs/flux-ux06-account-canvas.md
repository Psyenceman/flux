# UX-06 — Account autofill and workflow decisions (TEST)

2026-11-08. Repository Psyenceman/flux, branch `test/trello-popup-feedback`; deployed entrypoint `studio/flow-canvas.html`, build `npm run build:studio` → `site`. TEST Netlify site c1eb0566-bafe-4ab0-adf1-15581093ccbb. Production excluded. Builds on the TEST branch do not target flux.flussia.it.

## User report and findings

The supplied screenshot shows registration copy (Create your Flux account), not sign-in. Registration intentionally uses `new-password`, while sign-in uses `current-password`. The old modal retained signup mode across close/reopen, making the ordinary account entry confusing. Inputs lacked stable name/id attributes. A delayed guest `getUser()` response cleared the password, including a value filled after the modal opened. These are concrete code defects; the user's iCloud extension/Keychain behavior cannot be observed in the remote browser and is not claimed verified.

## Account changes

- Stable form and input names/ids, associated labels, POST form semantics, username/current-password hints, no email autocapitalization/spellcheck.
- Explicit Sign in to Flux / Create your account headings; reopening starts at sign-in, account overview remains available after authentication.
- Guest session refresh no longer clears a password entered or autofilled while loading. Closing invalidates pending rendering and clears passwords. Actual mode changes, logout and submit completion still clear the secret. No credentials are saved by Flux UI or logged.
- Uses the existing Supabase client, uniqueness handling and auth store. No database/auth settings changed; no account discovery endpoint or list of users exposed. A site's form cannot enumerate a user's saved iCloud accounts. Other sites' saved credentials must not be treated as valid Flux accounts.

HTML autocomplete semantics checked against https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/autocomplete (name/id, owning form and submit semantics; current-password vs new-password). Supabase API usage is unchanged.

## Canvas changes

Shared accessible in-product dialogs replace native prompts/confirms on the primary new-draft, saved-card open, primary save naming, rename and legacy new-scenario paths. Keyboard submit, Escape/cancel, initial focus and focus return are supported; concurrent decisions cannot replace an active prompt; all text uses textContent.

New drafts clear the selected cloud automation only after confirmed canvas restore, so saving a fresh draft cannot overwrite the previous selection. Cancelled opening leaves the selection unchanged. Primary save now adds/selects the newly created dropdown option; repeated Save updates the same record instead of creating another. Async account-change guards protect naming/open/save decisions. Save remains a disabled draft and does not activate execution.

Ordinary execution summary uses human block names and distinguishes actual completed reads from simulated writes. Technical ids and raw outputs remain in advanced logs. Estimated FCX is still explicitly a preview, not a claim of actual debit. Existing native confirmations for destructive administration, activation and advanced webhook actions are preserved.

## Verification

188 automated tests passed before deployment, including seven added regressions for stable auth metadata, late guest-session autofill preservation, reopening after signup, workflow cancellation/focus, whitespace name rejection, concurrent dialogs and explicit confirmation. Existing registration duplicate handling and connector tests pass. Build and whitespace checks passed.

Browser acceptance to record after deployment: primary dialogs, cancellation, saved workflow selection, repeated-save behavior; account sign-in metadata, signup/close/reopen, actual sign-in if credentials supplied securely. The macOS iCloud saved-account popup requires user verification on the Mac; remote-browser secure credential entry does not establish iCloud acceptance. No new real provider write is part of this milestone.

## Published acceptance — 2026-11-08

Source `097ea631fe435e4398005ab34a26859a186371dc`; TEST deploy `6af0a6817ff5cec1e585043a` ready at the exact commit. Production remains on `6aedc72f553859dcc804e34c` (read-only verification, unchanged).

Browser PASS: new-draft modal and Cancel; saved GitHub card opening modal; cancelling opening leaves cloud selection empty/unchanged; confirming restores the saved graph. Starting Blank canvas then confirming clears the prior cloud selection and graph. Added a Manual Trigger to a separate draft. Cancelled its Save naming dialog with no record created. Created paused `UX-06 · Canvas check`: dropdown increased from five to six options (placeholder included), selected the new record; repeated Save preserved the same selected record and count. Existing GitHub workflow and other saved automations remain intact. No external provider writes or trigger activation.

Account browser PASS: signed out of TEST session, switched to Create account without submitting registration, closed/reopened from Sign in. The heading returned to Sign in to Flux; inputs exposed stable email/password ids and username/current-password hints. Secure credential request completed real sign-in; account overview showed the original Super Admin TEST user. No registration or password reset was performed and no credentials were inspected. Browser session left signed in. Native iCloud password chooser acceptance remains to be verified on the user Mac.

Reopened the saved UX-06 draft after login and ran it: one completed Manual trigger, zero simulated/filtered/skipped, success summary with the revised copy and human block label. Screenshot captured of successful authenticated account overview. Mobile viewport and iCloud chooser are not claimed tested.

Local source synchronization used a reversible path-scoped stash backup and fast-forward merge. An attempted hard-reset synchronization was rejected by automatic approval review; it was not retried. All authored changes were preserved.
