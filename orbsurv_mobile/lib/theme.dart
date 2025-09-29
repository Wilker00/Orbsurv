import 'package:flutter/material.dart';

class OrbsurvTheme {
  static const Color _ink = Color(0xFF111827);
  static const Color _offWhite = Color(0xFFF9FAFB);
  static const Color _lightGray = Color(0xFFE5E7EB);
  static const Color _accentStart = Color(0xFFFECACA);
  static const Color _accentEnd = Color(0xFFFEF3C7);

  static ThemeData get light => _buildTheme(brightness: Brightness.light);
  static ThemeData get dark => _buildTheme(brightness: Brightness.dark);

  static ThemeData _buildTheme({required Brightness brightness}) {
    final bool isDark = brightness == Brightness.dark;
    final ColorScheme baseScheme = ColorScheme.fromSeed(
      seedColor: _ink,
      brightness: brightness,
    );

    final ColorScheme scheme = baseScheme.copyWith(
      secondary: _accentStart,
      tertiary: _accentEnd,
      surface: isDark ? const Color(0xFF1F2937) : Colors.white,
      onSurface: isDark ? Colors.white : _ink,
      surfaceContainerHighest: isDark ? const Color(0xFF0F172A) : _offWhite,
    );

    final ThemeData base = ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: scheme,
      scaffoldBackgroundColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFFDFDFE),
    );

    final TextTheme textTheme = base.textTheme.apply(
      bodyColor: scheme.onSurface,
      displayColor: scheme.onSurface,
    ).copyWith(
      headlineLarge: base.textTheme.headlineLarge?.copyWith(
        fontWeight: FontWeight.w700,
        letterSpacing: -0.8,
      ),
      headlineMedium: base.textTheme.headlineMedium?.copyWith(
        fontWeight: FontWeight.w700,
        letterSpacing: -0.6,
      ),
      titleLarge: base.textTheme.titleLarge?.copyWith(
        fontWeight: FontWeight.w600,
      ),
      labelLarge: base.textTheme.labelLarge?.copyWith(
        fontWeight: FontWeight.w600,
      ),
    );

    final OutlineInputBorder border = OutlineInputBorder(
      borderRadius: BorderRadius.circular(28),
      borderSide: BorderSide(
        color: isDark ? const Color(0xFF374151) : _lightGray,
      ),
    );

    return base.copyWith(
      textTheme: textTheme,
      appBarTheme: AppBarTheme(
        backgroundColor: isDark ? const Color(0xFF111827) : Colors.white.withValues(alpha: 0.93),
        foregroundColor: isDark ? Colors.white : _ink,
        elevation: 0,
        titleTextStyle: textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
      ),
      cardTheme: CardThemeData(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
        elevation: isDark ? 2 : 3,
        margin: EdgeInsets.zero,
        clipBehavior: Clip.antiAlias,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: _ink,
          foregroundColor: Colors.white,
          shape: const StadiumBorder(),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          textStyle: textTheme.labelLarge,
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          shape: const StadiumBorder(),
          side: BorderSide(color: isDark ? Colors.white70 : _ink.withValues(alpha: 0.4)),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          textStyle: textTheme.labelLarge,
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          shape: const StadiumBorder(),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          textStyle: textTheme.labelLarge,
        ),
      ),
      chipTheme: ChipThemeData(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
        labelStyle: textTheme.labelLarge?.copyWith(
          color: scheme.onSurface.withValues(alpha: 0.8),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        side: BorderSide.none,
        backgroundColor: isDark ? const Color(0xFF374151) : _offWhite,
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: isDark ? const Color(0xFF111827) : _ink,
        contentTextStyle: const TextStyle(
          color: Colors.white,
          fontWeight: FontWeight.w600,
        ),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
      inputDecorationTheme: base.inputDecorationTheme.copyWith(
        filled: true,
        fillColor: isDark ? const Color(0xFF111827) : _offWhite,
        border: border,
        enabledBorder: border,
        focusedBorder: border.copyWith(
          borderSide: BorderSide(color: isDark ? Colors.white70 : _ink),
        ),
        errorBorder: border.copyWith(
          borderSide: BorderSide(color: Colors.red.shade400),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
      ),
      dividerTheme: DividerThemeData(
        space: 32,
        thickness: 1,
        color: isDark ? const Color(0xFF1F2937) : _lightGray,
      ),
    );
  }

  static LinearGradient get heroGradient => const LinearGradient(
        colors: [_accentStart, _accentEnd],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      );
}
