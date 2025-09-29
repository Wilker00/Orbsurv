import 'package:flutter/material.dart';

import 'screens/home/home_screen.dart';
import 'theme.dart';

class OrbsurvApp extends StatefulWidget {
  const OrbsurvApp({super.key});

  @override
  State<OrbsurvApp> createState() => _OrbsurvAppState();
}

class _OrbsurvAppState extends State<OrbsurvApp> {
  late ThemeMode _themeMode;

  @override
  void initState() {
    super.initState();
    final brightness = WidgetsBinding.instance.platformDispatcher.platformBrightness;
    _themeMode = brightness == Brightness.dark ? ThemeMode.dark : ThemeMode.light;
  }

  void _handleThemeToggle(bool shouldUseDark) {
    setState(() {
      _themeMode = shouldUseDark ? ThemeMode.dark : ThemeMode.light;
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Orbsurv Mobile',
      debugShowCheckedModeBanner: false,
      theme: OrbsurvTheme.light,
      darkTheme: OrbsurvTheme.dark,
      themeMode: _themeMode,
      home: HomeScreen(
        isDarkMode: _themeMode == ThemeMode.dark,
        onThemeModeChanged: _handleThemeToggle,
      ),
    );
  }
}
