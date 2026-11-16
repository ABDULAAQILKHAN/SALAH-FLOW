export const colors = {
  // Backgrounds
  background: '#090D16',       // Deep obsidian / charcoal
  surface: '#111827',          // Dark card surface
  surfaceElevated: '#1F2937',  // Elevated modal/popover
  surfaceHighlight: '#1E293B', // Selected/active item
  surfaceBorder: '#273549',    // Subtle separator

  // Primary Emerald Accents
  primary: '#10B981',          // Emerald primary
  primaryHover: '#059669',     // Deeper emerald
  primaryLight: '#34D399',     // Bright emerald
  primaryMuted: 'rgba(16, 185, 129, 0.15)', // Translucent emerald
  primaryGlow: 'rgba(16, 185, 129, 0.3)',

  // Secondary & Accents
  secondary: '#0EA5E9',        // Celestial Sky Blue
  secondaryMuted: 'rgba(14, 165, 233, 0.15)',
  gold: '#F59E0B',             // Amber/Gold for Tahajjud / Isha
  goldMuted: 'rgba(245, 158, 11, 0.15)',

  // Semantic
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  dangerMuted: 'rgba(239, 68, 68, 0.15)',
  info: '#3B82F6',

  // Text
  textPrimary: '#F9FAFB',      // Pure white/near white
  textSecondary: '#94A3B8',    // Slate grey
  textMuted: '#64748B',        // Muted grey
  textDisabled: '#475569',
  textOnPrimary: '#042F2E',    // Dark text on emerald button

  // Status & Priority
  coreBadge: '#10B981',
  highPriority: '#EF4444',
  mediumPriority: '#F59E0B',
  lowPriority: '#3B82F6',

  // Task statuses
  statusCompleted: '#10B981',
  statusPending: '#64748B',
  statusSkipped: '#F43F5E',
};

export const typography = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
  },
  fontSize: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    display: 32,
  },
  lineHeight: {
    xs: 15,
    sm: 18,
    md: 22,
    lg: 24,
    xl: 28,
    xxl: 32,
    display: 40,
  },
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const shadows = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  glow: {
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
};
