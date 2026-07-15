# 35 — Device Build Setup, On-Device Testing & Launch Hardening (Phase 5)

How the local mobile build/test environment was provisioned, what was genuinely tested on
an Android emulator, the honest iOS status, and the security/reliability hardening done for
a controlled early launch.

## Android toolchain setup (reproducible, no paid accounts)

All local, no `sudo`, no Android Studio:

1. **JDK 17** — `brew install openjdk@17` (Gradle needs a JDK 17).
2. **Command-line tools** — downloaded Google's `commandlinetools-mac` zip into
   `~/Library/Android/sdk/cmdline-tools/latest`.
3. **SDK packages** — `sdkmanager platform-tools "platforms;android-35" "platforms;android-36"
   "build-tools;35.0.0" "build-tools;36.0.0" emulator "system-images;android-35;google_apis;arm64-v8a"`
   (arm64 image for Apple Silicon). Licenses accepted via `sdkmanager --licenses` and
   `flutter doctor --android-licenses`.
4. **Flutter** — `flutter config --android-sdk ~/Library/Android/sdk`.
5. **AVD** — `avdmanager create avd -n khrate_pixel -k "system-images;android-35;google_apis;arm64-v8a" -d pixel_4a`
   (a realistic mid-range profile).

Environment (persist in your shell profile to rebuild later):
```
export JAVA_HOME=/opt/homebrew/opt/openjdk@17
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
```

`apps/mobile/android/local.properties` (git-ignored) carries `sdk.dir`.

## Emulator ↔ local backend

- The emulator reaches the host Mac at **`10.0.2.2`**, not `localhost`. Builds for the
  emulator pass `--dart-define=KHRATE_API=http://10.0.2.2:3001/api/v1`.
- Android API 28+ blocks cleartext HTTP. A **debug-only** manifest
  (`android/app/src/debug/AndroidManifest.xml`) sets `usesCleartextTraffic="true"` so dev
  builds can talk to the local http backend. **Release builds keep cleartext blocked.**

## What was genuinely tested — precise vocabulary

| Level | Android | iOS |
|---|---|---|
| Shared Dart code **compiled** | ✅ | ✅ (compiles; platform build needs Xcode) |
| A **build produced** | ✅ `app-debug.apk` | ❌ no Xcode/iOS SDK |
| **Emulator/simulator launch** | ✅ emulator (Pixel-class, API 35, arm64) | ❌ no simulator (needs Xcode) |
| **Full customer journey tested** | ✅ on emulator (see below) | ❌ |
| **Physical device** | ❌ not performed | ❌ not performed |
| **Production signing** | ❌ not performed | ❌ not performed |
| **Store readiness** | ❌ not performed | ❌ not performed |

### Android journeys tested on the emulator (against the real local backend)

Driven with `adb input`/`screencap`, cross-checked in the DB and admin platform:

- Onboarding → **location selection** (live zones from the API) → **deal discovery** (live
  deals, honest pricing/progress) → **deal detail** → add items → **OTP sign-in** (dev code
  from the backend) → **join a deal** (order created) → **MoMo reference submission** →
  **order tracking** (timeline).
- **Cross-system:** the emulator-created order appeared in the admin **Payment Review queue**
  with the exact reference typed (`MP-ANDROID-EMU-…`), correct deal and RWF 43,000.
- **Idempotency:** 1 order / 1 key for the customer (no duplicate); backend-enforced, app
  sends the key. Also asserted by the Flutter integration test.
- **Weak connectivity:** disabling the emulator network showed the offline banner; re-enabling
  cleared it automatically.
- **App recovery:** force-stop + relaunch returns the customer straight to the shop (zone
  remembered) and **still signed in** (token in secure storage) — Orders shows their order
  with no re-login.
- **Rotation:** landscape renders without overflow/crash.

### Two real bugs found on-device and fixed

1. **Deal item row overflowed by 47px** on dense screens — the price/strikethrough/"save"
   line didn't wrap. Fixed by switching that `Row` to a `Wrap`.
2. **Reopen showed onboarding again** — the splash checked the saved zone after a fixed 250ms,
   racing the async storage read. Fixed by having the splash await the zone/session load
   (`ready` completers) before routing.

### iOS — honest status

Only **Command Line Tools** are installed, not full **Xcode.app**. Therefore: no iOS SDK, no
`simctl` simulator, no iOS build. The Flutter iOS project scaffold (`ios/Runner.xcodeproj`)
exists and the shared Dart compiles, but **no iOS build/simulator/device testing was
performed.** To enable it (manual, founder action):
1. Install **Xcode** from the Mac App Store (multi-GB; needs your Apple ID). No paid Apple
   Developer Program required for simulator builds.
2. `sudo xcode-select -s /Applications/Xcode.app` and accept the licence: `sudo xcodebuild -license accept`.
3. `brew install cocoapods` then `cd apps/mobile/ios && pod install`.
4. `flutter build ios --debug --simulator` and `flutter run -d <simulator>`.

## Launch hardening (ADR-0016/0017/0018)

Prioritised for a controlled early launch; deliberately no new infrastructure.

- **OTP anti-abuse:** 30s resend cooldown + max 4 sends / 15-min window per phone, DB-backed.
  Blocks SMS-bombing and enumeration. (Verified: 2nd rapid request → 400.)
- **Security headers:** `helmet` (HSTS, `X-Content-Type-Options`, `X-Frame-Options`, …).
- **CORS:** permissive in dev; production locks to `CORS_ORIGINS` allow-list.
- **Cleartext:** allowed for Android **debug only**; release blocks it.
- **Existing protections reaffirmed:** JWT sessions (customer 30d, staff 12h), scrypt staff
  passwords, hashed OTPs, least-privilege staff RBAC, append-only audit, global
  whitelist-validation of every DTO, idempotent orders (no duplicate payments).
- **Token storage (mobile):** JWT in `flutter_secure_storage` (Keychain/Keystore), never
  plain prefs.

### Dependency posture

`npm audit`: **0 critical, 8 high** — all transitive/build-time (`@nestjs/cli`, `glob` CLI,
`picomatch`, `tmp`) or non-reachable given our usage (`multer` uploads — none; `lodash
_.template` — never on user input; `next` Image Optimizer `remotePatterns` — unused). Safe
fixes applied; remaining items need Next 15 / newer NestJS majors — deferred to a framework-
upgrade milestone, tracked here. No runtime-reachable critical/high left unaddressed.

### Migration & rollback safety

Prisma migrations are forward SQL under `apps/api/prisma/migrations`. The Phase-4
`order_idempotency_key` migration is additive (nullable column + unique index) — safe to
apply online and reversible by dropping the index/column if ever needed. Policy: keep
migrations additive and backward-compatible; never destructive in a single deploy.

## What still requires external accounts / a device

- **iOS anything:** full Xcode (Apple ID; free for simulator).
- **Physical Android/iOS devices:** a real handset.
- **Push notifications:** FCM (Android) / APNs (iOS) — capability prepared, accounts not
  created (founder approval required).
- **Real MoMo merchant/till number and support number:** still `[SAMPLE]` placeholders.
- **Store publishing:** Google Play / Apple Developer accounts (paid; explicitly out of scope).
