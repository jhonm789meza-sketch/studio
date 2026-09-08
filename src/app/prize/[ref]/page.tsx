'use client';
/**
 * @fileOverview Página de previsualización del premio que actúa como un enlace funcional camuflado.
 * Redirige instantáneamente al juego real para una experiencia fluida.
 */

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';

export default function PrizePreviewPage() {
    const router = useRouter();
    const params = useParams();
    const ref = params.ref as string;
    const [loading, setLoading] = useState(true);

    const gameUrl = `/?ref=${ref}`;

    useEffect(() => {
        const fetchPrize = async () => {
            if (!ref) return;
            try {
                const docSnap = await getDoc(doc(db, 'raffles', ref.toUpperCase()));
                if (docSnap.exists()) {
                    // Redirección instantánea al juego real
                    router.push(gameUrl);
                } else {
                    router.push('/');
                }
            } catch (error) {
                console.error("Error fetching raffle for redirect:", error);
                router.push('/');
            } finally {
                setLoading(false);
            }
        };
        fetchPrize();
    }, [ref, router, gameUrl]);

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center overflow-hidden">
            <div className="text-white text-center p-4">
                <h1 className="text-2xl font-bold mb-4">RIFA⚡EXPRESS</h1>
                <Loader2 className="h-10 w-10 animate-spin mx-auto text-yellow-400 mb-4" />
                <p className="text-lg font-bold animate-pulse">CARGANDO JUEGO...</p>
                <p className="text-sm text-white/50 mt-2">Entrando directamente al tablero de números</p>
            </div>
        </div>
    );
}
