
import { MetadataRoute } from 'next';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  let appName = 'RIFA⚡ EXPRESS';
  let appLogoUrl = '/icon-512x512.png';

  try {
    const settingsDoc = await getDoc(doc(db, 'internal', 'settings'));
    if (settingsDoc.exists()) {
      const data = settingsDoc.data();
      if (data.appName) appName = data.appName;
      if (data.appLogoUrl) appLogoUrl = data.appLogoUrl;
    }
  } catch (e) {
    console.error('Error fetching manifest settings:', e);
  }

  return {
    name: appName,
    short_name: appName,
    description: 'La forma más fácil de gestionar tus rifas y sorteos online.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#4f46e5',
    icons: [
      {
        src: appLogoUrl,
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: appLogoUrl,
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
