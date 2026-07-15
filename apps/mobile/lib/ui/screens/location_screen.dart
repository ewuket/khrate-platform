import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/api_client.dart';
import '../../core/format.dart';
import '../../core/providers.dart';
import '../../models.dart';
import '../../theme.dart';

/// Location picker — the anchor of group buying. Decides which deals and drop points the
/// customer sees. Asked once, remembered.
class LocationScreen extends ConsumerStatefulWidget {
  const LocationScreen({super.key});
  @override
  ConsumerState<LocationScreen> createState() => _LocationScreenState();
}

class _LocationScreenState extends ConsumerState<LocationScreen> {
  late Future<List<Zone>> _future;
  @override
  void initState() {
    super.initState();
    _future = ref.read(repoProvider).zones();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(leading: BackButton(onPressed: () => context.go('/'))),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Where should we deliver?', style: TextStyle(fontSize: 26, fontWeight: FontWeight.w900)),
              const SizedBox(height: 6),
              Text('Choose your area. You’ll see the group deals and drop points near you.',
                  style: TextStyle(color: Khrate.n500)),
              const SizedBox(height: 18),
              Expanded(
                child: FutureBuilder<List<Zone>>(
                  future: _future,
                  builder: (context, snap) {
                    if (snap.connectionState == ConnectionState.waiting) {
                      return const Center(child: CircularProgressIndicator());
                    }
                    if (snap.hasError) {
                      return _Error(msg: ApiClient.messageFrom(snap.error!), onRetry: () => setState(() => _future = ref.read(repoProvider).zones()));
                    }
                    final zones = snap.data ?? [];
                    if (zones.isEmpty) {
                      return Text('KHRATE isn’t in your area yet — we’re expanding across Kigali.', style: TextStyle(color: Khrate.n500));
                    }
                    return ListView.separated(
                      itemCount: zones.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 12),
                      itemBuilder: (_, i) {
                        final z = zones[i];
                        return Card(
                          child: InkWell(
                            borderRadius: BorderRadius.circular(16),
                            onTap: () async {
                              await ref.read(zoneProvider.notifier).select(z);
                              if (context.mounted) context.go('/shop');
                            },
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                Text('📍 ${cleanSample(z.name)}', style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
                                const SizedBox(height: 4),
                                Text(
                                  '${z.dropPoints.length} drop point${z.dropPoints.length == 1 ? '' : 's'} · '
                                  '${z.dropPoints.map((d) => cleanSample(d.name)).join(', ')}',
                                  style: TextStyle(color: Khrate.n500, fontSize: 13.5),
                                ),
                              ]),
                            ),
                          ),
                        );
                      },
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Error extends StatelessWidget {
  const _Error({required this.msg, required this.onRetry});
  final String msg;
  final VoidCallback onRetry;
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        Text(msg, textAlign: TextAlign.center, style: const TextStyle(color: Khrate.danger)),
        const SizedBox(height: 12),
        OutlinedButton(onPressed: onRetry, child: const Text('Try again')),
      ]),
    );
  }
}
