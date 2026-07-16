# 34 — Mobile Architecture (Flutter, Android + iOS)

The KHRATE customer mobile app. One shared Flutter codebase, first native client of the
frozen V1 API (ADR-0014). It consumes the API as documented — no business logic duplicated
from the backend. Android-first for the Rwanda launch; iOS built from the same code.

## Stack

| Concern | Choice | Why |
|---|---|---|
| UI | Flutter (Material 3) | One codebase → Android + iOS; native feel, small footprint |
| State | Riverpod | Light, testable, no code-gen |
| Networking | Dio + interceptors | Auth header, short timeouts, retry-with-backoff |
| Routing | go_router | Declarative, deep-link ready (`/deals/:id`, `/orders/:id`) |
| Secure storage | flutter_secure_storage | JWT in Keychain/Keystore, never plain prefs |
| Prefs | shared_preferences | Non-sensitive (chosen zone) |
| Connectivity | connectivity_plus | Offline banner + retry awareness |
| External links | url_launcher | WhatsApp invite loop + support |

Config, not constants: the API base URL is `--dart-define=KHRATE_API=…` per build
(dev / staging / prod), defaulting to local dev.

## Structure

```
lib/
  main.dart            app root + offline banner wrapper
  theme.dart           KHRATE orange as Material 3 theme
  router.dart          go_router (deep-link-ready paths)
  models.dart          Zone, Deal, DealLine, Fulfilment, CustomerOrder
  core/
    api_client.dart    Dio + auth/timeout/retry interceptors, idempotency-key generator
    providers.dart     Repo + Riverpod providers (session, zone, connectivity)
    format.dart        RWF formatting, countdowns
    share.dart         WhatsApp invite + support (url_launcher)
  ui/
    shell.dart         bottom-nav scaffold (Shop / Orders / Account)
    widgets/           offline banner, tip-progress bar
    screens/           splash, location, shop, deal, auth, checkout, orders, order-detail, account
```

## Resilience & correctness (weak-connectivity Rwanda reality)

- **Timeouts:** 8s connect / 12s receive — fail fast, never hang the UI.
- **Retry:** transient network errors retried with quadratic backoff, but only for GETs and
  writes carrying an `Idempotency-Key`.
- **Idempotent join (ADR-0015):** one key per checkout attempt, reused across retries, so a
  dropped connection can't create a duplicate order/payment. The backend returns the existing
  order for a repeated key.
- **Offline banner:** connectivity stream drives a top banner; the app recovers automatically.
- **Optimistic-free money flow:** payment is never shown as instant — manual MoMo, human
  verified, honest status stages.

## What the customer sees (same honesty as web)

Discover deals (honest progress-to-tip, real participant counts, no fake urgency) → open a
deal → choose items + drop point → phone-OTP sign-in (basket preserved) → manual-MoMo
checkout with reference submission → live order tracking → WhatsApp invite. Operational
complexity (procurement, packing, driver assignment) stays hidden.

## Verification performed (be precise — see roadmap Phase 4)

- **Shared code compiled:** `flutter analyze` clean (info lints only); `flutter build web
  --release` ✓.
- **App tested via web build:** rendered live in a mobile-viewport browser against the real
  backend (splash/onboarding confirmed by screenshot).
- **Integration/widget tests against the real backend:** 3/3 pass — data layer (`/zones`),
  full journey (OTP → deal detail → join → idempotent retry → payment-ref → tracked status),
  and `LocationScreen` rendering live zone data. The journey test drives the app's own
  `Repo`/`ApiClient`/models.
- **Cross-system:** an order created through the app's code appeared in the admin Payment
  Review queue with the correct amount/reference; the retried join created zero duplicates.

## Device build & test status (updated Phase 5 — see engineering/35)

- **Android:** toolchain provisioned; **debug APK built** and the **full customer journey
  tested on an emulator** against the real backend (location → discovery → deal → OTP login →
  join → MoMo reference → tracking), cross-checked in the admin platform. Weak-connectivity,
  app recovery, and rotation verified. Two on-device bugs found and fixed. **No physical
  device.**
- **iOS:** shared code compiles, but **no full Xcode → no iOS build/simulator/device testing.**
  Manual setup documented in engineering/35.
- Push notifications (FCM/APNs), per-platform deep-link registration, and store signing are
  prepared in design but not wired — they need paid/registered services (founder gate).

## Push notifications — prepared, not wired (founder gate)

**What push is for at KHRATE (in value order):** "your group tipped / didn't tip" (the
moment customers care most), "payment confirmed", "order at drop point — collect by 19:00".
These map to existing `TimelineEvent`s, so the backend hook is a small consumer that posts
to FCM when those events are written — no architectural change.

**Setup when approved (all steps, nothing hidden):**
1. Create a Firebase project (free tier suffices; Google account required — **founder
   approval**). Add Android app `rw.khrate.khrate_mobile` → download `google-services.json`
   into `android/app/` (git-ignored; treat as a credential).
2. iOS: needs the **paid Apple Developer Program** for APNs keys. Upload the APNs auth key
   to Firebase; add `GoogleService-Info.plist` to `ios/Runner/` (git-ignored).
3. App: add `firebase_core` + `firebase_messaging`, request permission at first *useful*
   moment (after first order — not on first launch), send the device token to a new
   `POST /me/device-tokens` endpoint.
4. Backend: store tokens per customer; a small notifier service subscribes to DEAL_TIPPED /
   DEAL_FAILED / PAYMENT_VERIFIED / DELIVERY_* events and calls FCM HTTP v1.
5. Never put order contents or amounts in the notification body (lock-screen privacy) —
   "Your KHRATE group succeeded 🎉 Open the app" is enough.

Until then, the app's polling on the order screen (15s) plus WhatsApp cover the pilot.
