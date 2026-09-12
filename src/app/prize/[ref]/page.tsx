
'use client';
/**
 * @fileOverview Página de redirección instantánea para el enlace sorpresa.
 * Optimizada para ser 100% invisible y ultra rápida.
 */

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function PrizePreviewPage() {
    const router = useRouter();
    const params = useParams();
    const ref = params.ref as string;

    useEffect(() => {
        const fetchAndRedirect = async () => {
            if (!ref) return;
            try {
                // Redirección inmediata: Sin estados de carga ni esperas visuales
                // Usamos replace para una transición limpia y que el historial no se ensucie
                router.replace(`/?ref=${ref.toUpperCase()}`);
            } catch (error) {
                console.error("Error redirecting:", error);
                router.replace('/');
            }
        };
        fetchAndRedirect();
    }, [ref, router]);

    return (
        <div className="min-h-screen bg-white">
            {/* Pantalla blanca absoluta para una transición imperceptible */}
        </div>
    );
}
