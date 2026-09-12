'use client';
/**
 * @fileOverview Página de entrada para jugadores.
 * Muestra un botón de "Jugar Ahora" estilizado antes de redirigir.
 */

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Gamepad2, Loader2, Sparkles } from 'lucide-react';
import Image from 'next/image';

export default function PrizePreviewPage() {
    const router = useRouter();
    const params = useParams();
    const ref = params.ref as string;
    const [isEntering, setIsEntering] = useState(false);

    const handleEnterGame = () => {
        setIsEntering(true);
        // Pequeño delay para la animación de feedback
        setTimeout(() => {
            window.location.replace(`/?ref=${ref.toUpperCase()}`);
        }, 600);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-black flex flex-col items-center justify-center p-6 text-white overflow-hidden relative">
            {/* Elementos decorativos de fondo */}
            <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-700" />
            
            <div className="z-10 max-w-sm w-full text-center space-y-8 animate-in fade-in zoom-in duration-700">
                <div className="relative inline-block">
                    <div className="bg-white/10 backdrop-blur-xl p-8 rounded-full border border-white/20 shadow-2xl relative z-10">
                        <Gamepad2 className="h-20 w-20 text-indigo-400" />
                    </div>
                    <div className="absolute -top-2 -right-2 bg-yellow-400 p-2 rounded-full shadow-lg animate-bounce">
                        <Sparkles className="h-6 w-6 text-black" />
                    </div>
                </div>

                <div className="space-y-4">
                    <h1 className="text-4xl font-black tracking-tighter bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
                        RIFA⚡EXPRESS
                    </h1>
                    <p className="text-gray-300 font-medium text-lg leading-relaxed">
                        ¡Has sido invitado a participar! <br/>
                        Tu número de la suerte te espera.
                    </p>
                </div>

                <div className="pt-8">
                    <Button 
                        onClick={handleEnterGame}
                        disabled={isEntering}
                        className={cn(
                            "w-full h-16 text-xl font-black rounded-2xl shadow-2xl transition-all duration-300 transform",
                            "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500",
                            "border-b-4 border-indigo-800 active:border-b-0 active:translate-y-1",
                            isEntering ? "opacity-90 scale-95" : "hover:scale-[1.02]"
                        )}
                    >
                        {isEntering ? (
                            <>
                                <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                                ENTRANDO...
                            </>
                        ) : (
                            <>
                                <Gamepad2 className="mr-3 h-7 w-7" />
                                ¡ENTRAR AL JUEGO!
                            </>
                        )}
                    </Button>
                </div>

                <div className="text-gray-400 text-xs font-bold uppercase tracking-widest opacity-50">
                    Ref: {ref?.toUpperCase()}
                </div>
            </div>
        </div>
    );
}

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ');
}
