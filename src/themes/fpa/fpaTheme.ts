import { defineTheme } from '@astryxdesign/core/theme';
import { neutralTheme } from '@astryxdesign/theme-neutral/built';

export const fpaTheme = defineTheme({
  name: 'fpa',
  extends: neutralTheme,
  typography: {
    scale: { base: 14, ratio: 1.2 },
    body: { family: 'Arial', fallbacks: 'Helvetica, sans-serif' },
    heading: {
      family: 'Arial',
      fallbacks: 'Helvetica, sans-serif',
      weight: 'semibold',
    },
  },
  localTokens: {
    '--fpa-ink': '#152327',
    '--fpa-paper': '#f4f5f5',
    '--fpa-mint': '#f9ebe8',
    '--fpa-fire': '#b94528',
    '--fpa-accident': '#365eaa',
    '--fpa-assist': '#6d56a3',
    '--fpa-other': '#327970',
    '--fpa-amber': '#a66117',
    '--fpa-white': '#ffffff',
    '--fpa-header-height': '4.5rem',
    '--fpa-panel': '24rem',
    '--fpa-shadow': '0 8px 36px #1523271a',
    '--fpa-radius': '1rem',
  },
  tokens: {
    '--color-background-body': ['#f4f5f5', '#172b28'],
    '--color-background-surface': ['#ffffff', '#1c3530'],
    '--color-background-card': ['#ffffff', '#1c3530'],
    '--color-background-popover': ['#ffffff', '#1c3530'],
    '--color-background-muted': ['#edf1e9', '#2b443c'],
    '--color-text-primary': ['#152327', '#eff3e9'],
    '--color-text-secondary': ['#60736c', '#b4c9bc'],
    '--color-accent': ['#b33126', '#b9d99c'],
    '--color-text-accent': ['#b33126', '#b9d99c'],
    '--color-accent-muted': ['#f9ebe8', '#31553b'],
    '--color-on-accent': ['#ffffff', '#183326'],
    '--color-border': ['#dce3d9', '#3c5449'],
    '--radius-container': '16px',
    '--radius-element': '10px',
    '--focus-outline-color': ['#b33126', '#b9d99c'],
  },
  components: {
    heading: { base: { letterSpacing: '-0.035em' } },
  },
});
