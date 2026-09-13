
'use client';
/**
 * @fileOverview Página de entrada (Landing Page) para jugadores.
 * Muestra un botón real y funcional para entrar al tablero de juego.
 */

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Gamepad2, Loader2, Sparkles } from 'lucide-react';

export default function PrizeRedirectPage() {
    const params = useParams();
    const ref = params.ref as string;
    const [loading, setLoading] = useState(false);

    const handleEnterGame = () => {
        setLoading(true);
        // Redirección al tablero principal con la referencia
        window.location.replace(`/?ref=${ref.toUpperCase()}`);
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
            {/* Fondo con efectos de luz */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/30 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/30 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
            </div>

            <div className="relative z-10 text-center space-y-10 max-w-md w-full">
                <div className="bg-white/5 backdrop-blur-2xl p-10 rounded-[50px] border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.5)]">
                    {/* Icono animado */}
                    <div className="w-24 h-24 bg-gradient-to-tr from-purple-600 to-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl transform -rotate-6 hover:rotate-0 transition-transform duration-500">
                        <Gamepad2 className="h-12 w-12 text-white" />
                    </div>
                    
                    <div className="space-y-2 mb-10">
                        <h1 className="text-5xl font-black text-white tracking-tighter flex items-center justify-center gap-2">
                            RIFA<span className="text-yellow-400">⚡</span>EXPRESS
                        </h1>
                        <p className="text-slate-400 font-bold text-lg">
                            TU OPORTUNIDAD DE GANAR ESTÁ AQUÍ
                        </p>
                    </div>

                    {/* Botón Real y Funcional */}
                    <Button 
                        onClick={handleEnterGame}
                        disabled={loading}
                        className="w-full h-24 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-3xl font-black rounded-3xl shadow-[0_20px_50px_rgba(147,51,234,0.4)] transition-all transform active:scale-95 flex flex-col items-center justify-center gap-1 border-b-[10px] border-purple-900 overflow-hidden relative group"
                    >
                        {loading ? (
                            <Loader2 className="h-10 w-10 animate-spin" />
                        ) : (
                            <>
                                <div className="flex items-center gap-3">
                                    ¡JUGAR AHORA! <Sparkles className="h-6 w-6 text-yellow-300" />
                                </div>
                                <span className="text-[10px] opacity-70 tracking-widest uppercase">Click para entrar</span>
                                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                            </>
                        )}
                    </Button>
                </div>

                <div className="space-y-1">
                    <p className="text-slate-500 text-xs font-black uppercase tracking-[0.3em]">
                        REFERENCIA DE JUEGO
                    </p>
                    <p className="text-white text-2xl font-mono tracking-widest bg-white/5 py-2 px-6 rounded-full inline-block border border-white/10">
                        {ref?.toUpperCase()}
                    </p>
                </div>
            </div>
            
            {/* Footer */}
            <div className="absolute bottom-8 text-slate-600 text-[10px] font-bold tracking-tighter uppercase">
                Plataforma Certificada Rifa⚡Express
            </div>
        </div>
    );
}
