import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/api_client.dart';
import '../../core/providers.dart';
import '../../theme.dart';

/// Phone + OTP sign-in. Two calm steps, no password. In non-production the backend returns
/// the code; we surface it as a clearly-labelled dev hint (never in production).
class AuthScreen extends ConsumerStatefulWidget {
  const AuthScreen({super.key, required this.next});
  final String next;
  @override
  ConsumerState<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends ConsumerState<AuthScreen> {
  final _phone = TextEditingController(text: '+250');
  final _code = TextEditingController();
  bool _codeStep = false;
  String? _devCode;
  String? _error;
  bool _busy = false;

  Future<void> _request() async {
    setState(() { _busy = true; _error = null; });
    try {
      final res = await ref.read(repoProvider).requestOtp(_phone.text.trim());
      setState(() { _devCode = res['devCode']; _codeStep = true; });
    } catch (e) {
      setState(() => _error = ApiClient.messageFrom(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _verify() async {
    setState(() { _busy = true; _error = null; });
    try {
      await ref.read(repoProvider).verifyOtp(_phone.text.trim(), _code.text.trim());
      ref.read(sessionProvider.notifier).setSignedIn();
      if (!mounted) return;
      // Return control to the caller (deal screen) which resumes the reserved basket.
      if (context.canPop()) {
        context.pop(true);
      } else {
        context.go(widget.next);
      }
    } catch (e) {
      setState(() => _error = ApiClient.messageFrom(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(leading: const BackButton()),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: _codeStep ? _codeView() : _phoneView(),
        ),
      ),
    );
  }

  Widget _phoneView() => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const SizedBox(height: 8),
        const Text('Enter your phone', style: TextStyle(fontSize: 26, fontWeight: FontWeight.w900)),
        const SizedBox(height: 6),
        Text('We’ll text you a 6-digit code to confirm it’s you. No password to remember.', style: TextStyle(color: Khrate.n500)),
        const SizedBox(height: 20),
        TextField(
          controller: _phone,
          keyboardType: TextInputType.phone,
          decoration: const InputDecoration(labelText: 'Mobile number', hintText: '+250 7xx xxx xxx'),
        ),
        if (_error != null) Padding(padding: const EdgeInsets.only(top: 10), child: Text(_error!, style: const TextStyle(color: Khrate.danger))),
        const SizedBox(height: 20),
        FilledButton(onPressed: _busy ? null : _request, child: _busy ? _spinner() : const Text('Send code')),
      ]);

  Widget _codeView() => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const SizedBox(height: 8),
        const Text('Enter the code', style: TextStyle(fontSize: 26, fontWeight: FontWeight.w900)),
        const SizedBox(height: 6),
        Row(children: [
          Text('Sent to ${_phone.text}. ', style: TextStyle(color: Khrate.n500)),
          GestureDetector(onTap: () => setState(() => _codeStep = false), child: Text('Change', style: TextStyle(color: Khrate.brand600, fontWeight: FontWeight.w700))),
        ]),
        const SizedBox(height: 20),
        TextField(
          controller: _code,
          keyboardType: TextInputType.number,
          maxLength: 6,
          textAlign: TextAlign.center,
          style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w700, letterSpacing: 8),
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          decoration: const InputDecoration(counterText: '', hintText: '••••••'),
          onChanged: (_) => setState(() {}),
        ),
        if (_devCode != null)
          Container(
            margin: const EdgeInsets.only(top: 12),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: Khrate.brand50, borderRadius: BorderRadius.circular(12)),
            child: Text('Development mode — your code is $_devCode. (In production this arrives by SMS/WhatsApp and is never shown here.)',
                style: TextStyle(color: Khrate.n500, fontSize: 13)),
          ),
        if (_error != null) Padding(padding: const EdgeInsets.only(top: 10), child: Text(_error!, style: const TextStyle(color: Khrate.danger))),
        const SizedBox(height: 20),
        FilledButton(onPressed: (_busy || _code.text.length != 6) ? null : _verify, child: _busy ? _spinner() : const Text('Confirm')),
      ]);

  Widget _spinner() => const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white));
}
