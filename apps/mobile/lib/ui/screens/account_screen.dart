import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/format.dart';
import '../../core/providers.dart';
import '../../core/share.dart';
import '../../theme.dart';

class AccountScreen extends ConsumerWidget {
  const AccountScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final zone = ref.watch(zoneProvider);
    final signedIn = ref.watch(sessionProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Account')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Card(child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Delivery area', style: TextStyle(color: Khrate.n500)),
              const SizedBox(height: 2),
              Text('📍 ${zone != null ? cleanSample(zone.name) : 'Not chosen yet'}', style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
              const SizedBox(height: 12),
              OutlinedButton(onPressed: () => context.push('/location'), child: const Text('Change area')),
            ]),
          )),
          const SizedBox(height: 18),
          Text('HELP', style: TextStyle(color: Khrate.n500, fontWeight: FontWeight.w800, fontSize: 13, letterSpacing: 0.5)),
          const SizedBox(height: 8),
          Card(child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Questions about an order? Reach KHRATE support on WhatsApp — missing items, refunds, or delivery timing.', style: TextStyle(color: Khrate.n500)),
              const SizedBox(height: 12),
              FilledButton.icon(
                style: FilledButton.styleFrom(backgroundColor: const Color(0xFF25D366), minimumSize: const Size(0, 44)),
                onPressed: contactSupportOnWhatsApp,
                icon: const Icon(Icons.chat, size: 18),
                label: const Text('Chat with support'),
              ),
            ]),
          )),
          const SizedBox(height: 24),
          if (signedIn)
            OutlinedButton(
              onPressed: () async {
                await ref.read(sessionProvider.notifier).signOut();
              },
              child: const Text('Sign out'),
            )
          else
            FilledButton(onPressed: () => context.push('/auth?next=/account'), child: const Text('Sign in')),
        ],
      ),
    );
  }
}
