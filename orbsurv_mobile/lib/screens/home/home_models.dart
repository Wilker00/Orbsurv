import 'package:flutter/material.dart';

class GalleryItem {
  const GalleryItem({
    required this.caption,
    required this.summary,
    required this.colors,
    this.icon = Icons.photo_outlined,
  });

  final String caption;
  final String summary;
  final List<Color> colors;
  final IconData icon;
}

class ProductFeature {
  const ProductFeature({
    required this.id,
    required this.label,
    required this.title,
    required this.description,
    required this.bullets,
    required this.alignment,
    required this.icon,
  });

  final String id;
  final String label;
  final String title;
  final String description;
  final List<String> bullets;
  final Alignment alignment;
  final IconData icon;
}

class FeatureCardData {
  const FeatureCardData({
    required this.title,
    required this.description,
    required this.icon,
  });

  final String title;
  final String description;
  final IconData icon;
}

class TrustBadge {
  const TrustBadge({required this.label, required this.icon});

  final String label;
  final IconData icon;
}

const List<GalleryItem> galleryItems = [
  GalleryItem(
    caption: 'Rail sweep',
    summary: 'Glide along hallways and corners without blind spots.',
    colors: [Color(0xFFEEF2FF), Color(0xFFDBEAFE)],
    icon: Icons.route_outlined,
  ),
  GalleryItem(
    caption: 'Live tracking',
    summary: 'Carriage repositions to hotspots when AI detects motion.',
    colors: [Color(0xFFF9FAFB), Color(0xFFE5E7EB)],
    icon: Icons.sensors_outlined,
  ),
  GalleryItem(
    caption: 'Night vision clarity',
    summary: 'Infrared-assisted capture with adaptive noise reduction.',
    colors: [Color(0xFF111827), Color(0xFF1F2937)],
    icon: Icons.nightlight_round_outlined,
  ),
];

const List<ProductFeature> productFeatures = [
  ProductFeature(
    id: 'rail',
    label: 'Rail movement',
    title: 'Rail movement',
    description: 'Panoramic coverage along walls and corners - no fixed blind spots.',
    bullets: [
      'Modular straight and corner segments',
      'Quiet drive with soft start/stop',
      'Auto map with return-to-dock',
    ],
    alignment: Alignment(-0.7, -0.6),
    icon: Icons.route,
  ),
  ProductFeature(
    id: 'carriage',
    label: 'Smart carriage',
    title: 'Smart tracking',
    description: 'Carriage repositions to the best vantage point when events occur.',
    bullets: [
      'Event-led repositioning',
      'Collision and edge safeguards',
      'Health checks with watchdog',
    ],
    alignment: Alignment(0.65, -0.25),
    icon: Icons.sensors,
  ),
  ProductFeature(
    id: 'coverage',
    label: 'Coverage',
    title: 'Continuous coverage',
    description: 'One unit adapts to cover where two or three fixed cams would sit.',
    bullets: [
      'Hallways, L-shapes, and long rooms',
      'No manual panning needed',
      'Fewer devices, fewer gaps',
    ],
    alignment: Alignment(-0.4, 0.5),
    icon: Icons.panorama_photosphere_select,
  ),
  ProductFeature(
    id: 'ai',
    label: 'AI events',
    title: 'AI events',
    description: 'On-device detection filters noise - alerts only when it matters.',
    bullets: [
      'Person, vehicle, pet, and heat detection',
      'False-alert reduction with local processing',
      'Privacy-preserving sharing controls',
    ],
    alignment: Alignment(0.5, 0.7),
    icon: Icons.auto_graph,
  ),
];

const List<FeatureCardData> explainerCards = [
  FeatureCardData(
    title: 'Detect',
    description: 'Sensors and AI flag meaningful motion, heat, or recognized subjects.',
    icon: Icons.radar,
  ),
  FeatureCardData(
    title: 'Move',
    description: 'Rail repositions to maximize vantage point automatically.',
    icon: Icons.swap_horiz,
  ),
  FeatureCardData(
    title: 'Decide',
    description: 'Only high-signal events trigger alerts and recordings - noise filtered out.',
    icon: Icons.tune,
  ),
];

const List<FeatureCardData> detailsCards = [
  FeatureCardData(
    title: 'Rail movement',
    description: 'Motorized track gives panoramic coverage and eliminates blind spots, even in corners.',
    icon: Icons.route_outlined,
  ),
  FeatureCardData(
    title: 'AI events',
    description: 'On-device detection for people, vehicles, pets, heat, and motion with smart filtering.',
    icon: Icons.precision_manufacturing_outlined,
  ),
  FeatureCardData(
    title: 'Privacy first',
    description: 'Local processing by default with selective blur and redaction for shared clips.',
    icon: Icons.privacy_tip_outlined,
  ),
  FeatureCardData(
    title: 'Reliable by design',
    description: 'Offline fallbacks, watchdog recovery, and health checks keep monitoring continuous.',
    icon: Icons.verified_outlined,
  ),
];

const List<FeatureCardData> installCards = [
  FeatureCardData(
    title: 'Plan',
    description: 'Measure walls and corners. Pick straight, corner, and return rail segments to fit your path.',
    icon: Icons.map_outlined,
  ),
  FeatureCardData(
    title: 'Mount',
    description: 'Attach brackets, snap rails, and connect the power module - no ceiling cuts required.',
    icon: Icons.hardware,
  ),
  FeatureCardData(
    title: 'Calibrate',
    description: 'Auto-map the path with a guided first sweep in the app.',
    icon: Icons.auto_fix_high,
  ),
];

const List<TrustBadge> trustBadges = [
  TrustBadge(label: 'Axion Labs', icon: Icons.science_outlined),
  TrustBadge(label: 'Kestrel Security', icon: Icons.shield_moon_outlined),
  TrustBadge(label: 'Beamline AI', icon: Icons.hub_outlined),
];

const List<String> privacyPoints = [
  'Local processing preferred; cloud optional.',
  'Selective blur/redaction for faces and plates in shared clips.',
  'Granular retention and export controls.',
];
