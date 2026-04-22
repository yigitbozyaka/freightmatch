# apps/web — FreightMatch Web UI

Next.js 15 (App Router) + Tailwind CSS v4 frontend for the FreightMatch monorepo.

## Scripts

| Command | Description |
|---|---|
| `pnpm --filter web dev` | Start dev server on `localhost:3000` |
| `pnpm --filter web build` | Production build |
| `pnpm --filter web lint` | ESLint |
| `pnpm --filter web typecheck` | TypeScript strict check |

From the monorepo root, `pnpm dev` runs all services + web in parallel.

## Design tokens (Tailwind v4 `@theme`)

### Slate palette
| Token | Value |
|---|---|
| `slate-950` | `#0A0E12` |
| `slate-900` | `#121820` |
| `slate-800` | `#1C2430` |
| `slate-700` | `#2A3441` |

### Amber palette
| Token | Value |
|---|---|
| `amber-400` | `#F5B342` |
| `amber-500` | `#E89B1F` |

### Semantic tokens
| Token | Value | Usage |
|---|---|---|
| `--color-danger` | `#E5484D` | Errors, rejected states |
| `--color-go` | `#3DD68C` | Success, active, delivered |
| `--color-transit` | `#4FA3E3` | In-transit, pending |

Use semantic tokens in Tailwind via arbitrary values: `bg-[--color-danger]`, `text-[--color-go]`.

## Fonts

- **JetBrains Mono** — display headings + monospaced data (`var(--font-display)` / `var(--font-mono)`)
- **Geist** — body copy (`var(--font-sans)`)

## Dev routes

- `/_kitchen` — design system kitchen sink (dev-only, filled in by DS1/DS2/DS3 issues)
