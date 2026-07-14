# 05 — Decision Log (ADRs)

Append-only record of meaningful decisions. Newest at top. Format: context → decision → why → status.

---

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
