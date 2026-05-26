export const theme = {
  colors: {
    // Primary gradients
    gradientPurple: ['#a99fd5', '#b5aad9', '#c5b8e0'],
    gradientPurpleDark: ['#ad46ff', '#9810fa'],
    gradientPurpleButton: ['#6b46c1', '#9810fa', '#00bba7'],
    gradientTeal: ['#00bba7', '#00b8db'],
    
    // Text gradients
    gradientPurpleText: ['#6b46c1', '#9810fa'],
    gradientGreenText: ['#009966', '#009689'],
    gradientOrangeText: ['#e17100', '#f54900'],
    
    // Background
    backgroundBlurPurple: 'rgba(233, 212, 255, 0.2)',
    backgroundBlurTeal: 'rgba(150, 247, 228, 0.2)',
    backgroundBlurBlue: 'rgba(190, 219, 255, 0.1)',
    
    // Card backgrounds
    cardWhite: 'rgba(255, 255, 255, 0.6)',
    cardWhiteOpaque: 'rgba(255, 255, 255, 0.8)',
    cardWhiteNav: 'rgba(255, 255, 255, 0.9)',
    
    // Status colors
    success: '#009966',
    successBg: ['#ecfdf5', '#f0fdfa'],
    successBorder: '#a4f4cf',
    error: '#ef4444',
    errorBg: ['#fef2f2', '#fff1f2'],
    errorBorder: '#ffc9c9',
    
    // Purple accents
    purple: '#6b46c1',
    purpleBg: ['rgba(107, 70, 193, 0.1)', 'rgba(250, 245, 255, 1)'],
    purpleNote: ['rgba(107, 70, 193, 0.05)', 'rgba(250, 245, 255, 0.5)'],
    purpleBorder: '#6b46c1',
    
    // Text colors
    textPrimary: '#1f2937',
    textSecondary: '#374151',
    textMuted: '#64748B',
    textWhite: '#ffffff',
    
    // Additional semantic colors
    primary: '#6b46c1',
    secondary: '#14B8A6',
    foreground: '#0f172a',
    muted: '#475569',
    border: '#cbd5e1',
    
    // Borders & strokes
    white: '#ffffff',
  },
  
  spacing: {
    xs: 8,
    sm: 12,
    md: 16,
    lg: 24,
    xl: 32,
  },
  
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },
  
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 24,
  },
  
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  
  shadows: {
    card: {
      shadowColor: '#6b46c1',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 8,
    },
    cardStrong: {
      shadowColor: '#6b46c1',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.2,
      shadowRadius: 20,
      elevation: 12,
    },
    button: {
      shadowColor: '#6b46c1',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
    },
    nav: {
      shadowColor: '#6b46c1',
      shadowOffset: { width: 0, height: -8 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 8,
    },
  },
};
