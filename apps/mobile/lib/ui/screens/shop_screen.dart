import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/api_client.dart';
import '../../core/format.dart';
import '../../core/providers.dart';
import '../../models.dart';
import '../../theme.dart';
import '../widgets/progress.dart';

class ShopScreen extends ConsumerStatefulWidget {
  const ShopScreen({super.key});
  @override
  ConsumerState<ShopScreen> createState() => _ShopScreenState();
}

class _ShopScreenState extends ConsumerState<ShopScreen> {
  Future<List<Deal>>? _future;

  void _load() {
    final zone = ref.read(zoneProvider);
    if (zone != null) _future = ref.read(repoProvider).deals(zone.id);
  }

  @override
  Widget build(BuildContext context) {
    final zone = ref.watch(zoneProvider);
    if (zone == null) {
      WidgetsBinding.instance.addPostFrameCallback((_) => context.go('/location'));
      return const SizedBox();
    }
    _future ??= ref.read(repoProvider).deals(zone.id);

    return Scaffold(
      appBar: AppBar(
        title: Row(children: [
          Text('KHRATE', style: TextStyle(color: Khrate.brand600, fontWeight: FontWeight.w900)),
          Text('.', style: TextStyle(color: Khrate.fresh, fontWeight: FontWeight.w900)),
        ]),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: ActionChip(
              backgroundColor: Khrate.brand50,
              side: BorderSide(color: Khrate.brand100),
              label: Text('📍 ${cleanSample(zone.name)}', style: TextStyle(color: Khrate.brand600, fontSize: 13, fontWeight: FontWeight.w600)),
              onPressed: () => context.go('/location'),
            ),
          ),
        ],
      ),
      body: RefreshIndicator(
        color: Khrate.brand,
        onRefresh: () async {
          setState(_load);
          await _future;
        },
        child: FutureBuilder<List<Deal>>(
          future: _future,
          builder: (context, snap) {
            if (snap.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snap.hasError) {
              return ListView(children: [
                const SizedBox(height: 80),
                Center(child: Text(ApiClient.messageFrom(snap.error!), style: const TextStyle(color: Khrate.danger))),
                const SizedBox(height: 12),
                Center(child: OutlinedButton(onPressed: () => setState(_load), child: const Text('Try again'))),
              ]);
            }
            final deals = snap.data ?? [];
            return ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
              children: [
                const Text('Today’s group deals', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900)),
                Text('Join before the deadline to unlock the group price.', style: TextStyle(color: Khrate.n500)),
                const SizedBox(height: 16),
                if (deals.isEmpty)
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(color: Khrate.brand50, borderRadius: BorderRadius.circular(12)),
                    child: Text('No open deals in your area right now. New deals open through the day — check back soon.',
                        style: TextStyle(color: Khrate.n500)),
                  ),
                for (final d in deals) _DealCard(deal: d),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _DealCard extends StatelessWidget {
  const _DealCard({required this.deal});
  final Deal deal;
  @override
  Widget build(BuildContext context) {
    final bestSaving = deal.lines.fold<int>(0, (m, l) => l.saving > m ? l.saving : m);
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Card(
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: () => context.push('/deals/${deal.id}'),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: double.infinity,
                padding: const EdgeInsets.fromLTRB(16, 14, 16, 12),
                decoration: BoxDecoration(gradient: LinearGradient(colors: [Khrate.brand50, Colors.white], begin: Alignment.topCenter, end: Alignment.bottomCenter)),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(cleanSample(deal.title), style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 6),
                  Wrap(spacing: 8, children: [
                    _Chip(text: '⏱ ${untilClose(deal.cutoffAt)}', bg: Khrate.brand50, fg: Khrate.brand600),
                    if (bestSaving > 0) _Chip(text: 'Save up to ${rwf(bestSaving)}', bg: Khrate.fresh100, fg: Khrate.fresh600),
                  ]),
                ]),
              ),
              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  for (final l in deal.lines.take(3))
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Row(children: [
                        Expanded(child: Text('${l.isBundle ? '🧺 ' : ''}${cleanSample(l.name)}', style: const TextStyle(fontWeight: FontWeight.w600))),
                        Text(rwf(l.groupPrice), style: const TextStyle(fontWeight: FontWeight.w800)),
                        if (l.saving > 0) ...[
                          const SizedBox(width: 6),
                          Text(rwf(l.soloPrice), style: TextStyle(color: Khrate.n500, fontSize: 13, decoration: TextDecoration.lineThrough)),
                        ],
                      ]),
                    ),
                  const SizedBox(height: 6),
                  TipProgress(fraction: deal.progress, unlocked: deal.unlocked),
                  if (!deal.unlocked)
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text(
                        deal.participants == 0 ? 'Be the first to join' : '${deal.participants} neighbour${deal.participants == 1 ? '' : 's'} in',
                        style: TextStyle(color: Khrate.n500, fontSize: 13),
                      ),
                    ),
                ]),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip({required this.text, required this.bg, required this.fg});
  final String text;
  final Color bg, fg;
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(999)),
        child: Text(text, style: TextStyle(color: fg, fontSize: 12, fontWeight: FontWeight.w700)),
      );
}
