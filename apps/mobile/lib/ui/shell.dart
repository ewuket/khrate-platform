import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../theme.dart';

/// Persistent bottom navigation for the three primary destinations. Thumb-reachable,
/// native Material 3 NavigationBar.
class AppShell extends StatelessWidget {
  const AppShell({super.key, required this.child});
  final Widget child;

  static const _tabs = ['/shop', '/orders', '/account'];

  int _indexFor(String location) {
    if (location.startsWith('/orders')) return 1;
    if (location.startsWith('/account')) return 2;
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).uri.path;
    return Scaffold(
      body: child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: _indexFor(location),
        onDestinationSelected: (i) => context.go(_tabs[i]),
        backgroundColor: Colors.white,
        indicatorColor: Khrate.brand100,
        destinations: const [
          NavigationDestination(icon: Icon(Icons.storefront_outlined), selectedIcon: Icon(Icons.storefront), label: 'Shop'),
          NavigationDestination(icon: Icon(Icons.receipt_long_outlined), selectedIcon: Icon(Icons.receipt_long), label: 'Orders'),
          NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Account'),
        ],
      ),
    );
  }
}
