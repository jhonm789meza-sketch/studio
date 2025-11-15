
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


const APP_URL = "https://rifaexpress.web.app";
const APP_NAME = "RIFA⚡ EXPRESS";
const APP_DESCRIPTION = "La forma más fácil de gestionar tus rifas y sorteos online.";

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
  manifest: '/manifest.json',
  metadataBase: new URL(APP_URL),
  openGraph: {
    type: "website",
    url: APP_URL,
    title: APP_NAME,
    description: APP_DESCRIPTION,
    images: [
      {
        url: `${APP_URL}/icon-512x512.png`,
        width: 512,
        height: 512,
        alt: APP_NAME,
      },
    ],
  },
  twitter: {
    card: "summary",
    title: APP_NAME,
    description: APP_DESCRIPTION,
    images: `${APP_URL}/icon-512x512.png`,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
          <link rel="icon" href="/icon.svg" type="image/svg+xml" />
          <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={`${inter.variable} ${anton.variable} ${libreBaskerville.variable}`}>
        {children}
      </body>
    </html>
  );
}

    