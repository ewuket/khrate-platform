import 'dart:math';
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// The single seam between the app and KHRATE's V1 API. All resilience lives here so
/// screens stay simple:
///  - attaches the JWT from secure storage,
///  - short connect/receive timeouts (fail fast on weak links, don't hang the UI),
///  - retries idempotent requests (GET, and POSTs carrying an Idempotency-Key) with
///    backoff on transient network errors — so a dropped mobile connection recovers
///    instead of erroring or, worse, creating a duplicate order.
class ApiClient {
  ApiClient({String? baseUrl})
      : _dio = Dio(BaseOptions(
          baseUrl: baseUrl ?? _defaultBase,
          connectTimeout: const Duration(seconds: 8),
          receiveTimeout: const Duration(seconds: 12),
          headers: {'Content-Type': 'application/json'},
        )) {
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _storage.read(key: _tokenKey);
        if (token != null && options.extra['auth'] != false) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
      onError: (e, handler) async {
        if (_shouldRetry(e)) {
          final attempt = (e.requestOptions.extra['attempt'] as int? ?? 0) + 1;
          if (attempt <= 3) {
            await Future.delayed(Duration(milliseconds: 300 * attempt * attempt));
            try {
              final opts = e.requestOptions;
              opts.extra['attempt'] = attempt;
              final res = await _dio.fetch(opts);
              return handler.resolve(res);
            } catch (_) {
              // fall through to surface the original error
            }
          }
        }
        handler.next(e);
      },
    ));
  }

  // Config, not a hardcoded constant: pass --dart-define=KHRATE_API=https://… per build
  // (device/staging/prod). Defaults to local dev.
  static const _defaultBase =
      String.fromEnvironment('KHRATE_API', defaultValue: 'http://localhost:3001/api/v1');
  final Dio _dio;
  final _storage = const FlutterSecureStorage();
  static const _tokenKey = 'khrate_token';

  bool _shouldRetry(DioException e) {
    final transient = e.type == DioExceptionType.connectionTimeout ||
        e.type == DioExceptionType.receiveTimeout ||
        e.type == DioExceptionType.connectionError;
    if (!transient) return false;
    final method = e.requestOptions.method.toUpperCase();
    // Safe to retry: reads, and writes that carry an idempotency key.
    return method == 'GET' || e.requestOptions.headers.containsKey('Idempotency-Key');
  }

  Future<void> saveToken(String token) => _storage.write(key: _tokenKey, value: token);
  Future<String?> readToken() => _storage.read(key: _tokenKey);
  Future<void> clearToken() => _storage.delete(key: _tokenKey);

  Future<dynamic> get(String path, {bool auth = true}) async {
    final r = await _dio.get(path, options: Options(extra: {'auth': auth}));
    return r.data;
  }

  Future<dynamic> post(String path, {Object? body, bool auth = true, String? idempotencyKey}) async {
    final headers = <String, dynamic>{};
    if (idempotencyKey != null) headers['Idempotency-Key'] = idempotencyKey;
    final r = await _dio.post(path, data: body, options: Options(extra: {'auth': auth}, headers: headers));
    return r.data;
  }

  /// A stable, unique key for a checkout attempt. The SAME key is reused across retries of
  /// the same logical order so the backend de-duplicates (see ADR-0015).
  static String newIdempotencyKey() {
    final r = Random();
    final ts = DateTime.now().microsecondsSinceEpoch.toRadixString(36);
    final rand = List.generate(8, (_) => r.nextInt(36).toRadixString(36)).join();
    return 'mob-$ts-$rand';
  }

  /// Turn a Dio error into a short, human message for the UI.
  static String messageFrom(Object e) {
    if (e is DioException) {
      if (e.type == DioExceptionType.connectionError ||
          e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.receiveTimeout) {
        return 'Connection problem. Check your internet and try again.';
      }
      final data = e.response?.data;
      if (data is Map && data['message'] != null) {
        final m = data['message'];
        return m is List ? m.join(', ') : m.toString();
      }
      return 'Something went wrong. Please try again.';
    }
    return 'Something went wrong. Please try again.';
  }
}
