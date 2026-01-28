
import React, { useEffect, useRef } from 'react';
import { CollectionMethod } from '../types';

interface FluxVisualizerProps {
  method: CollectionMethod;
}

const FluxVisualizer: React.FC<FluxVisualizerProps> = ({ method }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const particles: { x: number; y: number; vx: number; vy: number; captured: boolean; color: string; size: number }[] = [];
    const numParticles = 60;

    for (let i = 0; i < numParticles; i++) {
      particles.push(resetParticle(canvas));
    }

    function resetParticle(c: HTMLCanvasElement) {
      const isStochastic = method === CollectionMethod.STOCHASTIC_FLUX;
      return {
        x: Math.random() * c.width,
        y: Math.random() * c.height,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        captured: false,
        size: Math.random() * 2 + 1,
        color: isStochastic ? '#10b981' : '#3b82f6'
      };
    }

    const render = () => {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.2)'; // Fading trail
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // Draw Gravity Well (Vault Core)
      ctx.strokeStyle = method === CollectionMethod.STOCHASTIC_FLUX ? '#10b981' : '#3b82f6';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 30, 0, Math.PI * 2);
      ctx.stroke();
      
      ctx.fillStyle = ctx.strokeStyle;
      ctx.shadowBlur = 15;
      ctx.shadowColor = ctx.fillStyle as string;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      particles.forEach((p, idx) => {
        if (p.captured) {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          
          if (Math.random() > 0.99) particles[idx] = resetParticle(canvas);
          return;
        }

        // Distance to core
        const dx = centerX - p.x;
        const dy = centerY - p.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        // Attraction force
        const force = 0.05;
        p.vx += (dx / dist) * force;
        p.vy += (dy / dist) * force;

        if (method === CollectionMethod.STOCHASTIC_FLUX) {
          // Brownian Kinetic Noise
          p.vx += (Math.random() - 0.5) * 0.8;
          p.vy += (Math.random() - 0.5) * 0.8;
        }

        p.x += p.vx;
        p.y += p.vy;

        // Friction
        p.vx *= 0.98;
        p.vy *= 0.98;

        // Capture Logic
        if (dist < 32) {
          p.captured = true;
          // Orbital lock
          p.vx = 0;
          p.vy = 0;
        }

        // Out of bounds reset
        if (p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height) {
          particles[idx] = resetParticle(canvas);
        }

        // Draw particle
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameId = window.requestAnimationFrame(render);
    };

    render();
    return () => window.cancelAnimationFrame(animationFrameId);
  }, [method]);

  return (
    <div className="relative w-full h-full bg-slate-950 rounded-xl overflow-hidden border border-slate-800">
      <canvas ref={canvasRef} width={600} height={400} className="w-full h-full" />
      <div className="absolute top-2 left-2 text-[10px] uppercase tracking-widest text-emerald-500 font-black flex items-center gap-2">
        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
        Cosmic Dust Interceptor Core
      </div>
    </div>
  );
};

export default FluxVisualizer;
