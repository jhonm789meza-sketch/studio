
'use client';
/**
 * @fileOverview Página de redirección instantánea para el enlace sorpresa.
 */

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function PrizePreviewPage() {
    const router = useRouter();
    const params = useParams();
    const ref = params.ref as string;

    useEffect(() => {
        const fetchAndRedirect = async () => {
            if (!ref) return;
            try {
                const docSnap = await getDoc(doc(db, 'raffles', ref.toUpperCase()));
                if (docSnap.exists()) {
                    // Redirección instantánea usando replace para no ensuciar el historial
                    router.replace(`/?ref=${ref.toUpperCase()}`);
                } else {
                    router.replace('/');
                }
            } catch (error) {
                console.error("Error redirecting:", error);
                router.replace('/');
            }
        };
        fetchAndRedirect();
    }, [ref, router]);

    return (
        <div className="min-h-screen bg-black flex items-center justify-center overflow-hidden">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-white font-black tracking-widest text-sm animate-pulse">INGRESANDO...</p>
            </div>
        </div>
    );
}
