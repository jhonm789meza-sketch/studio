'use server';
/**
 * @fileOverview Página de previsualización del premio que redirige al juego tras 3 segundos.
 */

'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';

export default function PrizePreviewPage() {
    const router = useRouter();
    const params = useParams();
    const ref = params.ref as string;
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

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
                router.push(`/?ref=${ref}`);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [loading, ref, router]);

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
                <div className="relative w-full h-full max-w-4xl max-h-[85vh] shadow-2xl rounded-xl overflow-hidden">
                    <Image
                        src={imageUrl}
                        alt="Premio de la Rifa"
                        fill
                        className="object-contain"
                        unoptimized
                    />
                </div>
            ) : (
                <div className="text-white text-center">
                    <p className="text-xl font-bold">Imagen no encontrada</p>
                    <p className="text-sm text-gray-400 mt-2">Redirigiendo al juego...</p>
                </div>
            )}
            
            <div className="mt-8 text-center">
                <div className="inline-flex items-center gap-3 px-6 py-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
                    <Loader2 className="h-4 w-4 animate-spin text-yellow-400" />
                    <p className="text-white font-medium text-sm">Entrando al juego en 3 segundos...</p>
                </div>
                <h1 className="text-white/30 text-4xl font-black tracking-tighter mt-6">RIFA⚡EXPRESS</h1>
            </div>
        </div>
    );
}
