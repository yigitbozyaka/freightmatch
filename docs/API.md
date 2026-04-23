# API Reference — FreightMatch

This document explains how to work with the FreightMatch OpenAPI specifications and the hosted documentation site.

**Hosted API docs (Scalar):**
| Service | Link |
|---------|------|
| User Service | https://yigitbozyaka.github.io/freightmatch/ |
| Load Service | https://yigitbozyaka.github.io/freightmatch/ |
| Bidding Service | https://yigitbozyaka.github.io/freightmatch/ |
| Matching Service | https://yigitbozyaka.github.io/freightmatch/ |

---

## Local Preview

No build step required. Serve the `docs-site/` directory with any static file server:

```bash
# From the repo root
npx serve docs-site
# Then open http://localhost:3000
```

Scalar loads the four service specs from `docs-site/specs/*.yaml` and renders a full interactive UI.

---

## Spec Authoring Workflow

1. **Edit** the relevant YAML file under `docs-site/specs/`:
   - `user-service.yaml` — Port 3001
   - `load-service.yaml` — Port 3002
   - `bidding-service.yaml` — Port 3003
   - `matching-service.yaml` — Port 3004

2. **Lint** locally before committing:
   ```bash
   npx @redocly/cli lint docs-site/specs/*.yaml
   ```

3. **Open a Pull Request** — CI runs the same lint check automatically.

4. **Merge to `master`** — the `deploy-docs` GitHub Actions workflow publishes the updated site to GitHub Pages.

---

## Lint Command

```bash
# Lint a single spec
npx @redocly/cli lint docs-site/specs/user-service.yaml

# Lint all specs at once
npx @redocly/cli lint docs-site/specs/*.yaml
```

Zero errors is the acceptance criterion before merging.

---

## One-Time GitHub Pages Setup

This only needs to be done once per repository:

1. Go to the repository on GitHub.
2. Navigate to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Push any change to `docs-site/` on `master` — the `deploy-docs` workflow handles the rest.

---

## Specs Are Source of Truth

The YAML specs in `docs-site/specs/` are the canonical API contracts for all four services. They should be updated whenever:

- A new route is added to a service.
- Request/response shapes change.
- Auth requirements change.
- Rate limits change.

No service source code should be modified to generate these specs — all authoring is done by hand.
