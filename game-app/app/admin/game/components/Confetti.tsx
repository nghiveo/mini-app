import { useEffect, useState } from 'react';

export default function Confetti() {
  const [pieces, setPieces] = useState<{ id: number; left: string; delay: string; color: string }[]>([]);

  useEffect(() => {
    const colors = ['#fce18a', '#ff726d', '#b48def', '#f4306d', '#00e1d9', '#42d6a4'];
    const newPieces = Array.from({ length: 100 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 2}s`,
      color: colors[Math.floor(Math.random() * colors.length)]
    }));
    setPieces(newPieces);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="absolute top-[-10%] w-3 h-6 animate-confetti opacity-0"
          style={{
            left: p.left,
            backgroundColor: p.color,
            animationDelay: p.delay,
            borderRadius: '2px',
          }}
        />
      ))}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes confetti {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
        .animate-confetti {
          animation: confetti 2.5s ease-out forwards;
        }
      `}} />
    </div>
  );
}
