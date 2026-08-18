import { useEffect, useRef } from 'react';

/**
 * DiscoverySignal — ambient background for the Kimobe hero.
 *
 * A bank of flowing instrument traces, each drifting on its own rhythm.
 * There's no scripted "moment" and nothing is clickable — the field just
 * responds to wherever the visitor is pointing: traces bend and brighten
 * toward the cursor (or a dragging finger on touch), like signal wires
 * reacting to a probe, and settle back once it moves on.
 */

interface DiscoverySignalProps {
  backgroundColor?: string;
  traceColor?: string;
  channelCount?: number;
}

const TAU = Math.PI * 2;

interface Channel {
  freqA: number;
  freqB: number;
  phaseA: number;
  phaseB: number;
  speedA: number;
  speedB: number;
  amplitude: number;
  weight: number;
  strength: number;
}

function makeChannel(): Channel {
  return {
    freqA: 0.5 + Math.random() * 0.5,
    freqB: 1.2 + Math.random() * 0.7,
    phaseA: Math.random() * TAU,
    phaseB: Math.random() * TAU,
    speedA: 0.13 + Math.random() * 0.1,
    speedB: 0.09 + Math.random() * 0.07,
    amplitude: 16 + Math.random() * 18,
    weight: 1 + Math.random() * 1.4,
    strength: 0.55 + Math.random() * 0.4,
  };
}

const DiscoverySignal = ({
  backgroundColor = '#f7f5f1',
  traceColor = '23, 22, 15',
  channelCount = 9,
}: DiscoverySignalProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    let width = 0;
    let height = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const channels = Array.from({ length: channelCount }, makeChannel);
    const step = 5; // px between sampled points along a trace

    // Cursor tracking: a raw target plus a lerped position so the field's
    // response trails smoothly rather than snapping frame to frame.
    // Pointer Events unify mouse, touch, and pen, so this same state
    // drives both a mouse hover and a dragging finger on a phone.
    const pointer = { targetX: -9999, targetY: -9999, x: -9999, y: -9999, active: false };

    const setPointerFromEvent = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      pointer.targetX = clientX - rect.left;
      pointer.targetY = clientY - rect.top;
      pointer.active = true;
    };

    const handlePointerMove = (e: PointerEvent) => setPointerFromEvent(e.clientX, e.clientY);
    const handlePointerDown = (e: PointerEvent) => setPointerFromEvent(e.clientX, e.clientY);
    // Touch has no hover state — the field should only respond while a
    // finger is actually down, and settle once it lifts or cancels.
    const handlePointerEnd = () => {
      pointer.active = false;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointerup', handlePointerEnd);
    window.addEventListener('pointercancel', handlePointerEnd);
    window.addEventListener('pointerleave', handlePointerEnd);
    window.addEventListener('blur', handlePointerEnd);

    const drawChannel = (c: Channel, y: number, t: number) => {
      // Fade the line toward the screen edges — gives each trace
      // compositional weight instead of a flat, uniform wash edge-to-edge.
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      const peak = 0.22 * c.strength;
      gradient.addColorStop(0, `rgba(${traceColor}, 0)`);
      gradient.addColorStop(0.18, `rgba(${traceColor}, ${peak})`);
      gradient.addColorStop(0.82, `rgba(${traceColor}, ${peak})`);
      gradient.addColorStop(1, `rgba(${traceColor}, 0)`);

      ctx.beginPath();
      ctx.strokeStyle = gradient;
      ctx.lineWidth = c.weight;

      const points: { x: number; y: number; pull: number }[] = [];

      for (let x = 0; x <= width; x += step) {
        const xt = (x / width) * TAU;
        const baseY =
          y +
          c.amplitude *
            (Math.sin(xt * c.freqA + c.phaseA + t * c.speedA) * 0.65 +
              Math.sin(xt * c.freqB + c.phaseB + t * c.speedB) * 0.35);

        let py = baseY;
        let pull = 0;
        if (pointer.active) {
          const dx = x - pointer.x;
          const dy = baseY - pointer.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          pull = Math.exp(-(dist * dist) / (2 * 95 * 95));
          py = baseY + (pointer.y - baseY) * pull * 0.55;
        }

        points.push({ x, y: py, pull });
        if (x === 0) ctx.moveTo(x, py);
        else ctx.lineTo(x, py);
      }
      ctx.stroke();

      // Where the cursor is near, redraw that stretch brighter — as a true
      // per-segment fade, not one flat overlay color. A canvas strokeStyle
      // only applies to the whole path at stroke() time, so getting an
      // actual gradient means stroking each short segment individually
      // with its own alpha, eased so it brightens and fades smoothly
      // instead of snapping on at a hard edge.
      ctx.lineWidth = c.weight + 0.6;
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1];
        const b = points[i];
        const pull = (a.pull + b.pull) / 2;
        if (pull < 0.015) continue;
        const eased = pull * pull;
        const alpha = Math.min(0.6, peak + 0.65 * eased);
        ctx.strokeStyle = `rgba(${traceColor}, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    };

    let animationFrameId: number;
    const start = performance.now();

    const render = (now: number) => {
      const t = reduceMotion ? 0 : (now - start) / 1000;

      // Smoothly trail the cursor rather than snapping to it.
      pointer.x += (pointer.targetX - pointer.x) * 0.14;
      pointer.y += (pointer.targetY - pointer.y) * 0.14;

      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);

      const spacing = height / channelCount;
      channels.forEach((c, i) => {
        const y = (i + 0.5) * spacing;
        drawChannel(c, y, t);
      });

      animationFrameId = requestAnimationFrame(render);
    };
    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerEnd);
      window.removeEventListener('pointercancel', handlePointerEnd);
      window.removeEventListener('pointerleave', handlePointerEnd);
      window.removeEventListener('blur', handlePointerEnd);
      cancelAnimationFrame(animationFrameId);
    };
  }, [backgroundColor, traceColor, channelCount]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 block h-full w-full touch-none select-none"
      style={{ backgroundColor }}
    />
  );
};

export default DiscoverySignal;
