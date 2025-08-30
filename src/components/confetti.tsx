'use client';

import { useEffect, useState } from 'react';

const CONFETTI_COLORS = ['#A855F7', '#4F46E5', '#EC4899', '#F59E0B', '#10B981', '#FBBF24'];
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
      const y = Math.random() * -100 - 10; // vh, start above the screen
      const rotation = Math.random() * 360;
      const size = Math.random() * 12 + 6; // px
      const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
      const animationDuration = Math.random() * 3 + 4; // seconds
      const animationDelay = Math.random() * 2; // seconds

      return {
        id: i,
        style: {
          '--x-start': `${x}vw`,
          '--y-start': `${y}vh`,
          '--rotation-start': `${rotation}deg`,
          '--x-end': `${x + (Math.random() - 0.5) * 80}vw`,
          '--y-end': '120vh',
          '--rotation-end': `${rotation + (Math.random() - 0.5) * 1080}deg`,
          width: `${size}px`,
          height: `${size * 0.7}px`,
          backgroundColor: color,
          animation: `fall ${animationDuration}s ${animationDelay}s linear forwards`,
          position: 'absolute',
          top: 0,
          left: 0,
          willChange: 'transform',
        } as React.CSSProperties,
      };
    });

    setPieces(newPieces);

    const keyframes = `
      @keyframes fall {
        from {
          transform: translate(var(--x-start), var(--y-start)) rotate(var(--rotation-start));
          opacity: 1;
        }
        to {
          transform: translate(var(--x-end), var(--y-end)) rotate(var(--rotation-end));
          opacity: 0;
        }
      }
    `;

    const styleSheet = document.createElement("style");
    styleSheet.innerText = keyframes;
    document.head.appendChild(styleSheet);

    return () => {
      document.head.removeChild(styleSheet);
      setPieces([]);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[200] overflow-hidden">
      {pieces.map(piece => (
        <div key={piece.id} style={piece.style} />
      ))}
    </div>
  );
}
