import React, { useEffect, useRef } from 'react';

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
}

const SplashCursor: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const mouse = { x: 0, y: 0, moved: false };
    const ripples: Ripple[] = [];
    const MAX_RIPPLES = 10;
    const MAX_LIFE = 1.5;
    const MAX_RADIUS = 80;

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.moved = true;
    };
    window.addEventListener('mousemove', handleMouseMove);

    let lastTime = 0;
    let animId = 0;

    const tick = (time: number) => {
      const dt = lastTime ? (time - lastTime) / 1000 : 0.016;
      lastTime = time;

      const isDark = document.documentElement.classList.contains('dark');

      if (mouse.moved && ripples.length < MAX_RIPPLES) {
        ripples.push({
          x: mouse.x,
          y: mouse.y,
          radius: 0,
          maxRadius: MAX_RADIUS,
          life: 0,
          maxLife: MAX_LIFE,
        });
        mouse.moved = false;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.life += dt;

        if (r.life >= r.maxLife) {
          ripples.splice(i, 1);
          continue;
        }

        const progress = r.life / r.maxLife;
        r.radius = MAX_RADIUS * progress;
        const alpha = 1 - progress;

        const color = isDark ? '255, 255, 255' : '80, 80, 80';

        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${color}, ${alpha})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // inner glow ring
        if (r.radius > 10) {
          ctx.beginPath();
          ctx.arc(r.x, r.y, r.radius * 0.5, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${color}, ${alpha * 0.4})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 999,
        opacity: 0.15,
      }}
    />
  );
};

export default SplashCursor;
