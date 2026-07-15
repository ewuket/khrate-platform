// Genuine end-to-end tests for the KHRATE mobile app, driving the app's OWN code
// (ApiClient, Repo, models, and a real screen widget) against the LIVE backend at
// localhost:3001. Not mocks: these exercise the exact networking/serialisation/gesture
// code the shipped app uses.
//
// Requires the API running (npm run start:prod --workspace apps/api) and seeded data.
// Platform plugins that can't run in the test VM (secure storage, prefs, connectivity)
// are stubbed at the channel level so the real HTTP path is what's under test.

import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:khrate_mobile/core/api_client.dart';
import 'package:khrate_mobile/core/providers.dart';
import 'package:khrate_mobile/ui/screens/location_screen.dart';

// flutter_test blocks real sockets by default. This restores the real HttpClient inside a
// zone so these tests genuinely hit the live backend (that's the whole point).
class _RealHttpOverrides extends HttpOverrides {}

Future<T> withNet<T>(Future<T> Function() body) =>
    HttpOverrides.runWithHttpOverrides(body, _RealHttpOverrides());

void _stubPlugins() {
  final messenger = TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;
  // In-memory secure storage.
  final store = <String, String?>{};
  messenger.setMockMethodCallHandler(
    const MethodChannel('plugins.it_nomads.com/flutter_secure_storage'),
    (call) async {
      switch (call.method) {
        case 'write':
          store[call.arguments['key']] = call.arguments['value'];
          return null;
        case 'read':
          return store[call.arguments['key']];
        case 'delete':
          store.remove(call.arguments['key']);
          return null;
        case 'readAll':
          return <String, String>{};
        default:
          return null;
      }
    },
  );
  messenger.setMockMethodCallHandler(
    const MethodChannel('plugins.flutter.io/shared_preferences'),
    (call) async => call.method == 'getAll' ? <String, Object>{} : null,
  );
  messenger.setMockMethodCallHandler(
    const MethodChannel('dev.fluttercommunity.plus/connectivity'),
    (call) async => call.method == 'check' ? 'wifi' : null,
  );
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(_stubPlugins);

  final repo = Repo(ApiClient());

  test('data layer: discover zones from the live API', () => withNet(() async {
    final zones = await repo.zones();
    expect(zones, isNotEmpty);
    expect(zones.first.dropPoints, isNotEmpty);
  }));

  test('full customer journey through the app\'s own code', () => withNet(() async {
    // 1. Discover an open deal in the launch zone.
    final zones = await repo.zones();
    final deals = await repo.deals(zones.first.id);
    expect(deals, isNotEmpty, reason: 'seed an open deal before running');
    expect(deals.first.progress, inInclusiveRange(0, 1)); // honest progress, never > 100%
    // The real app opens the deal detail (full fulfilment with ids) before joining.
    final deal = (await repo.deal(deals.first.id))!;
    expect(deal.fulfilment.first.id, isNotNull);

    // 2. Sign in by phone OTP (dev code returned by the backend). Unique number per run
    // so the OTP anti-abuse throttle (30s cooldown / window cap) can't make this flaky.
    final phone = '+2507${(DateTime.now().millisecondsSinceEpoch % 100000000).toString().padLeft(8, '0')}';
    final otp = await repo.requestOtp(phone);
    await repo.verifyOtp(phone, otp['devCode']);

    // 3. Join with an idempotency key.
    final key = ApiClient.newIdempotencyKey();
    final line = deal.lines.first;
    final ful = deal.fulfilment.first;
    final order = await repo.join(
      dealId: deal.id,
      idempotencyKey: key,
      fulfilmentMode: ful.mode,
      fulfilmentOptionId: ful.id,
      locationId: ful.locationId,
      lines: [
        {'dealLineId': line.id, 'quantity': 2}
      ],
    );
    expect(order.total, greaterThan(0));

    // 4. Idempotency: the SAME key must resolve to the SAME order (dropped-connection retry).
    final retry = await repo.join(
      dealId: deal.id,
      idempotencyKey: key,
      fulfilmentMode: ful.mode,
      fulfilmentOptionId: ful.id,
      locationId: ful.locationId,
      lines: [
        {'dealLineId': line.id, 'quantity': 2}
      ],
    );
    expect(retry.id, order.id, reason: 'retried join must not create a duplicate order');

    // 5. Submit the MoMo reference; order should be tracked as confirming payment.
    await repo.submitPaymentRef(order.id, 'MOB-TEST-${DateTime.now().millisecondsSinceEpoch}');
    final tracked = await repo.order(order.id);
    expect(tracked.status.key, anyOf('confirming_payment', 'gathering_group'));

    // Print the order id so the harness can cross-check it in the admin/DB.
    // ignore: avoid_print
    print('CREATED_ORDER_ID=${order.id}');
  }));

  testWidgets('LocationScreen renders a real zone from the API', (tester) async {
    await withNet(() => tester.runAsync(() async {
          await tester.pumpWidget(const ProviderScope(child: MaterialApp(home: LocationScreen())));
          expect(find.textContaining('Where should we deliver'), findsOneWidget);
          // Real event loop: let /zones resolve, pumping frames until the card renders.
          for (var i = 0; i < 40; i++) {
            await Future.delayed(const Duration(milliseconds: 150));
            await tester.pump();
            if (find.textContaining('Kigali').evaluate().isNotEmpty) break;
          }
          expect(find.textContaining('Kigali'), findsWidgets, reason: 'zone from the live API should render');
        }));
  });
}
