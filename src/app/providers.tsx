'use client';
import { Theme } from '@astryxdesign/core/theme';
import type { ReactNode } from 'react';
import { ResourceProvider } from '../components/resources';
import { fpaTheme } from '../themes/fpa/generated/fpa';
export function Providers({ children }: { children: ReactNode }) {
  return (
    <Theme theme={fpaTheme} mode="light">
      <ResourceProvider>{children}</ResourceProvider>
    </Theme>
  );
}
