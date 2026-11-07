# UX-03 — workspace and executable builder foundations
2026-11-07. TEST only. Baseline dc1b521.

## Changes
- Coherent violet/light workspace styling across dashboard, toolbar, canvas, nodes, palette and block modal, responsive layouts and reduced-motion treatment. Final stylesheet loads after legacy overlays.
- Guided Data Mapper name/value rows serialize the format the engine actually accepts. Reject invalid/duplicate field names; preserve upstream template resolution.
- Router now forwards its incoming payload to each outgoing branch; downstream conditions decide which branches continue. No automatic repeated loop execution claimed.
- Corrected modal engine contracts for Airtable, Google Sheets, HubSpot and Supabase. Existing API allowlists/credential restrictions are unchanged. Technical setup for those providers remains incomplete.
- Built-in starter now uses Manual → Mapper → Condition → Log; previous starter contained unimplemented external actions.
- Blank canvas action reuses existing graph restore with an unsaved-work confirmation. Palette annotates built-in, connection-dependent and unfinished integrations. Existing graph, drag/drop, OAuth, history and save handlers retained.

## Verification
108 Node tests pass; build:studio passes; syntax and whitespace checks pass. New engine integration tests cover starter execution and router fan-out/filtering. Published browser visual and authenticated flow checks pending.

## Still open
This does not complete every connector. Miro/Slack/email/Drive/GitHub/WordPress/WhatsApp/Discord/Notion/Calendar/Stripe/Shopify/OpenAI/Cloudflare and repeated loop execution remain incomplete. Several existing connector forms still require technical resource setup. No simulated provider response is presented as actual integration. Provider OAuth applications and owner-scoped resources must be integrated before calling those blocks operational. Stripe and per-block billing deferred by owner. Production excluded.

## Published browser verification
Deploy 6aef5e43b3d0e127ede56d72 ready at 245924dcfcaf9d912c5919f3c4b03a2003046561. Authenticated browser: opened Mapper guided form, saved, executed starter: 4 completed / 0 simulated / 0 skipped. Added Router using Log → plus → Router; executed modified graph: 5 completed / 0 simulated / 0 skipped. No external changes. Dashboard/canvas screenshot inspected at desktop size. Final polish strengthens cascade precedence for white nodes, hides destructive controls until hover/focus, removes duplicate new-canvas toolbar control and removes hardcoded Trello test message. Mobile visual QA and remaining external integrations are still open.
