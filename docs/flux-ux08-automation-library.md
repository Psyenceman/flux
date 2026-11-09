# UX-08 — Readable automation library (TEST)

2026-11-09. The status badges inherited a generic small-text color that clashed with their dark backgrounds. The library also rendered a card for every automation returned. Replaced cards with compact rows and distinct light badges. Name search and Active/Paused filters apply to the full loaded list before slicing it into pages of ten. Pagination resets on filter changes and clamps after a deletion. Saved automation selection and cloud access use the existing implementation.

This is display pagination. The existing Supabase query still loads the account’s automation records, including graphs. Server pagination and lazy graph fetching remain follow-up work for larger workspaces.

The 100-record fixture verifies all ten pages, search across page boundaries and combined status filtering. Deploy and browser acceptance will be recorded here.

TEST deploy `6af17b2184e66ffb7de9dc2a` ready at `44fe09b11a14c01b246e844cb20cc6b671bdf44b`. Build and 190 tests passed. Calculated badge contrast 7.70:1 (Active) and 8.77:1 (Paused). Browser smoke test as guest verified the published page and hidden library controls. Authenticated visual acceptance remains pending because the browser had no active session.
