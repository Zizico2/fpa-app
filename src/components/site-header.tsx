'use client';
import { Text } from '@astryxdesign/core/Text';
import * as stylex from '@stylexjs/stylex';
import Link from 'next/link';

export function SiteHeader() {
  return (
    <header {...stylex.props(styles.header)}>
      <Link href="/" {...stylex.props(styles.brand)}>
        sete<span {...stylex.props(styles.dot)}>.</span>
      </Link>
      <Text color="secondary">Andebol português</Text>
      <a
        href="https://portal.fpa.pt/"
        target="_blank"
        rel="noreferrer"
        {...stylex.props(styles.source)}
      >
        Fonte FPA ↗
      </a>
    </header>
  );
}

const styles = stylex.create({
  header: {
    height: 76,
    paddingInline: {
      default: 'max(24px, calc((100vw - 1320px) / 2))',
      '@media (max-width: 767px)': 16,
    },
    display: 'flex',
    alignItems: 'center',
    gap: 20,
    backgroundColor: '#fff',
    borderBottom: '1px solid #e2e6e5',
  },
  brand: {
    fontSize: 40,
    fontWeight: 800,
    letterSpacing: '-0.08em',
    textDecoration: 'none',
    color: '#152327',
  },
  dot: { color: '#b33126' },
  source: {
    fontSize: 12,
    color: '#60736c',
    textDecoration: 'none',
    marginLeft: 'auto',
  },
});
