# 05 — Decision Log (ADRs)

Append-only record of meaningful decisions. Newest at top. Format: context → decision → why → status.

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
