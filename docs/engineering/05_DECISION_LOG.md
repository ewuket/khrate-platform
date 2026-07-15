# 05 — Decision Log (ADRs)

Append-only record of meaningful decisions. Newest at top. Format: context → decision → why → status.

---

### ADR-0014 — Customer web is a thin, phone-first client on the frozen API
**Decision:** `apps/web` (Next.js) is a lightweight client-rendered app in a fixed
phone-width column (max 480px, centred on desktop), dependency-free beyond React/Next
(~90 kB first load). It consumes the same `/api/v1` the mobile apps will, holding session +
chosen location in localStorage so weak-connection reloads don't lose state. Selection
(basket + drop point) is persisted to sessionStorage so a customer never loses it when
bounced through sign-in.
**Why:** KHRATE's customers are on affordable Android phones and patchy data. Small payloads,
big touch targets, and resilience to reload beat a heavy SPA or an over-clever SSR setup.
One design that already reads as "mobile" also de-risks the Flutter port (same IA, same API).
**Status:** Accepted.

### ADR-0013 — Honest progress + no fake social proof, enforced in the data path
**Decision:** Deal progress, participant counts, and savings are computed from real orders
only and returned inline with the deal list (one request). "Be the first to join" replaces a
"0 joined"; savings show the real everyday price struck through beside the group price;
manual-MoMo checkout never claims instant confirmation ("a team member checks your
reference"). Auth is required to join — `customerId` comes from the JWT, never the request body.
**Why:** The founder's integrity principles aren't a content guideline, they're an
architectural constraint — there is no code path that can inflate a number, and no
unauthenticated way to place an order as someone else.
**Status:** Accepted. The KHRATE MoMo merchant number shown at checkout is SAMPLE data;
the real number is a founder-provided launch configuration (see Phase 3 report).

### ADR-0018 — Launch hardening: OTP throttle, security headers, config-driven CORS
**Decision:** (a) OTP requests are throttled per phone — a 30s resend cooldown and a cap of
4 sends per 15-minute window — enforced via the `OtpChallenge` table (survives restarts,
holds across instances). (b) `helmet` adds security headers (HSTS, nosniff, frameguard) to
the JSON API. (c) CORS is permissive in dev but locks to an allow-list via `CORS_ORIGINS`
in production. (d) Android debug builds allow cleartext HTTP to the local backend via a
debug-only manifest; release builds keep cleartext blocked.
**Why:** Realistic early-launch risks — SMS-bombing/enumeration on the OTP endpoint, missing
transport/headers hardening, and over-broad CORS. Kept minimal (no new infra) per the
"don't overengineer" directive.
**Status:** Accepted. Verified: 2nd rapid OTP → 400; helmet headers present; 12/12 tests pass.

### ADR-0017 — Dependency vulnerability posture (triaged, not force-bumped)
**Decision:** `npm audit` shows 0 critical / 8 high, all transitive or build-time
(`@nestjs/cli`, `glob` CLI, `picomatch`, `tmp`) or requiring usage we don't have (`multer`
uploads — none; `lodash _.template` — never on user input; `next` Image Optimizer
`remotePatterns` — unused). Safe (non-breaking) fixes applied; remaining ones need Next 15 /
newer NestJS major migrations not justified before a controlled launch and not runtime-reachable.
**Why:** Balance security with stability; avoid breaking changes on the eve of launch for
non-reachable advisories. Revisit at the framework-upgrade milestone.
**Status:** Accepted; documented in engineering/35 for re-review.

### ADR-0016 — Android SDK provisioned locally; iOS build blocked on full Xcode
**Decision:** Android toolchain installed via Homebrew (JDK 17) + Google command-line tools
(SDK 35/36, build-tools, platform-tools, emulator, arm64 system image), plus a mid-range AVD.
Flutter Android toolchain now green; debug APK builds and runs on the emulator. iOS remains
blocked: the machine has only Command Line Tools, not full Xcode, so no iOS SDK/simulator —
that install is a manual, App-Store, founder action.
**Why:** Enable genuine Android on-device (emulator) testing without paid accounts. iOS needs
Xcode which cannot be installed non-interactively.
**Status:** Accepted. Android verified end-to-end on emulator; iOS pending Xcode.

### ADR-0015 — Idempotent order creation for retried mobile joins
**Decision:** `POST /deals/:id/join` accepts an optional `Idempotency-Key` header. Orders carry
a unique `idempotencyKey`; a repeated join with the same key returns the existing order
instead of creating a second one (and rejects key reuse across customers). The Flutter app
generates one key per checkout attempt and reuses it across retries; its Dio client only
retries writes that carry the key.
**Why:** On a flaky mobile connection a request can be resent after the server already
processed it. Without this, a customer could create duplicate orders/payments. Founder
requirement: "clear recovery from interrupted requests so customers do not accidentally
create duplicate payments or orders."
**Verified:** Backend curl retry → same order; Flutter journey test asserts `retry.id == order.id`;
DB shows exactly one order per key.
**Status:** Accepted.

### ADR-0014 — Mobile stack: Flutter (one shared codebase), Riverpod, Dio, go_router
**Decision:** One Flutter codebase for Android + iOS (and web/desktop as run targets).
Riverpod for state, Dio for networking (auth/timeout/retry interceptors), go_router for
deep-link-ready navigation, flutter_secure_storage for the JWT (Keychain/Keystore),
connectivity_plus for the offline banner. API base URL is a `--dart-define`, not a constant.
**Why:** A single team maintains one honest customer experience across platforms; consumes
the frozen V1 API as documented, no duplicated business logic. Android-first for the Rwanda
launch. Native feel (Material 3, bottom nav, gestures), small footprint, weak-connectivity
resilience — not a website in a frame.
**Status:** Accepted.

