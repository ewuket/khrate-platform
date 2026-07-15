/// Presentation helpers. RWF has no minor unit — whole numbers, grouped thousands.
String rwf(int minor) {
  final s = minor.abs().toString();
  final b = StringBuffer();
  for (var i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 == 0) b.write(',');
    b.write(s[i]);
  }
  return 'RWF ${minor < 0 ? '-' : ''}$b';
}

/// Honest countdown to a deal deadline.
String untilClose(DateTime cutoff) {
  final ms = cutoff.difference(DateTime.now()).inMilliseconds;
  if (ms <= 0) return 'closing now';
  final h = ms ~/ 3600000;
  final m = (ms % 3600000) ~/ 60000;
  if (h >= 24) return 'closes in ${h ~/ 24}d ${h % 24}h';
  if (h > 0) return 'closes in ${h}h ${m}m';
  return 'closes in ${m}m';
}

String cleanSample(String s) => s.replaceAll(' [SAMPLE]', '');
