'use client';
import { Theme } from '@astryxdesign/core/theme';
import type { ReactNode } from 'react';
import { fpaTheme } from '../themes/fpa/generated/fpa';
export function Providers({ children }: { children: ReactNode }) {
  return (
    <Theme theme={fpaTheme} mode="light">
      {children}
    </Theme>
  );
}
