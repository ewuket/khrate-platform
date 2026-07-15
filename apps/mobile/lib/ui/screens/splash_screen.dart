import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers.dart';
import '../../theme.dart';

/// Entry point + first-run pitch. If a location is already chosen we go straight to the
/// shop; otherwise we introduce KHRATE and route to the location picker.
class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});
  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      // Let zone/session load, then route.
      await Future.delayed(const Duration(milliseconds: 250));
      if (!mounted) return;
      final zone = ref.read(zoneProvider);
      if (zone != null) context.go('/shop');
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 12),
              Row(children: [
                Text('KHRATE',
                    style: TextStyle(color: Khrate.brand600, fontSize: 30, fontWeight: FontWeight.w900, letterSpacing: -0.5)),
                Text('.', style: TextStyle(color: Khrate.fresh, fontSize: 30, fontWeight: FontWeight.w900)),
              ]),
              const Spacer(),
              const Text('Groceries,', style: TextStyle(fontSize: 38, fontWeight: FontWeight.w900, height: 1.05)),
              Text('better together.',
                  style: TextStyle(fontSize: 38, fontWeight: FontWeight.w900, height: 1.05, color: Khrate.brand600)),
              const SizedBox(height: 14),
              Text(
                'Shop fresh food in Kigali — and pay less when your neighbours buy along with you. '
                'We deliver to a drop point near you.',
                style: TextStyle(fontSize: 17, color: Khrate.n500, height: 1.4),
              ),
              const SizedBox(height: 24),
              const _Point(n: '1', title: 'Join a group deal', text: 'Pick fresh groceries or a ready bundle.'),
              const _Point(n: '2', title: 'Neighbours join too', text: 'Enough people join and the lower group price unlocks for everyone.'),
              const _Point(n: '3', title: 'We buy fresh & deliver', text: 'We buy what’s ordered, pack it, bring it to your drop point.'),
              const Spacer(),
              FilledButton(onPressed: () => context.go('/location'), child: const Text('Get started')),
              const SizedBox(height: 8),
              Center(
                child: TextButton(
                  onPressed: () => context.go('/location'),
                  child: Text('Choose my area', style: TextStyle(color: Khrate.brand600)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Point extends StatelessWidget {
  const _Point({required this.n, required this.title, required this.text});
  final String n, title, text;
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(radius: 15, backgroundColor: Khrate.brand, child: Text(n, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold))),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
              Text(text, style: TextStyle(color: Khrate.n500, fontSize: 13.5)),
            ]),
          ),
        ],
      ),
    );
  }
}
