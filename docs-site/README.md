# FreightMatch API Docs Site

Static [Scalar](https://scalar.com/) API reference site for all four FreightMatch microservices.

**Hosted:** https://yigitbozyaka.github.io/freightmatch/

---

## Local Preview

```bash
# From the repo root
npx serve docs-site
# Then open http://localhost:3000
```

No build step required — Scalar is loaded from CDN.

---

## One-Time GitHub Pages Setup

1. Go to the repository on GitHub.
2. **Settings → Pages → Source → GitHub Actions**
3. Merge any change to `docs-site/` on `master` — the `deploy-docs` workflow handles the rest.

---

## Spec Authoring Workflow

1. Edit the relevant YAML file under `docs-site/specs/`.
2. Lint locally before pushing:
   ```bash
   npx @redocly/cli lint docs-site/specs/*.yaml
   ```
3. Open a Pull Request → CI lints the specs automatically.
4. Merge to `master` → `deploy-docs` workflow publishes the updated site.

---

## Specs

| File | Service | Port |
|------|---------|------|
| `specs/user-service.yaml` | User Service | 3001 |
| `specs/load-service.yaml` | Load Service | 3002 |
| `specs/bidding-service.yaml` | Bidding Service | 3003 |
| `specs/matching-service.yaml` | Matching Service | 3004 |
