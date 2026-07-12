export const THEME_CODES = ['pearl', 'graphite', 'ocean', 'forest', 'sunset'] as const;
export type ThemeCode = typeof THEME_CODES[number];

export function normalizeThemeCode(value: unknown): ThemeCode | 'auto' {
    const code = String(value || '').trim().toLowerCase();
    if (THEME_CODES.includes(code as ThemeCode)) return code as ThemeCode;
    if (code === 'light') return 'pearl';
    if (code === 'dark') return 'graphite';
    return 'auto';
}
