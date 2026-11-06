# Trello OAuth — TEST checklist

Environment: flux-studio-test.netlify.app only. Production is excluded.

- [x] OAuth app configured by project owner.
- [x] Trello permissions selected.
- [x] Netlify client ID and secret detected by status endpoint.
- [ ] Verify OAuth 2.0 scopes against Atlassian documentation.
- [ ] Implement state, PKCE and callback with one-time validation.
- [ ] Add encrypted token storage and owner-based authorization in TEST database.
- [ ] Implement token refresh and revocation.
- [ ] Add Connect Trello button and connection selector in Studio.
- [ ] Test reading boards with a real signed-in user.
- [ ] Review permissions and security before any production release.

Do not place tokens or client secrets in the browser, graph exports, logs or this repository. The status endpoint is not evidence of an operational OAuth flow.
