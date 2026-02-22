export const COLORS = {
  primary: '#6C63FF',
  primaryLight: '#8B83FF',
  primaryDark: '#5A52E0',

  status: {
    not_given: { light: '#9E9E9E', dark: '#616161' },
    incomplete: { light: '#FF9800', dark: '#FFB74D' },
    complete: { light: '#2196F3', dark: '#4DD0E1' },
    checked: { light: '#4CAF50', dark: '#81C784' },
  },

  light: {
    background: '#F5F6FA',
    surface: '#FFFFFF',
    surfaceVariant: '#F0F0F5',
    text: '#1A1A2E',
    textSecondary: '#6B7280',
    textTertiary: '#9CA3AF',
    border: '#E5E7EB',
    shadow: 'rgba(0, 0, 0, 0.08)',
    card: '#FFFFFF',
    tabBar: '#FFFFFF',
    tabBarBorder: '#E5E7EB',
    statusBar: 'dark',
    danger: '#EF4444',
    dangerLight: '#FEE2E2',
  },

  dark: {
    background: '#0F0F1A',
    surface: '#1A1A2E',
    surfaceVariant: '#252540',
    text: '#F1F1F6',
    textSecondary: '#9CA3AF',
    textTertiary: '#6B7280',
    border: '#2D2D44',
    shadow: 'rgba(0, 0, 0, 0.3)',
    card: '#1A1A2E',
    tabBar: '#1A1A2E',
    tabBarBorder: '#2D2D44',
    statusBar: 'light',
    danger: '#F87171',
    dangerLight: '#3B1C1C',
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const FONT_SIZE = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 26,
  xxxl: 32,
};

export const STATUS_LABELS = {
  not_given: 'Not Given',
  incomplete: 'Incomplete',
  complete: 'Complete',
  checked: 'Checked',
};

export const STATUS_ICONS = {
  not_given: 'minus-circle-outline',
  incomplete: 'progress-clock',
  complete: 'check-circle-outline',
  checked: 'check-decagram',
};

export const STATUS_ORDER = ['not_given', 'incomplete', 'complete', 'checked'];
