import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Friends Demon List',
  description: 'Private Geometry Dash demon ranking for your crew.'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
