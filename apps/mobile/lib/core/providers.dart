import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models.dart';
import 'api_client.dart';

/// Single API client for the app.
final apiProvider = Provider<ApiClient>((ref) => ApiClient());

/// Repository — the app's whole data surface, one place, testable.
final repoProvider = Provider<Repo>((ref) => Repo(ref.read(apiProvider)));

class Repo {
  Repo(this._api);
  final ApiClient _api;

  Future<List<Zone>> zones() async {
    final data = await _api.get('/zones', auth: false) as List;
    return data.map((z) => Zone.fromJson(z)).toList();
  }

  Future<List<Deal>> deals(String zoneId) async {
    final data = await _api.get('/zones/$zoneId/deals', auth: false) as List;
    return data.map((d) => Deal.fromJson(d)).toList();
  }

  Future<Deal?> deal(String id) async {
    final data = await _api.get('/deals/$id', auth: false);
    return data == null ? null : Deal.fromJson(data);
  }

  Future<Map<String, dynamic>> requestOtp(String phone) async =>
      (await _api.post('/auth/otp/request', body: {'phone': phone}, auth: false)) as Map<String, dynamic>;

  Future<String> verifyOtp(String phone, String code) async {
    final data = await _api.post('/auth/otp/verify', body: {'phone': phone, 'code': code}, auth: false)
        as Map<String, dynamic>;
    await _api.saveToken(data['token']);
    return data['token'];
  }

  /// Join a deal. The idempotencyKey makes a retried request resolve to the same order.
  Future<CustomerOrder> join({
    required String dealId,
    required List<Map<String, dynamic>> lines,
    required String fulfilmentMode,
    String? fulfilmentOptionId,
    String? locationId,
    required String idempotencyKey,
  }) async {
    final data = await _api.post(
      '/deals/$dealId/join',
      idempotencyKey: idempotencyKey,
      body: {
        'lines': lines,
        'fulfilmentMode': fulfilmentMode,
        if (fulfilmentOptionId != null) 'fulfilmentOptionId': fulfilmentOptionId,
        if (locationId != null) 'locationId': locationId,
      },
    ) as Map<String, dynamic>;
    // The join response is the raw order; fetch the customer-facing view for a status.
    return order(data['id']);
  }

  Future<List<CustomerOrder>> myOrders() async {
    final data = await _api.get('/me/orders') as List;
    return data.map((o) => CustomerOrder.fromJson(o)).toList();
  }

  Future<CustomerOrder> order(String id) async =>
      CustomerOrder.fromJson(await _api.get('/me/orders/$id') as Map<String, dynamic>);

  Future<void> submitPaymentRef(String orderId, String ref) async =>
      _api.post('/me/orders/$orderId/payment-ref', body: {'providerRef': ref});
}

/// Session: is the customer signed in? Set on token save, cleared on sign out.
final sessionProvider = StateNotifierProvider<SessionNotifier, bool>((ref) {
  final n = SessionNotifier(ref.read(apiProvider));
  n.load();
  return n;
});

class SessionNotifier extends StateNotifier<bool> {
  SessionNotifier(this._api) : super(false);
  final ApiClient _api;
  Future<void> load() async => state = (await _api.readToken()) != null;
  void setSignedIn() => state = true;
  Future<void> signOut() async {
    await _api.clearToken();
    state = false;
  }
}

/// Chosen delivery zone (persisted in shared_preferences).
final zoneProvider = StateNotifierProvider<ZoneNotifier, Zone?>((ref) {
  final n = ZoneNotifier();
  n.load();
  return n;
});

class ZoneNotifier extends StateNotifier<Zone?> {
  ZoneNotifier() : super(null);
  static const _key = 'khrate_zone_id';

  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    final id = prefs.getString(_key);
    final name = prefs.getString('${_key}_name');
    final cur = prefs.getString('${_key}_cur');
    if (id != null && name != null) {
      state = Zone(id: id, name: name, currency: cur ?? 'RWF', dropPoints: const []);
    }
  }

  Future<void> select(Zone z) async {
    state = z;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, z.id);
    await prefs.setString('${_key}_name', z.name);
    await prefs.setString('${_key}_cur', z.currency);
  }
}

/// Connectivity — drives the offline banner and informs retry UX.
final connectivityProvider = StreamProvider<bool>((ref) {
  final c = Connectivity();
  Future<bool> online() async {
    final r = await c.checkConnectivity();
    return !r.contains(ConnectivityResult.none);
  }

  late final StreamController<bool> controller;
  controller = StreamController<bool>(
    onListen: () async => controller.add(await online()),
  );
  final sub = c.onConnectivityChanged.listen((r) => controller.add(!r.contains(ConnectivityResult.none)));
  ref.onDispose(() {
    sub.cancel();
    controller.close();
  });
  return controller.stream;
});
