
import type {Metadata} from 'next';
import './globals.css';
import { Inter, Anton, Libre_Baskerville } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const anton = Anton({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-anton',
});
const libreBaskerville = Libre_Baskerville({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-libre-baskerville',
});


export const metadata: Metadata = {
  title: 'Tablero de Rifas',
  description: 'Aplicación de Rifas con Firebase',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${inter.variable} ${anton.variable} ${libreBaskerville.variable}`}>
        {children}
      </body>
    </html>
  );
}

    