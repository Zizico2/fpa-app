import type { ReactNode } from 'react';
import { MatchLayout } from '../../../components/match-page';

export default function Layout({ children }: { children: ReactNode }) {
  return <MatchLayout>{children}</MatchLayout>;
}
