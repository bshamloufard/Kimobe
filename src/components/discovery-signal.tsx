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
    // A mouse keeps hovering (and sending pointermove) regardless of
    // whether a button is pressed, so a click's pointerup shouldn't turn
    // the effect off. Touch has no hover state at all — it should only
    // respond while a finger is actually down, and settle once it lifts.
    const handlePointerUp = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') pointer.active = false;
    };
    const handlePointerGone = () => {
      pointer.active = false;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerGone);
    window.addEventListener('pointerleave', handlePointerGone);
    window.addEventListener('blur', handlePointerGone);

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

      // Where the cursor is near, redraw that stretch brighter with a real
      // canvas gradient — one stroke() per contiguous highlighted run,
      // fading continuously through its color stops, rather than one flat
      // overlay color (a single strokeStyle applies to a whole path) or
      // hundreds of tiny individual strokes (expensive — each is its own
      // draw call).
      if (!pointer.active) return;
      ctx.lineWidth = c.weight + 0.6;
      let runStart = -1;
      for (let i = 0; i <= points.length; i++) {
        const isHot = i < points.length && points[i].pull > 0.015;
        if (isHot && runStart === -1) {
          runStart = i;
        } else if (!isHot && runStart !== -1) {
          strokeHotRun(points, runStart, i - 1, peak);
          runStart = -1;
        }
      }
    };

    const strokeHotRun = (
      points: { x: number; y: number; pull: number }[],
      startIdx: number,
      endIdx: number,
      peak: number
    ) => {
      if (endIdx <= startIdx) return;
      const p0 = points[startIdx];
      const p1 = points[endIdx];
      const span = p1.x - p0.x || 1;
      const highlight = ctx.createLinearGradient(p0.x, 0, p1.x, 0);
      for (let i = startIdx; i <= endIdx; i++) {
        const p = points[i];
        const offset = Math.min(Math.max((p.x - p0.x) / span, 0), 1);
        const eased = p.pull * p.pull;
        const alpha = Math.min(0.6, peak + 0.65 * eased);
        highlight.addColorStop(offset, `rgba(${traceColor}, ${alpha})`);
      }

      ctx.beginPath();
      ctx.strokeStyle = highlight;
      for (let i = startIdx; i <= endIdx; i++) {
        const p = points[i];
        if (i === startIdx) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
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
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerGone);
      window.removeEventListener('pointerleave', handlePointerGone);
      window.removeEventListener('blur', handlePointerGone);
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
