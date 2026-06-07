// ─── Upkeep Design System ────────────────────────────────────────────────────
// Warm light mode · Apple-inspired · 8 pt grid

export const Colors = {
  // ── Backgrounds ──────────────────────────────────────────────────────────
  background:    '#F8F7F4',   // warm off-white
  surface:       '#FFFFFF',
  surfaceRaised: '#F2F1EE',   // slightly darker for nested surfaces

  // ── Primary ──────────────────────────────────────────────────────────────
  primary:      '#5C6EFF',   // vibrant indigo-blue
  primaryLight: '#EEF0FF',   // tinted background
  primaryDark:  '#4A5AE0',   // pressed / hover

  // ── Status ───────────────────────────────────────────────────────────────
  success:      '#34C97A',
  successLight: '#E8FBF0',
  warning:      '#FFB340',
  warningLight: '#FFF4E0',
  danger:       '#FF4E4E',
  dangerLight:  '#FFEBEB',
  info:         '#5C6EFF',
  infoLight:    '#EEF0FF',

  // ── Text ─────────────────────────────────────────────────────────────────
  text:          '#1A1A2E',   // near-black with blue tint
  textSecondary: '#6B7185',
  textMuted:     '#9B9DB0',
  textOnPrimary: '#FFFFFF',

  // ── Borders ──────────────────────────────────────────────────────────────
  border:      '#E8E7E4',
  borderFocus: '#5C6EFF',

  // ── Utility ──────────────────────────────────────────────────────────────
  white: '#FFFFFF',
  black: '#000000',

  // ── Legacy aliases (keeps existing screens compiling) ────────────────────
  ok:      '#34C97A',
  dueSoon: '#FFB340',
  overdue: '#FF4E4E',
};

// ─── Spacing (8 pt grid) ─────────────────────────────────────────────────────
export const Spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
};

// ─── Border radii ────────────────────────────────────────────────────────────
export const Radius = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  full: 999,
};

// ─── Typography ──────────────────────────────────────────────────────────────
export const Typography = {
  display:   { fontSize: 34, fontWeight: '700' as const, letterSpacing: -0.5, lineHeight: 41 },
  title1:    { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5, lineHeight: 34 },
  title2:    { fontSize: 22, fontWeight: '600' as const, letterSpacing: -0.3, lineHeight: 28 },
  title3:    { fontSize: 17, fontWeight: '600' as const, letterSpacing: -0.2, lineHeight: 22 },
  body:      { fontSize: 17, fontWeight: '400' as const, lineHeight: 24 },
  callout:   { fontSize: 16, fontWeight: '500' as const, lineHeight: 21 },
  subhead:   { fontSize: 15, fontWeight: '400' as const, lineHeight: 20 },
  caption:   { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
  monospace: { fontSize: 13, fontFamily: 'Courier', lineHeight: 18 },

  // ── Legacy aliases ────────────────────────────────────────────────────────
  largeTitle: { fontSize: 34, fontWeight: '800' as const, letterSpacing: -0.5 },
  title:      { fontSize: 22, fontWeight: '700' as const },
  headline:   { fontSize: 17, fontWeight: '600' as const },
  micro:      { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.5 },
};

// ─── Shadows ─────────────────────────────────────────────────────────────────
export const Shadow = {
  card: {
    shadowColor:  '#1A1A2E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius:  8,
    elevation: 3,
  },
  fab: {
    shadowColor:  '#5C6EFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius:  12,
    elevation: 8,
  },
  modal: {
    shadowColor:  '#1A1A2E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius:  24,
    elevation: 12,
  },
};
