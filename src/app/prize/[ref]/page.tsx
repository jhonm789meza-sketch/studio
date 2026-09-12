
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
                // Redirección inmediata: No esperamos a cargar el doc si no es estrictamente necesario para el salto
                // Usamos replace para que el usuario no pueda volver atrás a la página de carga negra
                router.replace(`/?ref=${ref.toUpperCase()}`);
            } catch (error) {
                console.error("Error redirecting:", error);
                router.replace('/');
            }
        };
        fetchAndRedirect();
    }, [ref, router]);

    return (
        <div className="min-h-screen bg-black">
            {/* Pantalla negra absoluta para una transición imperceptible */}
        </div>
    );
}