### ADR-0012 — Admin/ops platform before the customer web app (founder-directed resequencing)
**Decision:** Phase 2 = the internal administration & operations platform; the customer web
app follows in Phase 3, then mobile. Staff auth (email+password, scrypt) + role-based
guards land now, since the admin surface is the first authenticated surface.
**Why:** KHRATE is operations-driven. Before customers arrive, staff must be able to run
the business end-to-end: catalogue → deal creation → payment verification → packing →
delivery → refunds → reporting. Building the customer app first would demo well and
operate nothing. This also de-risks the customer launch: every customer-facing promise
(verified payment, packed order, scheduled drop) is backed by a working internal tool.
**Status:** Accepted. Roadmap re-numbered.

### ADR-0011 — Configurable refund policy, not hardcoded (founder-directed)
**Decision:** Refund handling supports both MoMo refund and wallet credit; the *default*
behaviour is a runtime `Policy` value (`refund.default`), not a code constant. Launch
default = instant MoMo refund (trust-first); the business can change it later without a deploy.
**Why:** Founder clarification #3. Trust matters most at launch; economics may shift later.
**Status:** Accepted.

### ADR-0010 — Pricing engine, not hardcoded fees (founder-directed)
**Decision:** Delivery/service fees come from a configurable **pricing engine** (`PricingRule`
records evaluated in order), never literals in code. Rules can key off fulfilment mode,
zone, order value, group vs solo, and density. Pure, testable resolver.
**Why:** Founder clarification #4. KHRATE will learn its true unit economics over time; pricing
must evolve as data, not code changes.
**Status:** Accepted. Supersedes the "flat fee" assumption in earlier docs.

### ADR-0009 — Pluggable multi-strategy fulfilment (founder-directed)
**Decision:** Fulfilment is a first-class, extensible concept: a `FulfilmentMode`
(HOME_DELIVERY, DROP_POINT, APARTMENT, OFFICE, CAMPUS, PICKUP_LOCATION, …) plus a `Location`
(a served place) or a customer `Address` (home). A deal offers one or more `FulfilmentOption`s;
an order chooses one. Adding a new operational model is data + (if needed) a new enum value,
not an architectural change.
**Why:** Founder clarification #1. Neighbourhood drop is the *launch* efficiency play, not the
only model. KHRATE must evolve operationally without a rewrite.
**Status:** Accepted. Generalises the earlier DropZone-only design.

### ADR-0008 — Payment providers fully pluggable (founder-directed, reaffirms ADR-0006)
**Decision:** All payment behaviour behind `PaymentProvider`; providers are registered and
selected by config. Launch = `MOMO_MANUAL`. Adding MTN MoMo / Airtel / others = a new provider
class + config, zero changes to order/deal logic.
**Why:** Founder clarification #2.
**Status:** Accepted.

---

### ADR-0007 — Zone-based deals now; live GPS tracking later
**Decision:** Deliveries target Drop Zones with scheduled bulk drops; no per-order live GPS at launch.
**Why:** The density/pre-sell model does not need real-time tracking to work, and GPS
infra is cost/complexity the launch doesn't justify. Status/ETA messaging via WhatsApp is enough.
**Status:** Accepted.

### ADR-0006 — Payments behind a provider interface; manual/assisted MoMo at launch
**Decision:** `PaymentProvider` interface. Launch implementation = customer pays via MoMo
and confirms (reference / proof), staff verify; wallet-credit refunds supported. Scale
implementation = MTN MoMo Collections API + Airtel Money.
**Why:** Direct MoMo API access requires a commercial agreement and approvals KHRATE
doesn't have yet (a **founder action**, not an engineering one). Business logic must not
wait on it. See [Payments](../product/08_PAYMENTS.md).
**Status:** Accepted. Founder approval required before any live payment integration.

### ADR-0005 — Threshold-can-be-1 unifies "always-on" and "must-tip" deals
**Decision:** One Group Deal model with a configurable threshold (min units/value); a
threshold of 1 means the deal always tips.
**Why:** Avoids a separate "instant buy" vs "group buy" code path. One state machine,
fewer bugs.
**Status:** Accepted.

### ADR-0004 — Phone + OTP identity (WhatsApp/SMS), email optional
**Decision:** Primary identity is a Rwandan phone number verified by OTP.
**Why:** Phone is the real identity in the market; email-first would exclude customers.
**Status:** Accepted.

### ADR-0003 — Flutter for both mobile platforms
**Decision:** Single Flutter codebase for Android + iOS, consuming the frozen V1 API.
**Why:** A startup cannot staff separate Swift + Kotlin teams; Flutter gives near-native
feel and strong low-end Android performance. Android is the priority device class.
**Status:** Accepted.

### ADR-0002 — NestJS modular monolith + Postgres/Prisma + Redis; Next.js web/admin
**Decision:** Adopt this stack (see [Architecture](04_ARCHITECTURE.md)).
**Why:** Proven, structured, single language across backend and web, matches the team's
existing skills, cheap to run, scales far before needing microservices. Boring on purpose.
**Status:** Accepted.

### ADR-0001 — Pre-sell-then-procure, zone-based, single-drop group buying is the core model
**Decision:** KHRATE's product is zone-based group buying with demand aggregated to a
cut-off, procurement against confirmed demand, and one bulk drop per zone. No subsidies.
**Why:** This is the one model the [research](../research/02_GROUP_BUYING_RESEARCH.md)
shows both works on fresh-grocery economics and is defensible; the subsidy-war and
own-the-whole-supply-chain variants consistently failed.
**Status:** Accepted. Founding decision.
