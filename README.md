# Sete · Andebol português

A simple Portuguese handball results app: seasons, men's/women's national
competitions (including PO01, PO01A, PO02, PO03), phases/zones, recorded results,
upcoming fixtures, standings and a dedicated page for each match. Search teams
without accent sensitivity; share/reload the selected season, competition and phase
via URL parameters. A match lives at `/jogo/[id]`, with those filters kept in the
query; an older `match` query redirects there. Historical seasons are discovered
from FPA, not hard-coded.
No other sports, news, accounts, notifications or odds.

## Stack and boundaries

Matches prociv-app/ipma-weather: Next.js 16.4.6 App Router, React 19.3.1, Bun 1.4.4,
Astryx 0.7.13, StyleX, TanStack DB/Query live collections, Hono typed HTTP routes,
server-only Connect/Protobuf-ES native HTTP/2 gRPC, and Node 24 on Vercel. XState v5
with @xstate/react controls dependent navigation, resetting invalid competition,
phase and match choices on season, gender and phase changes. Opening a match is a
route, not a sheet.
One tab-level TanStack Query cache backs the live collections for results and
matches. Document loads seed it with server-rendered data; client navigation
reuses the last successful entry for the exact board or match. An entry becomes
stale after 10 seconds and can refresh in the background while its data stays
visible. Inactive entries expire after five minutes. Reloading the browser or
opening a new tab starts a new cache.

```text
browser → Next.js/Hono → fpa-gateway (tonic/Moka) → fpa-proxy (tonic/Progenitor) → FPA
```

The browser calls `/api/board` for results and `/api/match/:id` for match sheets.
Generated protobuf, gRPC transport, configured backend origin and federation
HTTP clients remain server-only. The app never falls back to fixture data.
Tests use a separately launched gRPC fixture server.
Source schema provenance is recorded in proto/README.md.

## Run

Start fpa-proxy on 50201, then fpa-gateway on 50202 with `rtk cargo run --locked`
in their checkouts, or use pinned-source Compose from fpa-infra.

```sh
rtk bun install --frozen-lockfile
rtk proxy cp .env.example .env.local
rtk bun run dev
```

Open http://127.0.0.1:3200. FPA_GRPC_URL is server-only and defaults to the local
gateway. A custom hosted URL must be a TLS-verified native gRPC origin. gRPC-Web
and browser access to the Rust services are not needed. Builds require no running
backend: a static loading shell streams the request-time result view.
Each resource load has one 25-second budget across all of its gRPC calls.
`FPA_RPC_BUDGET_MS` can set a smaller server-side budget.

## History and live data

The initial view shows recent recorded results. Use Mostrar to select future/all
fixtures. Full phase calendars are loaded, with progressive display for long
seasons. Tables show zero as zero and missing values as —. Match pages include
published period scores, squads, player goals/sanctions and assigned officials,
with the boletim and the match record on separate tabs.
Unpublished/empty squads and missing matches have explicit states.

The browser refreshes the visible results board or match sheet every 15 seconds
and on focus. On a match page, the server loads competition context separately
on navigation and displays it only when the phase contains the match. Polling
the sheet does not reload the competition context. The gateway caches phases
15 seconds and match sheets 10 seconds. A failed refresh preserves the last
successful data and shows a retry warning. The displayed consultation time is
upstream retrieval time, retained across gateway cache hits, not a
fabricated source-update time. FPA can update scores during a match, but its
in-play delay/coverage is unverified. No running clock, streaming event feed or
second-by-second accuracy is claimed. Calendar code 50 is not used to decide that
a match has finished. Source-local dates/times remain local strings.

Filter selections have separate cache keys. Leaving a view stops its polling
without discarding its data. National catalog discovery is season/gender-specific;
other seasons can contain different competitions and phases.

## Verify

```sh
rtk bun run typecheck
rtk bun run test
rtk bun run theme:check
rtk bunx playwright install --with-deps chromium
rtk bun run test:e2e
rtk bun run test:e2e:production
rtk bun run build
rtk bun run check:client
rtk bun run astryx:doctor
```

Desktop/mobile Playwright tests cover selectors, history/zone changes, search,
results, standings, sheets, failure/retry retention, automatic polling and
horizontal overflow. The dev suite uses gRPC port 50211, Next port 3201 and
`build/e2e`. The production suite verifies client navigation, the prefetched
match shell, and that match data stays independent of competition failures and
delays. It uses gRPC port 50212, Next port 3202 and `build/e2e-production`.
Next's instant navigation test API is enabled only for that fixture build.
Live browser QA additionally exercises the actual federation →
proxy → gateway → app path. `test:e2e:deployed` accepts DEPLOYED_TEST_URL and the
existing private Vercel protection-bypass configuration, without saving credentials.

Run proto:generate after updating the canonical schema and exact provenance.
Theme source is src/themes/fpa/fpaTheme.ts; theme:build regenerates checked-in
artifacts. All API/client/service pins and release packaging live in fpa-infra.

## Hosting

GitHub publication does not provision cloud services. fpa-infra owns non-root OCI
images, local Compose, Cloud Run Terraform and reviewed Vercel prebuilt releases.
Automatic main production deploys are disabled. Configure FPA_GRPC_URL separately
for Preview and Production; see fpa-infra/docs/deployment.md for setup status.

Independent project. Source: Federação de Andebol de Portugal. This is not the
federation's official app, and source completeness and live publication depend on FPA.
