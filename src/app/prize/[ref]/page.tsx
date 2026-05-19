'use client';
/**
 * @fileOverview Página de previsualización del premio que redirige al juego tras 3 segundos o al hacer clic.
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
                }
            } catch (error) {
                console.error("Error fetching prize image:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchPrize();
    }, [ref]);

    useEffect(() => {
        if (!loading && ref) {
            const timer = setTimeout(() => {
                router.push(gameUrl);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [loading, ref, router, gameUrl]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black">
                <Loader2 className="h-10 w-10 animate-spin text-white" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center overflow-hidden p-4">
            {imageUrl ? (
                <Link href={gameUrl} className="relative w-full h-full max-w-4xl max-h-[85vh] shadow-2xl rounded-xl overflow-hidden group cursor-pointer">
                    <Image
                        src={imageUrl}
                        alt="Premio de la Rifa - Toca para jugar"
                        fill
                        className="object-contain transition-transform duration-500 group-hover:scale-105"
                        unoptimized
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="bg-yellow-400 text-black px-6 py-3 rounded-full font-bold text-xl shadow-2xl flex items-center gap-2 animate-bounce">
                            <MousePointer2 className="h-6 w-6" />
                            ¡TOCA PARA JUGAR YA!
                        </div>
                    </div>
                </Link>
            ) : (
                <div className="text-white text-center">
                    <p className="text-xl font-bold">Imagen no encontrada</p>
                    <p className="text-sm text-gray-400 mt-2">Redirigiendo al juego...</p>
                </div>
            )}
            
            <div className="mt-8 text-center">
                <Link href={gameUrl} className="inline-flex items-center gap-3 px-6 py-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20 hover:bg-white/20 transition-colors">
                    <Loader2 className="h-4 w-4 animate-spin text-yellow-400" />
                    <p className="text-white font-medium text-sm">Entrando al juego... Toca la foto para ir rápido</p>
                </Link>
                <h1 className="text-white/30 text-4xl font-black tracking-tighter mt-6">RIFA⚡EXPRESS</h1>
            </div>
        </div>
    );
}
