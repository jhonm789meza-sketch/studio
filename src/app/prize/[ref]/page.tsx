
'use client';
/**
 * @fileOverview Pantalla de Bienvenida (Landing Page) interactiva.
 * Diseñada para simular un botón real que redirige al juego.
 * Incluye redirección automática tras 2 segundos.
 */

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, ShieldCheck } from 'lucide-react';

export default function PrizeRedirectPage() {
    const params = useParams();
    const router = useRouter();
    const ref = params.ref as string;
    const [loading, setLoading] = useState(false);
    const [countdown, setCountdown] = useState(2);

    const handleEnterGame = () => {
        setLoading(true);
        // Redirección al tablero principal con la referencia
        window.location.replace(`/?ref=${ref.toUpperCase()}`);
    };

    useEffect(() => {
        // Temporizador para la redirección automática a los 2 segundos
        const redirectTimer = setTimeout(() => {
            handleEnterGame();
        }, 2000);

        // Visual del contador
        const countdownInterval = setInterval(() => {
            setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);

        return () => {
            clearTimeout(redirectTimer);
            clearInterval(countdownInterval);
        };
    }, [ref]);

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans text-white">
            {/* Fondo con efectos de luz dinámica */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-purple-600/20 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30" />
            </div>

            <div className="relative z-10 text-center space-y-8 max-w-md w-full">
                <div className="bg-white/5 backdrop-blur-3xl p-10 rounded-[60px] border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.8)] transition-all duration-700">
                    
                    {/* Brand Header */}
                    <div className="space-y-1 mb-10">
                        <h1 className="text-6xl font-black tracking-tighter leading-none flex flex-col items-center">
                            <span className="text-white">RIFA</span>
                            <span className="text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]">⚡</span>
                            <span className="text-white">EXPRESS</span>
                        </h1>
                        <p className="text-blue-400 font-black text-xs uppercase tracking-[0.2em] mt-4 opacity-80">
                            TU OPORTUNIDAD DE GANAR ESTÁ AQUÍ
                        </p>
                    </div>

                    {/* Botón Real y Funcional */}
                    <div className="relative group">
                        <Button 
                            onClick={handleEnterGame}
                            disabled={loading}
                            className="w-full h-28 bg-gradient-to-br from-purple-600 via-purple-700 to-blue-700 hover:from-purple-500 hover:to-blue-600 text-white rounded-[35px] shadow-[0_20px_60px_rgba(147,51,234,0.5)] transition-all transform active:scale-95 flex flex-col items-center justify-center gap-0 border-b-[12px] border-purple-900/80 overflow-hidden relative"
                        >
                            {loading ? (
                                <Loader2 className="h-12 w-12 animate-spin" />
                            ) : (
                                <>
                                    <div className="flex items-center gap-3 text-3xl font-black italic tracking-tighter">
                                        ¡JUGAR AHORA! <Sparkles className="h-6 w-6 text-yellow-300 animate-bounce" />
                                    </div>
                                    <span className="text-[11px] font-bold opacity-90 tracking-widest uppercase mt-1">
                                        Click para entrar
                                    </span>
                                    {/* Reflejo de luz en el botón */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                </>
                            )}
                        </Button>
                    </div>

                    <div className="mt-10 pt-8 border-t border-white/5 space-y-4">
                        <div>
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mb-2">
                                REFERENCIA DE JUEGO
                            </p>
                            <div className="bg-slate-900/80 py-3 px-8 rounded-2xl inline-block border border-purple-500/30 shadow-inner">
                                <p className="text-white text-3xl font-mono font-black tracking-[0.2em]">
                                    {ref?.toUpperCase()}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Badge de Seguridad */}
                <div className="flex items-center justify-center gap-2 text-slate-500">
                    <ShieldCheck className="h-4 w-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                        Plataforma Certificada Rifa⚡Express
                    </span>
                </div>
            </div>

            {/* Indicador de carga automática */}
            <div className="absolute bottom-10 left-0 right-0 text-center">
                <p className="text-white/30 text-[9px] font-bold uppercase tracking-widest">
                    Redirección automática en {countdown}s...
                </p>
            </div>
        </div>
    );
}
