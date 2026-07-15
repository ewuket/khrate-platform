import 'package:flutter/material.dart';

/// KHRATE brand as a Flutter theme. Same identity as web (orange, warm cream, fresh
/// green) but expressed natively — Material 3, generous touch targets, high contrast for
/// bright outdoor use on affordable phones.
class Khrate {
  static const brand = Color(0xFFF26A1B);
  static const brand600 = Color(0xFFDB550C);
  static const brand50 = Color(0xFFFFF5EC);
  static const brand100 = Color(0xFFFFE7D1);
  static const fresh = Color(0xFF2FA968);
  static const fresh600 = Color(0xFF21874F);
  static const fresh100 = Color(0xFFE4F6EC);
  static const cream = Color(0xFFFFF9F3);
  static const ink = Color(0xFF2A231C);
  static const n500 = Color(0xFF8C7F70);
  static const n200 = Color(0xFFE7DCCF);
  static const n100 = Color(0xFFF3EBE1);
  static const danger = Color(0xFFCF4141);

  static ThemeData theme() {
    final base = ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: brand,
        primary: brand,
        surface: cream,
      ),
      scaffoldBackgroundColor: cream,
      fontFamily: 'Roboto',
    );
    return base.copyWith(
      appBarTheme: const AppBarTheme(
        backgroundColor: cream,
        surfaceTintColor: Colors.transparent,
        foregroundColor: ink,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(color: ink, fontSize: 20, fontWeight: FontWeight.w800),
      ),
      cardTheme: CardThemeData(
        color: Colors.white,
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        margin: EdgeInsets.zero,
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: brand,
          foregroundColor: Colors.white,
          minimumSize: const Size.fromHeight(52),
          textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: n200),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: n200),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: brand, width: 2),
        ),
      ),
    );
  }
}
