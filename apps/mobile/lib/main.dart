import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'router.dart';
import 'theme.dart';
import 'ui/widgets/offline_banner.dart';

void main() => runApp(const ProviderScope(child: KhrateApp()));

class KhrateApp extends ConsumerWidget {
  const KhrateApp({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);
    return MaterialApp.router(
      title: 'KHRATE',
      debugShowCheckedModeBanner: false,
      theme: Khrate.theme(),
      routerConfig: router,
      // The offline banner sits above every screen so connectivity is always visible.
      builder: (context, child) => OfflineBanner(child: child ?? const SizedBox()),
    );
  }
}
