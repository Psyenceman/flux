# UX-08 — Readable automation library (TEST)

2026-11-09. The status badges inherited a generic small-text color that clashed with their dark backgrounds. The library also rendered a card for every automation returned. Replaced cards with compact rows and distinct light badges. Name search and Active/Paused filters apply to the full loaded list before slicing it into pages of ten. Pagination resets on filter changes and clamps after a deletion. Saved automation selection and cloud access use the existing implementation.

This is display pagination. The existing Supabase query still loads the account’s automation records, including graphs. Server pagination and lazy graph fetching remain follow-up work for larger workspaces.

The 100-record fixture verifies all ten pages, search across page boundaries and combined status filtering. Deploy and browser acceptance will be recorded here.
