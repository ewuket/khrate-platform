import 'package:url_launcher/url_launcher.dart';

/// WhatsApp is the dominant messaging channel in the market — it's how the group-buying
/// invite loop spreads and how customers reach support. These open the real app.

/// Invite neighbours to join deals (the community-growth loop). Honest copy — no fake
/// urgency, no fabricated numbers.
Future<void> shareInviteOnWhatsApp() async {
  const text = 'I’m buying groceries cheaper on KHRATE by joining with neighbours 🧺🥬 '
      'Join a group deal before it closes and we all pay less.';
  final uri = Uri.parse('https://wa.me/?text=${Uri.encodeComponent(text)}');
  await launchUrl(uri, mode: LaunchMode.externalApplication);
}

/// KHRATE support line. The number is SAMPLE — the real support number is a founder-provided
/// launch configuration.
Future<void> contactSupportOnWhatsApp() async {
  final uri = Uri.parse('https://wa.me/250788000000'); // [SAMPLE] number
  await launchUrl(uri, mode: LaunchMode.externalApplication);
}
