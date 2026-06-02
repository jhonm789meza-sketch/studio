
'use client';
/**
 * @fileOverview Página de previsualización del premio que actúa como un enlace funcional camuflado.
 * Muestra la imagen a pantalla completa y redirige automáticamente al juego.
 */

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Image from 'next/image';
import { Loader2, MousePointer2 } from 'lucide-react';
import Link from 'next/link';

export default function PrizePreviewPage() {
    const router = useRouter();
    const params = useParams();
    const ref = params.ref as string;
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const gameUrl = `/?ref=${ref}`;

    useEffect(() => {
        const fetchPrize = async () => {
            if (!ref) return;
            try {
                const docSnap = await getDoc(doc(db, 'raffles', ref.toUpperCase()));
                if (docSnap.exists()) {
                    setImageUrl(docSnap.data().prizeImageUrl);
                    // Redirección ultra-rápida una vez que tenemos los datos
                    setTimeout(() => {
                        router.push(gameUrl);
                    }, 2500); // 2.5 segundos para que vean el premio y luego entren
                } else {
                    router.push('/');
                }
            } catch (error) {
                console.error("Error fetching prize image:", error);
                router.push('/');
            } finally {
                setLoading(false);
            }
        };
        fetchPrize();
    }, [ref, router, gameUrl]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black">
                <Loader2 className="h-10 w-10 animate-spin text-white" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center overflow-hidden">
            {imageUrl ? (
                <Link href={gameUrl} className="relative w-full h-screen cursor-pointer group">
                    <Image
                        src={imageUrl}
                        alt="Toca para jugar ahora"
                        fill
                        className="object-contain"
                        unoptimized
                        priority
                    />
                    <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                        <div className="bg-yellow-400 text-black px-8 py-4 rounded-full font-black text-2xl shadow-2xl flex items-center gap-3 animate-bounce border-4 border-black">
                            <MousePointer2 className="h-8 w-8" />
                            ¡TOCA PARA JUGAR YA!
                        </div>
                    </div>
                    {/* El link real funcional está "escondido" en toda la superficie de la imagen */}
                    <div className="absolute bottom-10 left-0 right-0 text-center">
                        <p className="text-white/50 text-xs font-mono">Redirigiendo automáticamente en 3 segundos...</p>
                    </div>
                </Link>
            ) : (
                <div className="text-white text-center p-4">
                    <h1 className="text-2xl font-bold mb-4">RIFA⚡EXPRESS</h1>
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-yellow-400" />
                    <p className="mt-4">Entrando al juego...</p>
                </div>
            )}
        </div>
    );
}
