import 'package:flutter/material.dart';
import '../../theme.dart';

/// Honest progress-to-tip bar. Green when the group price is unlocked, orange while
/// gathering. Never shows a fabricated value — the fraction comes straight from the API.
class TipProgress extends StatelessWidget {
  const TipProgress({super.key, required this.fraction, required this.unlocked});
  final double fraction;
  final bool unlocked;

  @override
  Widget build(BuildContext context) {
    final pct = (fraction.clamp(0, 1) * 100).round();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(999),
          child: LinearProgressIndicator(
            value: fraction.clamp(0.04, 1).toDouble(),
            minHeight: 10,
            backgroundColor: Khrate.n100,
            valueColor: AlwaysStoppedAnimation(unlocked ? Khrate.fresh : Khrate.brand),
          ),
        ),
        const SizedBox(height: 6),
        Text(
          unlocked ? '✓ Group price unlocked' : '$pct% of the way there',
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: unlocked ? Khrate.fresh600 : Khrate.n500,
          ),
        ),
      ],
    );
  }
}
