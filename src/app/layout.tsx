
import type {Metadata, Viewport} from 'next';
import './globals.css';
import { Inter, Anton, Libre_Baskerville } from 'next/font/google';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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
const DEFAULT_APP_NAME = "RIFA⚡ EXPRESS";
const APP_DESCRIPTION = "La forma más fácil de gestionar tus rifas y sorteos online.";

export const viewport: Viewport = {
  themeColor: '#4f46e5',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export async function generateMetadata(): Promise<Metadata> {
  let appName = DEFAULT_APP_NAME;
  let appLogoUrl = ""; // Iniciamos vacío para evitar logos genéricos

  try {
    const settingsDoc = await getDoc(doc(db, 'internal', 'settings'));
    if (settingsDoc.exists()) {
      const data = settingsDoc.data();
      appName = data.appName || DEFAULT_APP_NAME;
      appLogoUrl = data.appLogoUrl || "";
    }
  } catch (error) {
    console.error("Error generating dynamic metadata:", error);
  }

  const icons: any = {};
  if (appLogoUrl) {
    icons.icon = appLogoUrl;
    icons.shortcut = appLogoUrl;
    icons.apple = appLogoUrl;
  }

  return {
    title: appName,
    description: APP_DESCRIPTION,
    metadataBase: new URL(APP_URL),
    manifest: '/manifest.webmanifest',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: appName,
    },
    icons: icons,
    openGraph: {
      type: "website",
      url: APP_URL,
      title: appName,
      description: APP_DESCRIPTION,
      images: appLogoUrl ? [
        {
          url: appLogoUrl,
          width: 512,
          height: 512,
          alt: appName,
        },
      ] : [],
    },
    twitter: {
      card: "summary",
      title: appName,
      description: APP_DESCRIPTION,
      images: appLogoUrl ? [appLogoUrl] : [],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
          {/* Se eliminan los links a icon.svg que causaban el logo de Firebase */}
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${inter.variable} ${anton.variable} ${libreBaskerville.variable}`}>
        {children}
      </body>
    </html>
  );
}
