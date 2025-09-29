import 'package:flutter/material.dart';

import 'package:orbsurv_mobile/services/form_service.dart';
import 'package:orbsurv_mobile/theme.dart';

import 'home_models.dart';
import 'interest_form_card.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({
    super.key,
    required this.onThemeModeChanged,
    required this.isDarkMode,
  });

  final ValueChanged<bool> onThemeModeChanged;
  final bool isDarkMode;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

enum _HomeSection { hero, product, details, demo, pilot, privacy }

class _HomeScreenState extends State<HomeScreen> {
  final ScrollController _scrollController = ScrollController();
  final OrbsurvFormsService _formsService = OrbsurvFormsService();
  final Map<_HomeSection, GlobalKey> _sectionKeys = {
    for (final section in _HomeSection.values) section: GlobalKey(),
  };

  int _selectedGalleryIndex = -1;
  String _selectedFeatureId = productFeatures.first.id;
  bool _showPrototypePanel = true;

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToSection(_HomeSection section) {
    final key = _sectionKeys[section];
    final context = key?.currentContext;
    if (context == null) return;
    Scrollable.ensureVisible(
      context,
      duration: const Duration(milliseconds: 600),
      curve: Curves.easeInOutCubic,
      alignment: 0.08,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: CustomScrollView(
        controller: _scrollController,
        slivers: [
          SliverAppBar(
            floating: true,
            pinned: true,
            title: const Text('Orbsurv'),
            actions: [
              IconButton(
                tooltip: widget.isDarkMode ? 'Switch to light mode' : 'Switch to dark mode',
                icon: Icon(widget.isDarkMode ? Icons.light_mode : Icons.dark_mode),
                onPressed: () => widget.onThemeModeChanged(!widget.isDarkMode),
              ),
              PopupMenuButton<_HomeSection>(
                tooltip: 'Jump to section',
                onSelected: _scrollToSection,
                itemBuilder: (context) => const [
                  PopupMenuItem(value: _HomeSection.hero, child: Text('Overview')),
                  PopupMenuItem(value: _HomeSection.product, child: Text('Product showcase')),
                  PopupMenuItem(value: _HomeSection.details, child: Text('How it works')),
                  PopupMenuItem(value: _HomeSection.demo, child: Text('Demo')),
                  PopupMenuItem(value: _HomeSection.pilot, child: Text('Pilot signup')),
                  PopupMenuItem(value: _HomeSection.privacy, child: Text('Privacy')),
                ],
              ),
              const SizedBox(width: 8),
            ],
          ),
          _wrapSection(
            section: _HomeSection.hero,
            child: Column(
              children: [
                const SizedBox(height: 32),
                _buildHeroSection(context),
                const SizedBox(height: 24),
                _buildTrustBar(context),
                const SizedBox(height: 24),
                InterestFormCard(
                  title: 'Join early interest',
                  description: 'Sign up to hear about our pilot program, feature drops, and exclusive launch invites.',
                  endpoint: '/api/interest',
                  ctaLabel: 'Get updates',
                  successMessage: 'Thanks for joining the early interest list!',
                  icon: Icons.mark_email_read_outlined,
                  formsService: _formsService,
                  extraPayload: const {'source': 'mobile-app'},
                ),
                const SizedBox(height: 48),
              ],
            ),
          ),
          _wrapSection(
            section: _HomeSection.product,
            child: Column(
              children: [
                _buildSectionTitle(context, 'Adaptive hardware, explained'),
                _buildProductShowcase(context),
                const SizedBox(height: 48),
                _buildSectionTitle(context, 'What the system does when it sees movement'),
                _buildCardGrid(context, explainerCards),
                const SizedBox(height: 48),
              ],
            ),
          ),
          _wrapSection(
            section: _HomeSection.details,
            child: Column(
              children: [
                _buildSectionTitle(context, 'How Orbsurv works'),
                _buildCardGrid(context, detailsCards),
                const SizedBox(height: 48),
              ],
            ),
          ),
          _wrapSection(
            section: _HomeSection.demo,
            child: Column(
              children: [
                _buildDemoTeaser(context),
                const SizedBox(height: 48),
              ],
            ),
          ),
          _wrapSection(
            section: _HomeSection.pilot,
            child: Column(
              children: [
                _buildPilotSignup(context),
                const SizedBox(height: 48),
                _buildSectionTitle(context, 'Install in three moves'),
                _buildCardGrid(context, installCards),
                const SizedBox(height: 48),
              ],
            ),
          ),
          _wrapSection(
            section: _HomeSection.privacy,
            child: Column(
              children: [
                _buildPrivacySection(context),
                const SizedBox(height: 32),
                _buildGlassPanel(context),
                const SizedBox(height: 48),
                _buildFooter(context),
                const SizedBox(height: 32),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeroSection(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

    return _CenteredSection(
      child: Container(
        decoration: BoxDecoration(
          gradient: OrbsurvTheme.heroGradient,
          borderRadius: BorderRadius.circular(36),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.12),
              blurRadius: 32,
              offset: const Offset(0, 16),
            ),
          ],
        ),
        padding: const EdgeInsets.all(28),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Chip(
              backgroundColor: Colors.white.withValues(alpha: 0.22),
              label: const Text('Rail-mounted AI surveillance'),
              labelPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            ),
            const SizedBox(height: 24),
            Text(
              'Eliminate blind spots. See only what matters.',
              style: theme.textTheme.headlineMedium?.copyWith(
                color: scheme.onPrimary,
                fontWeight: FontWeight.w700,
                letterSpacing: -1.1,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Orbsurv glides along a ceiling rail, combining cinematic coverage with edge AI so you only get alerts that matter.',
              style: theme.textTheme.bodyLarge?.copyWith(
                color: scheme.onPrimary.withValues(alpha: 0.85),
              ),
            ),
            const SizedBox(height: 24),
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                ElevatedButton.icon(
                  onPressed: () {},
                  icon: const Icon(Icons.play_circle_outline),
                  label: const Text('Live demo'),
                ),
                OutlinedButton.icon(
                  onPressed: () => _scrollToSection(_HomeSection.product),
                  icon: const Icon(Icons.smart_display_outlined),
                  label: const Text('Product showcase'),
                ),
              ],
            ),
            const SizedBox(height: 24),
            _buildHeroGallery(context),
          ],
        ),
      ),
    );
  }
  Widget _buildHeroGallery(BuildContext context) {
    final theme = Theme.of(context);
    final selectedIndex = _selectedGalleryIndex;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: 16,
          runSpacing: 16,
          children: List.generate(galleryItems.length, (index) {
            final item = galleryItems[index];
            final bool isSelected = selectedIndex == index;
            return GestureDetector(
              onTap: () {
                setState(() {
                  _selectedGalleryIndex = index == selectedIndex ? -1 : index;
                });
              },
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 280),
                curve: Curves.easeOutCubic,
                width: 200,
                height: 136,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: isSelected
                        ? theme.colorScheme.onPrimary.withValues(alpha: 0.9)
                        : Colors.white.withValues(alpha: 0.45),
                    width: isSelected ? 3 : 1.5,
                  ),
                  boxShadow: [
                    if (isSelected)
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.25),
                        blurRadius: 24,
                        offset: const Offset(0, 12),
                      ),
                  ],
                  gradient: LinearGradient(
                    colors: item.colors,
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      item.icon,
                      color: isSelected ? Colors.white : theme.colorScheme.onPrimary,
                      size: 26,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      item.caption,
                      textAlign: TextAlign.center,
                      style: theme.textTheme.labelLarge?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            );
          }),
        ),
        const SizedBox(height: 16),
        AnimatedSwitcher(
          duration: const Duration(milliseconds: 320),
          child: selectedIndex >= 0
              ? Container(
                  key: ValueKey<int>(selectedIndex),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(18),
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
                  child: Row(
                    children: [
                      const Icon(Icons.blur_on, color: Colors.white70),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              galleryItems[selectedIndex].caption,
                              style: theme.textTheme.titleMedium?.copyWith(
                                color: Colors.white,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              galleryItems[selectedIndex].summary,
                              style: theme.textTheme.bodyMedium?.copyWith(
                                color: Colors.white70,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                )
              : const SizedBox.shrink(),
        ),
      ],
    );
  }

  Widget _buildTrustBar(BuildContext context) {
    final theme = Theme.of(context);
    return _CenteredSection(
      child: Card(
        elevation: theme.brightness == Brightness.dark ? 1 : 2,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 20),
          child: Wrap(
            spacing: 16,
            runSpacing: 12,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              Text(
                'Early interest from',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
                  fontWeight: FontWeight.w600,
                ),
              ),
              ...trustBadges.map(
                (badge) => Chip(
                  avatar: Icon(badge.icon, size: 18, color: theme.colorScheme.primary),
                  label: Text(badge.label),
                ),
              ),
              Text(
                '96% of pilot users report fewer blind spots',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurface.withValues(alpha: 0.55),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSectionTitle(BuildContext context, String title) {
    final theme = Theme.of(context);
    return _CenteredSection(
      child: Align(
        alignment: Alignment.centerLeft,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Text(
            title,
            style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
          ),
        ),
      ),
    );
  }

  Widget _buildProductShowcase(BuildContext context) {
    final selected = productFeatures.firstWhere(
      (feature) => feature.id == _selectedFeatureId,
      orElse: () => productFeatures.first,
    );

    return _CenteredSection(
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: LayoutBuilder(
            builder: (context, constraints) {
              final bool isWide = constraints.maxWidth > 720;
              final Widget visual = _buildHotspotVisual(context);
              final Widget details = _buildHotspotDetails(context, selected);

              if (isWide) {
                return Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(child: visual),
                    const SizedBox(width: 32),
                    Expanded(child: details),
                  ],
                );
              }

              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  visual,
                  const SizedBox(height: 24),
                  details,
                ],
              );
            },
          ),
        ),
      ),
    );
  }
  Widget _buildHotspotVisual(BuildContext context) {
    final theme = Theme.of(context);
    final bool isDark = theme.brightness == Brightness.dark;

    return AspectRatio(
      aspectRatio: 4 / 3,
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(28),
          gradient: LinearGradient(
            colors: isDark
                ? [const Color(0xFF0B1120), const Color(0xFF1E293B)]
                : [const Color(0xFFEFF6FF), const Color(0xFFFFFFFF)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: Stack(
          children: [
            Align(
              alignment: Alignment.center,
              child: Icon(
                Icons.videocam_outlined,
                size: 84,
                color: theme.colorScheme.primary.withValues(alpha: 0.18),
              ),
            ),
            Align(
              alignment: Alignment.bottomCenter,
              child: Container(
                height: 22,
                margin: const EdgeInsets.only(bottom: 18, left: 18, right: 18),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  gradient: LinearGradient(
                    colors: [
                      theme.colorScheme.primary.withValues(alpha: 0.2),
                      theme.colorScheme.primary.withValues(alpha: 0.05),
                    ],
                  ),
                ),
              ),
            ),
            ...productFeatures.map((feature) {
              final bool isSelected = feature.id == _selectedFeatureId;
              return Align(
                alignment: feature.alignment,
                child: GestureDetector(
                  onTap: () => setState(() => _selectedFeatureId = feature.id),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 240),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    decoration: BoxDecoration(
                      color: isSelected
                          ? theme.colorScheme.primary
                          : Colors.white.withValues(alpha: isDark ? 0.08 : 0.9),
                      borderRadius: BorderRadius.circular(999),
                      border: Border.all(
                        color: isSelected
                            ? theme.colorScheme.primary
                            : theme.colorScheme.primary.withValues(alpha: 0.25),
                      ),
                      boxShadow: [
                        if (isSelected)
                          BoxShadow(
                            color: theme.colorScheme.primary.withValues(alpha: 0.35),
                            blurRadius: 24,
                            offset: const Offset(0, 12),
                          ),
                      ],
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          feature.icon,
                          size: 18,
                          color: isSelected ? Colors.white : theme.colorScheme.primary,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          feature.label,
                          style: theme.textTheme.labelLarge?.copyWith(
                            color: isSelected ? Colors.white : theme.colorScheme.primary,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            }),
          ],
        ),
      ),
    );
  }

  Widget _buildHotspotDetails(BuildContext context, ProductFeature feature) {
    final theme = Theme.of(context);
    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 320),
      child: Column(
        key: ValueKey(feature.id),
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            feature.title,
            style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 12),
          Text(
            feature.description,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurface.withValues(alpha: 0.75),
            ),
          ),
          const SizedBox(height: 16),
          ...feature.bullets.map(
            (bullet) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.check_circle, color: theme.colorScheme.primary, size: 20),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      bullet,
                      style: theme.textTheme.bodyMedium,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCardGrid(BuildContext context, List<FeatureCardData> cards) {
    return _CenteredSection(
      child: LayoutBuilder(
        builder: (context, constraints) {
          final double maxWidth = constraints.maxWidth;
          final int columns = maxWidth > 900
              ? 3
              : maxWidth > 640
                  ? 2
                  : 1;
          final double spacing = 16;
          final double itemWidth = columns == 1
              ? double.infinity
              : (maxWidth - (spacing * (columns - 1))) / columns;

          return Wrap(
            spacing: spacing,
            runSpacing: spacing,
            children: cards
                .map(
                  (card) => SizedBox(
                    width: itemWidth,
                    child: Card(
                      child: Padding(
                        padding: const EdgeInsets.all(20),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Icon(card.icon, size: 28, color: Theme.of(context).colorScheme.primary),
                            const SizedBox(height: 12),
                            Text(
                              card.title,
                              style: Theme.of(context)
                                  .textTheme
                                  .titleMedium
                                  ?.copyWith(fontWeight: FontWeight.w700),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              card.description,
                              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                    color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.72),
                                  ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                )
                .toList(),
          );
        },
      ),
    );
  }
  Widget _buildDemoTeaser(BuildContext context) {
    final theme = Theme.of(context);
    final Widget copyContent = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'See it in action',
          style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 12),
        Text(
          'Watch patrols, zone focus, and alerts live. Launch the analyzer to replay detections and rail movements.',
          style: theme.textTheme.bodyMedium,
        ),
        const SizedBox(height: 20),
        ElevatedButton.icon(
          onPressed: () {},
          icon: const Icon(Icons.ondemand_video_outlined),
          label: const Text('Open demo'),
        ),
      ],
    );
    final Widget mediaContent = ClipRRect(
      borderRadius: BorderRadius.circular(24),
      child: AspectRatio(
        aspectRatio: 16 / 9,
        child: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                theme.colorScheme.primary.withValues(alpha: 0.9),
                theme.colorScheme.primary.withValues(alpha: 0.6),
              ],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
          child: Center(
            child: Icon(
              Icons.play_circle_fill,
              color: Colors.white.withValues(alpha: 0.85),
              size: 56,
            ),
          ),
        ),
      ),
    );

    return _CenteredSection(
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: LayoutBuilder(
            builder: (context, constraints) {
              final bool isWide = constraints.maxWidth > 720;
              if (isWide) {
                return Row(
                  children: [
                    Expanded(child: copyContent),
                    const SizedBox(width: 28),
                    Expanded(child: mediaContent),
                  ],
                );
              }
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  copyContent,
                  const SizedBox(height: 24),
                  SizedBox(height: 180, child: mediaContent),
                ],
              );
            },
          ),
        ),
      ),
    );
  }

  Widget _buildPilotSignup(BuildContext context) {
    final theme = Theme.of(context);
    final Widget formContent = InterestFormCard(
      title: 'Pilot units start December',
      description: 'Home and small-business kits with modular rail lengths. Pilot includes install guidance and remote calibration.',
      endpoint: '/api/pilot',
      ctaLabel: 'Join the pilot list',
      successMessage: "You're on the pilot list. We'll be in touch soon!",
      icon: Icons.send_rounded,
      formsService: _formsService,
      extraPayload: const {'source': 'mobile-app'},
    );
    final Widget visualTile = ClipRRect(
      borderRadius: BorderRadius.circular(24),
      child: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [theme.colorScheme.primary, theme.colorScheme.primary.withValues(alpha: 0.7)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: Center(
          child: Text(
            'Starter kit preview',
            style: theme.textTheme.titleMedium?.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.w600,
                ),
            textAlign: TextAlign.center,
          ),
        ),
      ),
    );

    return _CenteredSection(
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: LayoutBuilder(
            builder: (context, constraints) {
              final bool isWide = constraints.maxWidth > 720;
              if (isWide) {
                return Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(child: formContent),
                    const SizedBox(width: 24),
                    Expanded(
                      child: Align(
                        alignment: Alignment.topCenter,
                        child: SizedBox(height: 220, child: visualTile),
                      ),
                    ),
                  ],
                );
              }
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  formContent,
                  const SizedBox(height: 24),
                  SizedBox(height: 220, child: visualTile),
                ],
              );
            },
          ),
        ),
      ),
    );
  }

  Widget _buildPrivacySection(BuildContext context) {
    final theme = Theme.of(context);
    return _CenteredSection(
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Privacy and control',
                style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 16),
              ...privacyPoints.map(
                (point) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.verified_user_outlined, size: 20),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          point,
                          style: theme.textTheme.bodyMedium?.copyWith(
                                color: theme.colorScheme.onSurface.withValues(alpha: 0.75),
                              ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildGlassPanel(BuildContext context) {
    final theme = Theme.of(context);
    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 300),
      child: _showPrototypePanel
          ? _CenteredSection(
              child: Container(
                decoration: BoxDecoration(
                  color: theme.colorScheme.surface.withValues(alpha: theme.brightness == Brightness.dark ? 0.8 : 0.9),
                  borderRadius: BorderRadius.circular(28),
                  border: Border.all(
                    color: theme.colorScheme.primary.withValues(alpha: 0.1),
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.1),
                      blurRadius: 24,
                      offset: const Offset(0, 16),
                    ),
                  ],
                ),
                child: ListTile(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                  leading: CircleAvatar(
                    backgroundColor: theme.colorScheme.primary.withValues(alpha: 0.12),
                    child: Icon(Icons.auto_awesome, color: theme.colorScheme.primary),
                  ),
                  title: const Text('Prototype status'),
                  subtitle: const Text(
                    'FastAPI + YOLOv8 backend is online. Use the Analyzer to view tracks or Device Setup to add another phone.',
                  ),
                  trailing: IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => setState(() => _showPrototypePanel = false),
                  ),
                ),
              ),
            )
          : const SizedBox.shrink(),
    );
  }

  Widget _buildFooter(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 32, horizontal: 24),
      color: theme.colorScheme.primary.withValues(alpha: theme.brightness == Brightness.dark ? 0.55 : 0.06),
      child: _CenteredSection(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Orbsurv',
                  style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
                ),
                Wrap(
                  spacing: 16,
                  children: const [
                    _FooterLink(label: 'Home'),
                    _FooterLink(label: 'Product'),
                    _FooterLink(label: 'Demo'),
                    _FooterLink(label: 'About'),
                    _FooterLink(label: 'Privacy'),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 16),
            Text(
              '© ${DateTime.now().year} Orbsurv. All rights reserved.',
              style: theme.textTheme.bodySmall,
            ),
          ],
        ),
      ),
    );
  }

  SliverToBoxAdapter _wrapSection({
    required _HomeSection section,
    required Widget child,
  }) {
    return SliverToBoxAdapter(
      child: Container(
        key: _sectionKeys[section],
        padding: const EdgeInsets.symmetric(horizontal: 20),
        child: child,
      ),
    );
  }
}

class _CenteredSection extends StatelessWidget {
  const _CenteredSection({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.topCenter,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 920),
        child: child,
      ),
    );
  }
}

class _FooterLink extends StatelessWidget {
  const _FooterLink({required this.label});
  final String label;

  @override
  Widget build(BuildContext context) {
    return Text(
      label,
      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
            color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.75),
            fontWeight: FontWeight.w600,
          ),
    );
  }
}

