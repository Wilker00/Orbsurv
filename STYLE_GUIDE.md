# Orbsurv Design System Style Guide

## Table of Contents
1. [Design System Overview](#design-system-overview)
2. [CSS Variables & Design Tokens](#css-variables--design-tokens)
3. [Typography System](#typography-system)
4. [Color System](#color-system)
5. [Spacing System](#spacing-system)
6. [Component Patterns](#component-patterns)
7. [Layout Patterns](#layout-patterns)
8. [Common Patterns](#common-patterns)
9. [Responsive Design](#responsive-design)
10. [Dark Mode Implementation](#dark-mode-implementation)
11. [Accessibility](#accessibility)
12. [Code Examples](#code-examples)

---

## Design System Overview

### Purpose and Scope
The Orbsurv design system provides a consistent, scalable foundation for all pages across the site. It ensures visual harmony, accessibility, and maintainability through a centralized variable system and reusable component patterns.

### File Structure
- **`site/css/shared-vars.css`** - Core CSS variables for colors, spacing, shadows, and theme tokens
- **`site/css/global.css`** - Global styles, typography, buttons, forms, cards, navigation
- **`site/css/index.css`** - Page-specific styles (if needed)
- **`site/css/product.css`** - Product page specific styles
- **`site/css/[page].css`** - Individual page stylesheets as needed

### Theme System
The design system supports both light and dark modes through CSS variable overrides. The `body.dark-mode` class switches all color variables automatically.

---

## CSS Variables & Design Tokens

### Color System Variables

#### Light Theme Colors
```css
--bg: #FAFAF9;                    /* Main background */
--card-bg: #F5F5F5;               /* Card/container background */
--ink: #111827;                   /* Primary text color */
--mute: #6B7280;                  /* Secondary/muted text */
--line: #E5E7EB;                  /* Borders and dividers */
--accent-color: #0d6efd;          /* Primary accent (blue) */
--accent-gradient: linear-gradient(135deg, #0d6efd 0%, #0dcaf0 100%);
```

#### Dark Theme Colors
```css
--bg: #222222;                    /* Main background */
--card-bg: #333333;               /* Card/container background */
--ink: #f0f0f0;                   /* Primary text color */
--mute: #aaaaaa;                   /* Secondary/muted text */
--line: #444444;                  /* Borders and dividers */
--accent-color: #ffffff;          /* Primary accent (white) */
--accent-gradient: linear-gradient(135deg, #f0f0f0 0%, #ffffff 100%);
```

#### Chrome/Navigation Variables
```css
--chrome-surface: rgba(255, 255, 255, 0.9);     /* Header/footer background */
--chrome-border: rgba(15, 23, 42, 0.08);       /* Header/footer borders */
--chrome-link: #6b7280;                        /* Navigation link color */
--chrome-link-strong: #111827;                 /* Active/strong link color */
--nav-pill-surface: rgba(255, 255, 255, 0.8);  /* Nav pill background */
--nav-pill-border: rgba(15, 23, 42, 0.12);     /* Nav pill border */
--nav-pill-hover: rgba(15, 23, 42, 0.08);      /* Nav pill hover state */
```

### Spacing System

The spacing scale uses a consistent 8px base unit:

```css
--space-1: 8px;    /* Small gaps, tight spacing */
--space-2: 12px;   /* Compact spacing */
--space-3: 16px;   /* Default spacing */
--space-4: 24px;   /* Medium spacing */
--space-5: 32px;   /* Large spacing */
--space-6: 48px;   /* Extra large spacing */
--space-7: 72px;   /* Section padding */
```

**Usage Guidelines:**
- `--space-1` to `--space-2`: Internal component spacing, icon gaps
- `--space-3` to `--space-4`: Between related elements, form fields
- `--space-5` to `--space-6`: Between sections, card padding
- `--space-7`: Section vertical padding

### Shadow System

```css
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);        /* Subtle elevation */
--shadow-md: 0 6px 14px -2px rgba(0, 0, 0, 0.12);    /* Card elevation */
--shadow-lg: 0 18px 35px -10px rgba(0, 0, 0, 0.16);   /* Modal/dropdown */
```

**Dark Mode Shadows:**
```css
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.2);
--shadow-md: 0 6px 14px -2px rgba(0, 0, 0, 0.3);
--shadow-lg: 0 18px 35px -10px rgba(0, 0, 0, 0.35);
```

### Border Radius

```css
--radius-xl: 24px;    /* Cards, large containers */
```

**Common Border Radius Values:**
- `12px` - Form inputs, small cards
- `14px` - Medium elements
- `16px` - Feature cards, icon containers
- `18px` - Medium-large elements
- `24px` (--radius-xl) - Large cards, main containers
- `999px` - Pills, buttons, fully rounded elements

### Container Width

```css
--container: 1200px;  /* Maximum content width */
```

---

## Typography System

### Font Families

- **Headings & Logo**: `'Sora', sans-serif` - Bold, modern, display font
- **Body Text**: `'Inter', sans-serif` - Clean, readable sans-serif

### Heading Sizes

All headings use `clamp()` for fluid responsive sizing:

```css
h1 {
  font-size: clamp(2.5rem, 5vw, 3.5rem);  /* 40px - 56px */
  background: var(--accent-gradient);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;  /* Gradient text effect */
  margin-bottom: 24px;
}

h2 {
  font-size: clamp(2rem, 4vw, 2.5rem);    /* 32px - 40px */
}

h3 {
  font-size: clamp(1.5rem, 3vw, 1.75rem); /* 24px - 28px */
}
```

### Body Text

```css
p {
  color: var(--mute);
  margin-bottom: 16px;
  font-size: 1.125rem;  /* 18px */
  line-height: 1.6;
}
```

### Font Weights

- **700 (Bold)**: Headings, logos, strong emphasis
- **600 (Semi-bold)**: Labels, subheadings, important text
- **500 (Medium)**: Navigation links, buttons
- **400 (Regular)**: Body text, default

### Special Typography Patterns

#### Gradient Text (H1)
H1 headings use a gradient text effect that adapts to the theme:
- Light mode: Blue gradient (`#0d6efd` to `#0dcaf0`)
- Dark mode: Light gradient (`#f0f0f0` to `#ffffff`)

#### Eyebrow Text
Small uppercase labels above headings:
```css
font-size: 0.875rem;
font-weight: 600;
color: var(--accent-color);
text-transform: uppercase;
letter-spacing: 0.1em;
```

---

## Color System

### Color Usage Guidelines

#### Primary Colors
- **`--ink`**: Primary text, headings, important content
- **`--mute`**: Secondary text, descriptions, metadata
- **`--accent-color`**: Links, CTAs, interactive elements, brand elements

#### Background Colors
- **`--bg`**: Main page background
- **`--card-bg`**: Card backgrounds, elevated surfaces
- **`--chrome-surface`**: Header/footer backgrounds (semi-transparent)

#### Border Colors
- **`--line`**: Borders, dividers, subtle separations

### Color-Mix Usage

The design system uses `color-mix()` for transparent overlays and theme-aware colors:

```css
/* 15% accent color overlay */
background: color-mix(in srgb, var(--accent-color) 15%, transparent);

/* 80% ink for overlays */
background: color-mix(in srgb, var(--ink) 80%, transparent);

/* 70% muted for placeholders */
color: color-mix(in srgb, var(--mute) 70%, transparent);
```

**Benefits:**
- Automatically adapts to light/dark mode
- Maintains proper contrast
- Consistent transparency levels

### Status Colors

Common status colors used throughout the site:

```css
/* Success/Online */
background: color-mix(in srgb, #34d399 20%, transparent);
color: #34d399;

/* Warning */
background: color-mix(in srgb, #fbbf24 20%, transparent);
color: #fbbf24;

/* Error/Offline */
background: color-mix(in srgb, #f87171 20%, transparent);
color: #f87171;

/* Info */
background: color-mix(in srgb, #3b82f6 20%, transparent);
color: #3b82f6;
```

---

## Spacing System

### Spacing Scale

| Variable | Value | Use Case |
|---------|-------|----------|
| `--space-1` | 8px | Icon gaps, tight spacing |
| `--space-2` | 12px | Compact spacing, small gaps |
| `--space-3` | 16px | Default spacing, form fields |
| `--space-4` | 24px | Medium spacing, card gaps |
| `--space-5` | 32px | Large spacing, card padding |
| `--space-6` | 48px | Extra large spacing |
| `--space-7` | 72px | Section padding |

### Responsive Spacing

Use `clamp()` for responsive spacing that scales with viewport:

```css
/* Section padding */
padding: clamp(48px, 12vw, 72px) 0;

/* Container padding */
padding: 0 clamp(16px, 4vw, 24px);

/* Button padding */
padding: clamp(10px, 1.4vw, 12px) clamp(16px, 2.4vw, 18px);
```

### Common Spacing Patterns

#### Section Padding
```css
section {
  padding: var(--space-7) 0;  /* 72px vertical */
}

/* Or with clamp for responsiveness */
padding: clamp(var(--space-5), 8vw, var(--space-7)) 0;
```

#### Card Padding
```css
.card {
  padding: var(--space-5);  /* 32px all sides */
}
```

#### Grid Gaps
```css
.grid {
  gap: var(--space-4);  /* 24px between grid items */
}
```

---

## Component Patterns

### Cards

#### Basic Card
```html
<div class="card">
  <!-- Card content -->
</div>
</div>
```

#### Card Styling
```css
.card {
  background: var(--card-bg);
  border: 1px solid var(--line);
  border-radius: var(--radius-xl);  /* 24px */
  padding: var(--space-5);          /* 32px */
  box-shadow: var(--shadow-md);
  transition: all 0.3s ease;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
  border-color: var(--mute);
}

.card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: var(--accent-gradient);
  opacity: 0;
  transition: opacity 0.3s ease;
}
```

#### Card Variations

**Card with Header:**
```html
<div class="card">
  <div class="card-header">
    <h3>Title</h3>
    <button class="btn btn-secondary">Action</button>
  </div>
  <!-- Content -->
</div>
```

**Card Grid:**
```html
<div class="grid grid-2">
  <div class="card">...</div>
  <div class="card">...</div>
</div>
```

### Buttons

#### Button Variants

**Primary Button:**
```html
<a href="#" class="btn btn-primary">Primary Action</a>
```

```css
.btn-primary {
  background: var(--ink);
  color: var(--bg);
}

.btn-primary:hover {
  box-shadow: var(--shadow-md);
}
```

**Secondary Button:**
```html
<a href="#" class="btn btn-secondary">Secondary Action</a>
```

```css
.btn-secondary {
  background: transparent;
  color: var(--ink);
  border: 1px solid var(--line);
}
```

**Outline Button:**
```html
<a href="#" class="btn btn-outline">Outline Action</a>
```

```css
.btn-outline {
  background-color: transparent;
  color: var(--ink);
  border: 1px solid var(--line);
}
```

#### Button Base Styles
```css
.btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: clamp(10px, 1.4vw, 12px) clamp(16px, 2.4vw, 18px);
  border-radius: 999px;
  font-weight: 700;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

.btn:focus-visible {
  outline: 2px solid var(--accent-color);
  outline-offset: 2px;
}
```

#### Button with Icons
```html
<a href="#" class="btn btn-primary">
  <i class="fa-solid fa-plus"></i> Add Item
</a>
```

### Forms

#### Form Field
```html
<div class="form-field">
  <label for="email">Email</label>
  <input type="email" id="email" name="email" required>
</div>
```

#### Form Field Styling
```css
.form-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-field > label {
  font-weight: 600;
  color: var(--ink);
}

.form-field input,
.form-field textarea,
.form-field select {
  width: 100%;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 12px 14px;
  background: var(--bg);
  color: var(--ink);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.form-field input:focus-visible {
  border-color: var(--accent-color);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-color) 25%, transparent);
}
```

#### Form Message (Success/Error)
```html
<p class="form-message" id="message" aria-live="polite"></p>
```

```css
.form-message {
  margin-top: 12px;
  padding: clamp(10px, 2vh, 12px) clamp(14px, 3vw, 16px);
  border-radius: 14px;
  background: var(--accent-color);
  color: var(--bg);
  font-weight: 500;
  opacity: 0;
  max-height: 0;
  overflow: hidden;
  transition: opacity 0.3s ease, max-height 0.3s ease;
}

.form-message.is-visible {
  opacity: 1;
  max-height: clamp(120px, 32vh, 160px);
}

.form-message.is-error {
  background: rgba(185, 28, 28, 0.15);
  color: #b91c1c;
}
```

#### Form Grid
```html
<div class="form-grid">
  <div class="form-field">...</div>
  <div class="form-field">...</div>
</div>
```

```css
.form-grid {
  display: grid;
  gap: 12px;
}

@media (min-width: 768px) {
  .form-grid {
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }
}
```

### Grid Layouts

#### Two-Column Grid
```html
<div class="grid grid-2">
  <div class="card">...</div>
  <div class="card">...</div>
</div>
```

```css
.grid {
  display: grid;
  gap: var(--space-4);
}

.grid-2 {
  grid-template-columns: repeat(2, 1fr);
}

@media (max-width: 768px) {
  .grid-2 {
    grid-template-columns: 1fr;
  }
}
```

#### Auto-Fit Grid
```html
<div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));">
  <!-- Items -->
</div>
```

### Navigation

#### Header Navigation
```html
<header class="site-header" data-include="_header.html"></header>
```

#### Navigation Links
```html
<nav class="nav-links">
  <a href="index.html">Home</a>
  <a href="product.html">Product</a>
  <a href="about.html">About</a>
</nav>
```

#### Navigation Styling
```css
.nav-links {
  display: flex;
  align-items: center;
  gap: clamp(12px, 2vw, 24px);
  padding: clamp(8px, 1vw, 12px) clamp(16px, 2vw, 24px);
  border-radius: 999px;
  background: var(--nav-pill-surface);
  border: 1px solid var(--nav-pill-border);
  backdrop-filter: blur(18px);
}

.nav-links a {
  padding: clamp(8px, 1.1vw, 12px) clamp(14px, 2vw, 20px);
  border-radius: 999px;
  font-weight: 500;
  color: var(--chrome-link);
  transition: background 0.2s ease, color 0.2s ease;
}

.nav-links a:hover,
.nav-links a[aria-current="page"] {
  background: var(--nav-pill-hover);
  color: var(--chrome-link-strong);
}
```

---

## Layout Patterns

### Section Structure

#### Standard Section
```html
<section class="section">
  <div class="wrap">
    <!-- Content -->
  </div>
</section>
```

#### Section with Alt Background
```html
<section class="section section-alt">
  <div class="wrap">
    <!-- Content -->
  </div>
</section>
```

#### Section Styling
```css
section {
  padding: var(--space-7) 0;  /* 72px vertical */
}

.section-alt {
  background-color: var(--card-bg);
}
```

### Wrap Container

All content should be wrapped in `.wrap` for consistent max-width and padding:

```html
<div class="wrap">
  <!-- Content -->
</div>
```

```css
.wrap {
  margin: 0 auto;
  padding: 0 clamp(16px, 4vw, 24px);
  max-width: var(--container);  /* 1200px */
}
```

### Hero Sections

#### Standard Hero Pattern
```html
<section style="background: linear-gradient(135deg, rgba(13, 110, 253, 0.08), rgba(13, 202, 240, 0.05)); border-bottom: 1px solid var(--line);">
  <div class="wrap">
    <div style="padding: clamp(var(--space-5), 8vw, var(--space-7)) 0;">
      <p style="font-size: 0.875rem; font-weight: 600; color: var(--accent-color); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: var(--space-2);">
        Eyebrow Text
      </p>
      <h1>Main Heading</h1>
      <p style="color: var(--mute); font-size: 1.05rem;">
        Subheading or description
      </p>
    </div>
  </div>
</section>
```

#### Hero with Actions
```html
<section style="background: linear-gradient(135deg, rgba(13, 110, 253, 0.08), rgba(13, 202, 240, 0.05)); border-bottom: 1px solid var(--line);">
  <div class="wrap">
    <div style="padding: clamp(var(--space-5), 8vw, var(--space-7)) 0;">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-4);">
        <div>
          <p style="font-size: 0.875rem; font-weight: 600; color: var(--accent-color); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: var(--space-2);">
            Eyebrow
          </p>
          <h1>Heading</h1>
          <p style="color: var(--mute); font-size: 1.05rem;">Description</p>
        </div>
        <div style="display: flex; gap: var(--space-3);">
          <a href="#" class="btn btn-primary">Primary</a>
          <a href="#" class="btn btn-secondary">Secondary</a>
        </div>
      </div>
    </div>
  </div>
</section>
```

### Two-Column Layouts

#### Content + Sidebar
```html
<div style="display: grid; grid-template-columns: 1fr 350px; gap: var(--space-5);">
  <div>
    <!-- Main content -->
  </div>
  <div>
    <!-- Sidebar -->
  </div>
</div>

@media (max-width: 1024px) {
  grid-template-columns: 1fr;
}
```

---

## Common Patterns

### Hero Section Styling

Hero sections use a subtle gradient background:

```css
background: linear-gradient(135deg, rgba(13, 110, 253, 0.08), rgba(13, 202, 240, 0.05));
border-bottom: 1px solid var(--line);
```

### Trust Bar Pattern

Trust bars appear after hero sections:

```html
<section aria-label="Trust bar">
  <div class="wrap" style="padding-top: 0;">
    <div class="card" style="display: flex; gap: 24px; align-items: center; justify-content: center; flex-wrap: wrap;">
      <!-- Trust indicators -->
    </div>
  </div>
</section>
```

### Feature Cards

Feature cards with icons:

```html
<div class="card" style="padding: var(--space-5);">
  <div style="width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; border-radius: 16px; background: color-mix(in srgb, var(--accent-color) 15%, transparent); margin-bottom: var(--space-4);">
    <i class="fa-solid fa-icon" style="font-size: 2rem; color: var(--accent-color);"></i>
  </div>
  <h2 style="margin-bottom: var(--space-3);">Feature Title</h2>
  <p style="color: var(--mute); line-height: 1.7;">Description</p>
</div>
```

### Status Badges

```html
<span class="status-badge online">
  <i class="fa-solid fa-circle" style="font-size: 0.5rem;"></i>
  Online
</span>
```

```css
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
  border-radius: 999px;
  font-size: 0.875rem;
  font-weight: 500;
}

.status-badge.online {
  background: color-mix(in srgb, #34d399 20%, transparent);
  color: #34d399;
}
```

### Metric Displays

```html
<div style="display: flex; flex-direction: column; align-items: center; gap: var(--space-1); text-align: center;">
  <span style="font-size: 1.5rem; font-weight: 700; color: var(--ink);">99.9%</span>
  <span style="font-size: 0.875rem; color: var(--mute);">Uptime</span>
</div>
```

### Icon + Text Combinations

```html
<div style="display: flex; align-items: center; gap: var(--space-3);">
  <div style="width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; border-radius: 12px; background: color-mix(in srgb, var(--accent-color) 15%, transparent); color: var(--accent-color);">
    <i class="fa-solid fa-icon"></i>
  </div>
  <div>
    <div style="font-weight: 600;">Title</div>
    <div style="color: var(--mute); font-size: 0.9rem;">Description</div>
  </div>
</div>
```

---

## Responsive Design

### Breakpoint Strategy

The design system uses a mobile-first approach with fluid sizing via `clamp()`:

- **Mobile**: < 600px
- **Tablet**: 600px - 1024px
- **Desktop**: > 1024px

### Clamp() Usage

`clamp()` provides fluid, responsive sizing:

```css
/* Font sizes */
font-size: clamp(2.5rem, 5vw, 3.5rem);  /* Min: 40px, Preferred: 5vw, Max: 56px */

/* Spacing */
padding: clamp(48px, 12vw, 72px) 0;     /* Min: 48px, Preferred: 12vw, Max: 72px */

/* Container padding */
padding: 0 clamp(16px, 4vw, 24px);      /* Min: 16px, Preferred: 4vw, Max: 24px */
```

### Responsive Grids

```css
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--space-4);
}

@media (max-width: 768px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
```

### Mobile Navigation

Navigation collapses to a hamburger menu on mobile:

```css
@media (max-width: 960px) {
  .nav-toggle {
    display: inline-flex;
  }

  .nav-right {
    display: none;
    position: absolute;
    /* Mobile menu positioning */
  }

  .nav-right.is-open {
    display: flex;
  }
}
```

### Responsive Buttons

```css
@media (max-width: 600px) {
  .btn {
    width: 100%;
    justify-content: center;
  }
}
```

---

## Dark Mode Implementation

### Activation

Dark mode is activated by adding the `dark-mode` class to the `<body>` element:

```html
<body class="dark-mode">
```

### Variable Overrides

All color variables are automatically overridden in dark mode:

```css
body.dark-mode {
  --bg: #222222;
  --card-bg: #333333;
  --ink: #f0f0f0;
  --mute: #aaaaaa;
  --line: #444444;
  --accent-color: #ffffff;
  /* ... all other color variables */
}
```

### Best Practices

1. **Always use CSS variables** - Never hardcode colors
2. **Use color-mix() for transparency** - Ensures proper contrast in both themes
3. **Test both themes** - Verify readability and contrast
4. **Shadow adjustments** - Dark mode uses stronger shadows for depth

### Theme Toggle

The site includes a theme toggle switch:

```html
<label class="theme-switch">
  <input type="checkbox" id="theme-toggle">
  <span class="slider">
    <i class="fa-solid fa-sun sun"></i>
    <i class="fa-solid fa-moon moon"></i>
  </span>
</label>
```

---

## Accessibility

### Focus States

All interactive elements have visible focus indicators:

```css
*:focus-visible {
  outline: 2px solid var(--accent-color);
  outline-offset: 2px;
}

.btn:focus-visible {
  outline: 2px solid var(--accent-color);
  outline-offset: 2px;
}
```

### ARIA Patterns

#### Screen Reader Only Text
```html
<label class="sr-only" for="input-id">Label text</label>
```

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

#### Live Regions
```html
<p class="form-message" aria-live="polite" id="message"></p>
```

#### Navigation Labels
```html
<nav aria-label="Main navigation">
  <!-- Links -->
</nav>
```

### Keyboard Navigation

- All interactive elements are keyboard accessible
- Tab order follows visual flow
- Focus indicators are clearly visible
- Skip links provided where appropriate

### Color Contrast

The design system ensures WCAG AA compliance:
- Text on background: Minimum 4.5:1 contrast ratio
- Large text: Minimum 3:1 contrast ratio
- Interactive elements: Clear visual distinction

### Reduced Motion

Respects user preferences for reduced motion:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### High Contrast Mode

Supports high contrast mode:

```css
@media (prefers-contrast: high) {
  :root {
    --line: #000000;
    --mute: #000000;
  }
  
  body.dark-mode {
    --line: #ffffff;
    --mute: #ffffff;
  }
}
```

---

## Code Examples

### Complete Page Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Page Title - Orbsurv</title>
  <link rel="icon" type="image/x-icon" href="/Image/Group 213.png">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Sora:wght@600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  
  <link rel="stylesheet" href="css/global.css">
  <link rel="stylesheet" href="css/shared-vars.css">
  <link rel="stylesheet" href="css/privacy.css">
  <link rel="stylesheet" href="css/index.css">
</head>
<body>
  <header class="site-header" data-include="_header.html"></header>

  <main>
    <section style="background: linear-gradient(135deg, rgba(13, 110, 253, 0.08), rgba(13, 202, 240, 0.05)); border-bottom: 1px solid var(--line);">
      <div class="wrap">
        <div style="padding: clamp(var(--space-5), 8vw, var(--space-7)) 0;">
          <p style="font-size: 0.875rem; font-weight: 600; color: var(--accent-color); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: var(--space-2);">
            Section Label
          </p>
          <h1>Main Heading</h1>
          <p style="color: var(--mute); font-size: 1.05rem;">
            Description text
          </p>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="wrap">
        <div class="grid grid-2">
          <div class="card">
            <h2>Card Title</h2>
            <p>Card content</p>
          </div>
          <div class="card">
            <h2>Card Title</h2>
            <p>Card content</p>
          </div>
        </div>
      </div>
    </section>
  </main>

  <footer class="site-footer" data-include="_footer.html"></footer>

  <script src="js/global.js"></script>
  <script src="js/forms.js"></script>
  <script src="js/index.js"></script>
</body>
</html>
```

### Card with Icon and Content

```html
<div class="card" style="padding: var(--space-5);">
  <div style="width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; border-radius: 16px; background: color-mix(in srgb, var(--accent-color) 15%, transparent); margin-bottom: var(--space-4);">
    <i class="fa-solid fa-icon" style="font-size: 2rem; color: var(--accent-color);"></i>
  </div>
  <h2 style="margin-bottom: var(--space-3); font-size: 1.5rem;">Feature Title</h2>
  <p style="color: var(--mute); line-height: 1.7;">
    Feature description text goes here.
  </p>
</div>
```

### Form with Validation

```html
<form id="contact-form"
      data-endpoint="/contact"
      data-method="POST"
      data-success-message="Message sent successfully."
      data-message-target="form-message">
  <div class="form-field">
    <label for="name">Name</label>
    <input type="text" id="name" name="name" required>
  </div>
  <div class="form-field">
    <label for="email">Email</label>
    <input type="email" id="email" name="email" required>
  </div>
  <div class="form-field">
    <label for="message">Message</label>
    <textarea id="message" name="message" rows="4" required></textarea>
  </div>
  <button type="submit" class="btn btn-primary">Send Message</button>
  <p id="form-message" class="form-message" aria-live="polite"></p>
</form>
```

### Status Badge Pattern

```html
<span class="status-badge online">
  <i class="fa-solid fa-circle" style="font-size: 0.5rem;"></i>
  Online
</span>
```

```css
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
  border-radius: 999px;
  font-size: 0.875rem;
  font-weight: 500;
}

.status-badge.online {
  background: color-mix(in srgb, #34d399 20%, transparent);
  color: #34d399;
}
```

### Metric Display

```html
<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-4);">
  <div>
    <div style="font-size: 2rem; font-weight: 700; color: var(--ink); margin-bottom: var(--space-1);">
      99.9%
    </div>
    <div style="color: var(--mute); font-size: 0.9rem;">Uptime</div>
  </div>
  <div>
    <div style="font-size: 2rem; font-weight: 700; color: var(--ink); margin-bottom: var(--space-1);">
      3/3
    </div>
    <div style="color: var(--mute); font-size: 0.9rem;">Cameras Online</div>
  </div>
</div>
```

### Tab Navigation

```html
<div class="access-tabs">
  <button class="access-tab active" data-tab="users">Users</button>
  <button class="access-tab" data-tab="cameras">Cameras</button>
</div>

<div class="access-tab-content active" data-content="users">
  <!-- Tab content -->
</div>
```

```css
.access-tabs {
  display: flex;
  gap: var(--space-2);
  border-bottom: 2px solid var(--line);
  margin-bottom: var(--space-5);
}

.access-tab {
  padding: var(--space-3) var(--space-4);
  border: none;
  background: transparent;
  color: var(--mute);
  cursor: pointer;
  font-weight: 500;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: all 0.2s ease;
}

.access-tab.active {
  color: var(--accent-color);
  border-bottom-color: var(--accent-color);
}
```

---

## Quick Reference

### Common CSS Patterns

```css
/* Responsive padding */
padding: clamp(var(--space-5), 8vw, var(--space-7)) 0;

/* Card hover effect */
transform: translateY(-4px);
box-shadow: var(--shadow-md);

/* Icon container */
width: 64px;
height: 64px;
border-radius: 16px;
background: color-mix(in srgb, var(--accent-color) 15%, transparent);
color: var(--accent-color);

/* Eyebrow text */
font-size: 0.875rem;
font-weight: 600;
color: var(--accent-color);
text-transform: uppercase;
letter-spacing: 0.1em;

/* Muted text */
color: var(--mute);
font-size: 0.9rem;
line-height: 1.7;
```

### Common HTML Patterns

```html
<!-- Hero section -->
<section style="background: linear-gradient(135deg, rgba(13, 110, 253, 0.08), rgba(13, 202, 240, 0.05)); border-bottom: 1px solid var(--line);">

<!-- Two-column grid -->
<div class="grid grid-2">

<!-- Card with icon -->
<div class="card" style="padding: var(--space-5);">

<!-- Status badge -->
<span class="status-badge online">

<!-- Button with icon -->
<a href="#" class="btn btn-primary">
  <i class="fa-solid fa-icon"></i> Text
</a>
```

---

## Best Practices

1. **Always use CSS variables** - Never hardcode colors, spacing, or other design tokens
2. **Use clamp() for responsive sizing** - Ensures fluid scaling across devices
3. **Maintain consistent spacing** - Use the spacing scale variables
4. **Test dark mode** - Verify all pages work in both light and dark themes
5. **Follow component patterns** - Use established card, button, and form patterns
6. **Include header/footer** - Use `data-include` for shared components
7. **Accessibility first** - Include ARIA labels, focus states, and semantic HTML
8. **Mobile-first** - Design for mobile, enhance for desktop
9. **Use color-mix()** - For transparent overlays that adapt to theme
10. **Consistent typography** - Use Sora for headings, Inter for body text

---

## File References

- **CSS Variables**: `site/css/shared-vars.css`
- **Global Styles**: `site/css/global.css`
- **Example Pages**: `site/index.html`, `site/product.html`
- **Shared Components**: `site/_header.html`, `site/_footer.html`

---

*Last Updated: November 2024*

