import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'ui/shell.dart';
import 'ui/screens/splash_screen.dart';
import 'ui/screens/location_screen.dart';
import 'ui/screens/shop_screen.dart';
import 'ui/screens/deal_screen.dart';
import 'ui/screens/auth_screen.dart';
import 'ui/screens/checkout_screen.dart';
import 'ui/screens/orders_screen.dart';
import 'ui/screens/order_detail_screen.dart';
import 'ui/screens/account_screen.dart';

/// App navigation. Deep-link ready: every screen has a real path (khrate://deals/:id →
/// /deals/:id works once the deep-link scheme is registered on each platform).
final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/',
    routes: [
      GoRoute(path: '/', builder: (_, __) => const SplashScreen()),
      GoRoute(path: '/location', builder: (_, __) => const LocationScreen()),
      GoRoute(path: '/auth', builder: (_, s) => AuthScreen(next: s.uri.queryParameters['next'] ?? '/shop')),
      GoRoute(path: '/deals/:id', builder: (_, s) => DealScreen(dealId: s.pathParameters['id']!)),
      GoRoute(path: '/checkout/:orderId', builder: (_, s) => CheckoutScreen(orderId: s.pathParameters['orderId']!)),
      GoRoute(path: '/orders/:id', builder: (_, s) => OrderDetailScreen(orderId: s.pathParameters['id']!)),
      // Bottom-nav tabs live inside a persistent shell.
      ShellRoute(
        builder: (_, __, child) => AppShell(child: child),
        routes: [
          GoRoute(path: '/shop', builder: (_, __) => const ShopScreen()),
          GoRoute(path: '/orders', builder: (_, __) => const OrdersScreen()),
          GoRoute(path: '/account', builder: (_, __) => const AccountScreen()),
        ],
      ),
    ],
  );
});
