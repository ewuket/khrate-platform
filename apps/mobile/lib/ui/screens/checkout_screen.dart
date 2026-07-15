import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/api_client.dart';
import '../../core/format.dart';
import '../../core/providers.dart';
import '../../models.dart';
import '../../theme.dart';

/// Manual Mobile Money checkout (launch model). Honest: the payment isn't instant — the
/// customer pays to the KHRATE number, submits their reference, and a person confirms it.
///
/// The KHRATE MoMo number below is SAMPLE data — the real merchant number is a
/// founder-provided launch configuration.
const _khrateMomo = '*182*8*1*123456#  ·  0788 000 000 [SAMPLE]';

class CheckoutScreen extends ConsumerStatefulWidget {
  const CheckoutScreen({super.key, required this.orderId});
  final String orderId;
  @override
  ConsumerState<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends ConsumerState<CheckoutScreen> {
  CustomerOrder? _order;
  final _ref = TextEditingController();
  String? _error;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    ref.read(repoProvider).order(widget.orderId).then((o) {
      if (mounted) setState(() => _order = o);
    }).catchError((e) {
      if (mounted) setState(() => _error = ApiClient.messageFrom(e));
    });
  }

  Future<void> _submit() async {
    setState(() { _busy = true; _error = null; });
    try {
      await ref.read(repoProvider).submitPaymentRef(widget.orderId, _ref.text.trim());
      if (mounted) context.go('/orders/${widget.orderId}');
    } catch (e) {
      setState(() => _error = ApiClient.messageFrom(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final order = _order;
    return Scaffold(
      appBar: AppBar(leading: const BackButton()),
      body: order == null
          ? Center(child: _error != null ? Text(_error!, style: const TextStyle(color: Khrate.danger)) : const CircularProgressIndicator())
          : SafeArea(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                children: [
                  const Text('Pay with Mobile Money', style: TextStyle(fontSize: 26, fontWeight: FontWeight.w900)),
                  const SizedBox(height: 6),
                  Text('Your spot in ${cleanSample(order.title)} is reserved. Complete payment to confirm it.', style: TextStyle(color: Khrate.n500)),
                  const SizedBox(height: 16),
                  Card(child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, crossAxisAlignment: CrossAxisAlignment.end, children: [
                      Text('Amount to pay', style: TextStyle(color: Khrate.n500)),
                      Text(rwf(order.total), style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w900)),
                    ]),
                  )),
                  const SizedBox(height: 20),
                  Text('HOW TO PAY', style: TextStyle(color: Khrate.n500, fontWeight: FontWeight.w800, fontSize: 13, letterSpacing: 0.5)),
                  const SizedBox(height: 8),
                  _step('1', 'Open Mobile Money and send ${rwf(order.total)} to KHRATE:'),
                  Container(
                    margin: const EdgeInsets.symmetric(vertical: 8),
                    padding: const EdgeInsets.all(14),
                    width: double.infinity,
                    decoration: BoxDecoration(color: Khrate.brand50, borderRadius: BorderRadius.circular(12)),
                    child: Text(_khrateMomo, textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w800)),
                  ),
                  _step('2', 'Copy the transaction reference from the confirmation message.'),
                  _step('3', 'Paste it below so we can confirm your payment.'),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _ref,
                    textCapitalization: TextCapitalization.characters,
                    decoration: const InputDecoration(labelText: 'Mobile Money transaction reference', hintText: 'e.g. MP240714.1234.A56789'),
                    onChanged: (_) => setState(() {}),
                  ),
                  if (_error != null) Padding(padding: const EdgeInsets.only(top: 10), child: Text(_error!, style: const TextStyle(color: Khrate.danger))),
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: (_busy || _ref.text.trim().length < 3) ? null : _submit,
                    child: _busy ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('I’ve paid — confirm my order'),
                  ),
                  const SizedBox(height: 14),
                  Text('A KHRATE team member checks your reference against our Mobile Money account before we buy '
                      'your groceries. If the group doesn’t succeed, you’re refunded in full.',
                      style: TextStyle(color: Khrate.n500, fontSize: 13)),
                ],
              ),
            ),
    );
  }

  Widget _step(String n, String text) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('$n. ', style: const TextStyle(fontWeight: FontWeight.w800)),
          Expanded(child: Text(text)),
        ]),
      );
}
