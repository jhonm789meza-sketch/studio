'use client';
/**
 * @fileOverview Página de redirección instantánea para jugadores.
 * Elimina cualquier rastro visual para que el salto al tablero sea inmediato.
 */

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function PrizeRedirectPage() {
    const params = useParams();
    const ref = params.ref as string;

    useEffect(() => {
        if (ref) {
            // Redirección ultra rápida usando replace para no dejar rastro en el historial
            window.location.replace(`/?ref=${ref.toUpperCase()}`);
        }
    }, [ref]);

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center">
            <div className="flex flex-col items-center gap-4 animate-pulse">
                <div className="h-12 w-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-400 font-bold text-xs tracking-widest uppercase">Redirigiendo al juego...</p>
            </div>
        </div>
    );
}
