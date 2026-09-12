
'use client';
/**
 * @fileOverview Página de redirección instantánea para jugadores.
 * Elimina cualquier rastro visual para que el salto al tablero sea inmediato.
 */

import { useEffect } from 'react';
import { useParams } from 'next/navigation';

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
        <div className="min-h-screen bg-white" />
    );
}
