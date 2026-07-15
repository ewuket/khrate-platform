import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/api_client.dart';
import '../../core/format.dart';
import '../../core/providers.dart';
import '../../core/share.dart';
import '../../models.dart';
import '../../theme.dart';

/// Order tracking — the operational reality told as a simple, honest journey. Polls while
/// open so the customer sees status changes (payment verified, group confirmed) live.
class OrderDetailScreen extends ConsumerStatefulWidget {
  const OrderDetailScreen({super.key, required this.orderId});
  final String orderId;
  @override
  ConsumerState<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

const _stages = [
  ('confirming_payment', 'Payment confirmed'),
  ('gathering_group', 'Group gathering'),
  ('confirmed', 'Group confirmed'),
  ('preparing', 'Being prepared'),
  ('on_the_way', 'On the way'),
  ('delivered', 'Delivered'),
];
const _order = ['confirming_payment', 'gathering_group', 'confirmed', 'preparing', 'on_the_way', 'delivered'];

class _OrderDetailScreenState extends ConsumerState<OrderDetailScreen> {
  CustomerOrder? _o;
  String? _error;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _load();
    _timer = Timer.periodic(const Duration(seconds: 15), (_) => _load());
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final o = await ref.read(repoProvider).order(widget.orderId);
      if (mounted) setState(() => _o = o);
    } catch (e) {
      if (mounted && _o == null) setState(() => _error = ApiClient.messageFrom(e));
    }
  }

  @override
  Widget build(BuildContext context) {
    final o = _o;
    return Scaffold(
      appBar: AppBar(leading: BackButton(onPressed: () => context.canPop() ? context.pop() : context.go('/orders'))),
      body: o == null
          ? Center(child: _error != null ? Text(_error!, style: const TextStyle(color: Khrate.danger)) : const CircularProgressIndicator())
          : RefreshIndicator(
              color: Khrate.brand,
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                children: [
                  Text(cleanSample(o.title), style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900)),
                  Text(rwf(o.total), style: TextStyle(color: Khrate.n500)),
                  const SizedBox(height: 14),
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: o.status.key == 'refunded' ? Khrate.n100 : Khrate.fresh100,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: RichText(
                      text: TextSpan(style: TextStyle(color: o.status.key == 'refunded' ? Khrate.ink : Khrate.fresh600, fontSize: 14.5, height: 1.4), children: [
                        TextSpan(text: '${o.status.label}. ', style: const TextStyle(fontWeight: FontWeight.w800)),
                        TextSpan(text: o.status.detail),
                      ]),
                    ),
                  ),
                  if (o.status.key != 'refunded') ...[
                    const SizedBox(height: 20),
                    Text('PROGRESS', style: TextStyle(color: Khrate.n500, fontWeight: FontWeight.w800, fontSize: 13, letterSpacing: 0.5)),
                    const SizedBox(height: 10),
                    _timeline(o.status.key),
                  ],
                  const SizedBox(height: 18),
                  Text('YOUR ITEMS', style: TextStyle(color: Khrate.n500, fontWeight: FontWeight.w800, fontSize: 13, letterSpacing: 0.5)),
                  const SizedBox(height: 8),
                  Card(child: Padding(padding: const EdgeInsets.symmetric(horizontal: 16), child: Column(children: [
                    for (final it in o.items)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        child: Row(children: [
                          Expanded(child: Text(cleanSample(it['name']), style: const TextStyle(fontWeight: FontWeight.w600))),
                          Text('×${it['quantity']}', style: const TextStyle(fontWeight: FontWeight.w700)),
                        ]),
                      ),
                    if (o.dropPoint != null)
                      Padding(
                        padding: const EdgeInsets.only(top: 4, bottom: 14),
                        child: Row(children: [Text('📍 Collect at ${cleanSample(o.dropPoint!)}', style: TextStyle(color: Khrate.n500))]),
                      ),
                  ]))),
                  if (o.status.key == 'gathering_group') ...[
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(color: Khrate.brand50, borderRadius: BorderRadius.circular(12)),
                      child: Text('The sooner the group fills, the sooner it’s confirmed. Invite a neighbour — you both win.', style: TextStyle(color: Khrate.n500)),
                    ),
                    const SizedBox(height: 10),
                    FilledButton.icon(
                      style: FilledButton.styleFrom(backgroundColor: const Color(0xFF25D366)),
                      onPressed: shareInviteOnWhatsApp,
                      icon: const Icon(Icons.share),
                      label: const Text('Share on WhatsApp'),
                    ),
                  ],
                ],
              ),
            ),
    );
  }

  Widget _timeline(String currentKey) {
    final currentIdx = _order.indexOf(currentKey);
    return Column(
      children: [
        for (var i = 0; i < _stages.length; i++)
          _timelineStep(
            label: _stages[i].$2,
            done: _order.indexOf(_stages[i].$1) < currentIdx,
            current: _order.indexOf(_stages[i].$1) == currentIdx,
            detail: _order.indexOf(_stages[i].$1) == currentIdx ? _o!.status.detail : null,
            last: i == _stages.length - 1,
          ),
      ],
    );
  }

  Widget _timelineStep({required String label, required bool done, required bool current, String? detail, required bool last}) {
    final color = done ? Khrate.fresh : (current ? Khrate.brand : Khrate.n200);
    return IntrinsicHeight(
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Column(children: [
          Container(width: 14, height: 14, margin: const EdgeInsets.only(top: 3),
              decoration: BoxDecoration(color: color, shape: BoxShape.circle, boxShadow: current ? [BoxShadow(color: Khrate.brand100, blurRadius: 0, spreadRadius: 3)] : null)),
          if (!last) Expanded(child: Container(width: 2, color: Khrate.n100)),
        ]),
        const SizedBox(width: 14),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.only(bottom: 18),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(label, style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: (done || current) ? Khrate.ink : Khrate.n200)),
              if (detail != null) Padding(padding: const EdgeInsets.only(top: 2), child: Text(detail, style: TextStyle(color: Khrate.n500, fontSize: 13))),
            ]),
          ),
        ),
      ]),
    );
  }
}
