import type { DieFaces } from '../core/types';

/**
 * Per-die colour themes. Kept free of any Three.js import so UI panels can read
 * them without pulling the 3D vendor chunk into the entry bundle.
 */
export interface DieTheme {
  primaryColor: string;
  secondaryColor: string;
  borderColor: string;
  textColor: string;
  accentColor: string;
  roughness: number;
  metalness: number;
}

export const DIE_THEMES: Record<DieFaces, DieTheme> = {
  2: {
    primaryColor: '#eab308',
    secondaryColor: '#ca8a04',
    borderColor: '#713f12',
    textColor: '#422006',
    accentColor: '#fef08a',
    roughness: 0.3,
    metalness: 0.75,
  },
  4: {
    primaryColor: '#059669',
    secondaryColor: '#065f46',
    borderColor: '#a7f3d0',
    textColor: '#ffffff',
    accentColor: '#34d399',
    roughness: 0.35,
    metalness: 0.1,
  },
  6: {
    primaryColor: '#dc2626',
    secondaryColor: '#991b1b',
    borderColor: '#fecaca',
    textColor: '#ffffff',
    accentColor: '#f87171',
    roughness: 0.35,
    metalness: 0.1,
  },
  8: {
    primaryColor: '#2563eb',
    secondaryColor: '#1e3a8a',
    borderColor: '#bfdbfe',
    textColor: '#ffffff',
    accentColor: '#60a5fa',
    roughness: 0.35,
    metalness: 0.1,
  },
  10: {
    primaryColor: '#7c3aed',
    secondaryColor: '#4c1d95',
    borderColor: '#ddd6fe',
    textColor: '#ffffff',
    accentColor: '#a78bfa',
    roughness: 0.35,
    metalness: 0.1,
  },
  12: {
    primaryColor: '#d97706',
    secondaryColor: '#78350f',
    borderColor: '#fde68a',
    textColor: '#ffffff',
    accentColor: '#fbbf24',
    roughness: 0.35,
    metalness: 0.1,
  },
  20: {
    primaryColor: '#0f172a',
    secondaryColor: '#020617',
    borderColor: '#38bdf8',
    textColor: '#38bdf8',
    accentColor: '#06b6d4',
    roughness: 0.3,
    metalness: 0.2,
  },
};
