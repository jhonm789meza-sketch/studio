'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const CONFETTI_COLORS = ['#A855F7', '#4F46E5', '#EC4899', '#F59E0B', '#10B981'];
const CONFETTI_COUNT = 150;

interface ConfettiPiece {
  id: number;
  style: React.CSSProperties;
}

export function Confetti() {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    const newPieces: ConfettiPiece[] = Array.from({ length: CONFETTI_COUNT }).map((_, i) => {
      const x = Math.random() * 100; // vw
      const y = Math.random() * 100 - 100; // vh
      const rotation = Math.random() * 360;
      const size = Math.random() * 10 + 5; // px
      const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
      const animationDuration = Math.random() * 2 + 3; // seconds
      const animationDelay = Math.random() * 2; // seconds

      return {
        id: i,
        style: {
          '--x-start': `${x}vw`,
          '--y-start': `${y}vh`,
          '--rotation-start': `${rotation}deg`,
          '--x-end': `${x + (Math.random() - 0.5) * 50}vw`,
          '--y-end': '120vh',
          '--rotation-end': `${rotation + (Math.random() - 0.5) * 720}deg`,
          width: `${size}px`,
          height: `${size * 0.6}px`,
          backgroundColor: color,
          animation: `fall ${animationDuration}s ${animationDelay}s linear forwards`,
        } as React.CSSProperties,
      };
    });

    setPieces(newPieces);

    const keyframes = `
      @keyframes fall {
        from {
          transform: translate(var(--x-start), var(--y-start)) rotate(var(--rotation-start));
        }
        to {
          transform: translate(var(--x-end), var(--y-end)) rotate(var(--rotation-end));
        }
      }
    `;

    const styleSheet = document.createElement("style");
    styleSheet.innerText = keyframes;
    document.head.appendChild(styleSheet);

    return () => {
      document.head.removeChild(styleSheet);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {pieces.map(piece => (
        <div key={piece.id} className="absolute top-0 left-0" style={piece.style} />
      ))}
    </div>
  );
}
