import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/api_client.dart';
import '../../core/format.dart';
import '../../core/providers.dart';
import '../../models.dart';
import '../../theme.dart';

class OrdersScreen extends ConsumerStatefulWidget {
  const OrdersScreen({super.key});
  @override
  ConsumerState<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends ConsumerState<OrdersScreen> {
  Future<List<CustomerOrder>>? _future;

  @override
  Widget build(BuildContext context) {
    if (!ref.watch(sessionProvider)) {
      return Scaffold(
        appBar: AppBar(title: const Text('Your orders')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              Text('Sign in to see your orders.', style: TextStyle(color: Khrate.n500)),
              const SizedBox(height: 12),
              FilledButton(onPressed: () => context.push('/auth?next=/orders'), child: const Text('Sign in')),
            ]),
          ),
        ),
      );
    }
    _future ??= ref.read(repoProvider).myOrders();
    return Scaffold(
      appBar: AppBar(title: const Text('Your orders')),
      body: RefreshIndicator(
        color: Khrate.brand,
        onRefresh: () async {
          setState(() => _future = ref.read(repoProvider).myOrders());
          await _future;
        },
        child: FutureBuilder<List<CustomerOrder>>(
          future: _future,
          builder: (context, snap) {
            if (snap.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());
            if (snap.hasError) {
              return ListView(children: [const SizedBox(height: 80), Center(child: Text(ApiClient.messageFrom(snap.error!), style: const TextStyle(color: Khrate.danger)))]);
            }
            final orders = snap.data ?? [];
            if (orders.isEmpty) {
              return ListView(children: [
                const SizedBox(height: 60),
                Center(child: Text('No orders yet.', style: TextStyle(color: Khrate.n500))),
                const SizedBox(height: 12),
                Center(child: OutlinedButton(onPressed: () => context.go('/shop'), child: const Text('Browse deals'))),
              ]);
            }
            return ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: orders.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (_, i) {
                final o = orders[i];
                return Card(
                  child: InkWell(
                    onTap: () => context.push('/orders/${o.id}'),
                    borderRadius: BorderRadius.circular(16),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Row(children: [
                          Expanded(child: Text(cleanSample(o.title), style: const TextStyle(fontWeight: FontWeight.w800))),
                          _statusChip(o.status.key, o.status.label),
                        ]),
                        const SizedBox(height: 4),
                        Text(o.items.map((it) => '${it['quantity']}× ${cleanSample(it['name'])}').join(', '), style: TextStyle(color: Khrate.n500, fontSize: 13.5)),
                        const SizedBox(height: 8),
                        Text(rwf(o.total), style: const TextStyle(fontWeight: FontWeight.w800)),
                      ]),
                    ),
                  ),
                );
              },
            );
          },
        ),
      ),
    );
  }
}

Widget _statusChip(String key, String label) {
  Color bg = Khrate.brand50, fg = Khrate.brand600;
  if (['delivered', 'confirmed'].contains(key)) { bg = Khrate.fresh100; fg = Khrate.fresh600; }
  if (['refunded', 'cancelled'].contains(key)) { bg = Khrate.n100; fg = Khrate.n500; }
  return Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
    decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(999)),
    child: Text(label, style: TextStyle(color: fg, fontSize: 12, fontWeight: FontWeight.w700)),
  );
}
