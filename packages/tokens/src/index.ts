/**
 * KHRATE design tokens — the single source of visual truth shared by web, admin, and
 * (mirrored in Dart) the Flutter app, so all clients read as one company.
 *
 * Brand: warm, fresh, trustworthy. Orange is the KHRATE identity colour, used with
 * intent — never decoration for its own sake. Clean, minimal, high-contrast for
 * readability on low-cost screens in daylight.
 */

export const color = {
  // Primary — KHRATE orange. A ripe, appetising orange, not neon.
  brand: {
    50: '#FFF4EC',
    100: '#FFE3CC',
    200: '#FFC599',
    300: '#FFA366',
    400: '#FF8433',
    500: '#F26A1B', // primary
    600: '#D6540E',
    700: '#A83F0B',
    800: '#7A2E09',
    900: '#4D1D06',
  },
  // Fresh green accent — signals produce/freshness/success sparingly.
  fresh: {
    100: '#E6F6EC',
    500: '#2FA968',
    700: '#1E7A48',
  },
  neutral: {
    0: '#FFFFFF',
    50: '#FAF8F6', // warm off-white background
    100: '#F2EEEA',
    200: '#E3DDD6',
    400: '#A79E95',
    600: '#6B635B',
    800: '#332E29',
    900: '#1C1917',
  },
  status: {
    info: '#2563EB',
    success: '#2FA968',
    warning: '#E0A419',
    danger: '#D64545',
  },
} as const;

export const font = {
  // System-first stack: zero download weight on weak data.
  sans: `system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`,
  scale: { xs: 12, sm: 14, base: 16, lg: 18, xl: 22, '2xl': 28, '3xl': 36 },
  weight: { regular: 400, medium: 500, semibold: 600, bold: 700 },
} as const;

/** 4px base spacing scale. */
export const space = [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64] as const;

export const radius = { sm: 6, md: 10, lg: 16, pill: 999 } as const;

export const shadow = {
  sm: '0 1px 2px rgba(28,25,23,0.06)',
  md: '0 4px 12px rgba(28,25,23,0.10)',
} as const;
