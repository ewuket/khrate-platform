import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/api_client.dart';
import '../../core/format.dart';
import '../../core/providers.dart';
import '../../models.dart';
import '../../theme.dart';

class DealScreen extends ConsumerStatefulWidget {
  const DealScreen({super.key, required this.dealId});
  final String dealId;
  @override
  ConsumerState<DealScreen> createState() => _DealScreenState();
}

class _DealScreenState extends ConsumerState<DealScreen> {
  Deal? _deal;
  String? _error;
  final Map<String, int> _qty = {};
  String? _fulfilmentId;
  bool _busy = false;
  // One idempotency key per checkout attempt — reused across retries so a dropped
  // connection can't create a second order (ADR-0015).
  String? _idemKey;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final d = await ref.read(repoProvider).deal(widget.dealId);
      if (!mounted) return;
      setState(() {
        _deal = d;
        if (d != null && d.fulfilment.length == 1) _fulfilmentId = d.fulfilment.first.id;
        if (d == null) _error = 'This deal has closed or is no longer available.';
      });
    } catch (e) {
      if (mounted) setState(() => _error = ApiClient.messageFrom(e));
    }
  }

  int get _subtotal => _deal == null ? 0 : _deal!.lines.fold(0, (s, l) => s + (_qty[l.id] ?? 0) * l.groupPrice);
  int get _units => _qty.values.fold(0, (a, b) => a + b);

  Future<void> _reserve() async {
    final deal = _deal;
    if (deal == null || _units == 0) return;
    if (_fulfilmentId == null) {
      setState(() => _error = 'Please choose where to collect your groceries.');
      return;
    }
    if (!ref.read(sessionProvider)) {
      // Preserve the basket in memory and sign in, then return to this screen.
      final result = await context.push<bool>('/auth?next=/deals/${widget.dealId}');
      if (result != true || !ref.read(sessionProvider)) return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    _idemKey ??= ApiClient.newIdempotencyKey();
    try {
      final ful = deal.fulfilment.firstWhere((f) => f.id == _fulfilmentId);
      final order = await ref.read(repoProvider).join(
            dealId: deal.id,
            idempotencyKey: _idemKey!,
            fulfilmentMode: ful.mode,
            fulfilmentOptionId: ful.id,
            locationId: ful.locationId,
            lines: [
              for (final l in deal.lines)
                if ((_qty[l.id] ?? 0) > 0) {'dealLineId': l.id, 'quantity': _qty[l.id]},
            ],
          );
      if (mounted) context.go('/checkout/${order.id}');
    } catch (e) {
      // The idempotency key is retained, so tapping again resumes the same order safely.
      if (mounted) setState(() => _error = ApiClient.messageFrom(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final deal = _deal;
    return Scaffold(
      appBar: AppBar(leading: BackButton(onPressed: () => context.pop())),
      body: deal == null
          ? Center(
              child: _error != null
                  ? Text(_error!, style: const TextStyle(color: Khrate.danger))
                  : const CircularProgressIndicator(),
            )
          : SafeArea(
              child: Column(
                children: [
                  Expanded(
                    child: ListView(
                      padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
                      children: [
                        Text(cleanSample(deal.title), style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900)),
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(color: Khrate.fresh100, borderRadius: BorderRadius.circular(12)),
                          child: Text('You only pay if the group succeeds. If it doesn’t reach its goal by the '
                              'deadline, you’re refunded in full.', style: TextStyle(color: Khrate.fresh600)),
                        ),
                        const SizedBox(height: 18),
                        Text('CHOOSE YOUR ITEMS', style: TextStyle(color: Khrate.n500, fontWeight: FontWeight.w800, fontSize: 13, letterSpacing: 0.5)),
                        const SizedBox(height: 8),
                        Card(child: Padding(padding: const EdgeInsets.symmetric(horizontal: 16), child: Column(
                          children: [
                            for (final l in deal.lines) _lineRow(l),
                          ],
                        ))),
                        const SizedBox(height: 18),
                        Text('WHERE TO COLLECT', style: TextStyle(color: Khrate.n500, fontWeight: FontWeight.w800, fontSize: 13, letterSpacing: 0.5)),
                        const SizedBox(height: 8),
                        for (final f in deal.fulfilment) _fulfilmentRow(f),
                        if (_error != null) Padding(padding: const EdgeInsets.only(top: 12), child: Text(_error!, style: const TextStyle(color: Khrate.danger, fontWeight: FontWeight.w600))),
                      ],
                    ),
                  ),
                  _actionBar(),
                ],
              ),
            ),
    );
  }

  Widget _lineRow(DealLine l) {
    final q = _qty[l.id] ?? 0;
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12),
      decoration: BoxDecoration(border: Border(bottom: BorderSide(color: Khrate.n100))),
      child: Row(children: [
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('${l.isBundle ? '🧺 ' : ''}${cleanSample(l.name)}', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
            const SizedBox(height: 2),
            Row(children: [
              Text(rwf(l.groupPrice), style: const TextStyle(fontWeight: FontWeight.w800)),
              if (l.saving > 0) ...[
                const SizedBox(width: 6),
                Text(rwf(l.soloPrice), style: TextStyle(color: Khrate.n500, fontSize: 13, decoration: TextDecoration.lineThrough)),
                const SizedBox(width: 6),
                Text('save ${rwf(l.saving)}', style: TextStyle(color: Khrate.fresh600, fontWeight: FontWeight.w700, fontSize: 13)),
              ],
            ]),
          ]),
        ),
        _stepper(l.id, q),
      ]),
    );
  }

  Widget _stepper(String id, int q) {
    return Container(
      decoration: BoxDecoration(border: Border.all(color: Khrate.n200), borderRadius: BorderRadius.circular(10)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        _stepBtn(Icons.remove, () => setState(() => _qty[id] = (q - 1).clamp(0, 99))),
        SizedBox(width: 30, child: Text('$q', textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w700))),
        _stepBtn(Icons.add, () => setState(() => _qty[id] = q + 1)),
      ]),
    );
  }

  Widget _stepBtn(IconData ic, VoidCallback onTap) => InkWell(
        onTap: onTap,
        child: SizedBox(width: 38, height: 38, child: Icon(ic, color: Khrate.brand600, size: 20)),
      );

  Widget _fulfilmentRow(Fulfilment f) {
    final selected = _fulfilmentId == f.id;
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Card(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: selected ? Khrate.brand : Colors.transparent, width: 2),
        ),
        child: InkWell(
          onTap: () => setState(() => _fulfilmentId = f.id),
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(children: [
              Text(f.mode == 'HOME_DELIVERY' ? '🏠' : '📍', style: const TextStyle(fontSize: 20)),
              const SizedBox(width: 10),
              Expanded(child: Text(f.location != null ? cleanSample(f.location!) : _modeLabel(f.mode), style: const TextStyle(fontWeight: FontWeight.w700))),
              if (selected) Icon(Icons.check_circle, color: Khrate.brand, size: 20),
            ]),
          ),
        ),
      ),
    );
  }

  Widget _actionBar() {
    return Container(
      padding: EdgeInsets.fromLTRB(20, 12, 20, 12 + MediaQuery.of(context).padding.bottom),
      decoration: const BoxDecoration(color: Khrate.cream),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Text('$_units item${_units == 1 ? '' : 's'}', style: TextStyle(color: Khrate.n500)),
          Text(rwf(_subtotal), style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900)),
        ]),
        const SizedBox(height: 10),
        FilledButton(
          onPressed: _units == 0 || _busy ? null : _reserve,
          child: _busy
              ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : Text(_units == 0 ? 'Add items to join' : 'Reserve my spot'),
        ),
      ]),
    );
  }

  String _modeLabel(String m) => const {
        'HOME_DELIVERY': 'Home delivery',
        'DROP_POINT': 'Neighbourhood drop point',
        'APARTMENT': 'Apartment delivery',
        'OFFICE': 'Office delivery',
        'CAMPUS': 'Campus pickup',
        'PICKUP_LOCATION': 'KHRATE pickup point',
      }[m] ?? m;
}
