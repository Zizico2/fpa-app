import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { Providers } from './providers';
export const metadata: Metadata = {
  title: 'Sete — Andebol português',
  description:
    'Resultados, jogos e classificações do andebol português. Dados da FPA.',
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt" data-theme="light" data-astryx-theme="fpa">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
