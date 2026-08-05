"use client";

import { useEffect, useRef } from "react";

type MagicRingsProps = {
  color?: string;
  colorTwo?: string;
  ringCount?: number;
  speed?: number;
  attenuation?: number;
  lineThickness?: number;
  baseRadius?: number;
  radiusStep?: number;
  scaleRate?: number;
  opacity?: number;
  blur?: number;
  noiseAmount?: number;
  rotation?: number;
  ringGap?: number;
  fadeIn?: number;
  fadeOut?: number;
  followMouse?: boolean;
  mouseInfluence?: number;
  hoverScale?: number;
  parallax?: number;
  clickBurst?: boolean;
  className?: string;
};

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

export function MagicRings({
  color = "#35E6A1",
  colorTwo = "#6366F1",
  ringCount = 5,
  speed = 0.45,
  attenuation = 16,
  lineThickness = 1,
  baseRadius = 0.3,
  radiusStep = 0.11,
  scaleRate = 0.06,
  opacity = 0.35,
  blur = 0.3,
  noiseAmount = 0.04,
  rotation = -8,
  ringGap = 1.6,
  fadeIn = 0.8,
  fadeOut = 0.7,
  followMouse = false,
  mouseInfluence = 0.2,
  hoverScale = 1.08,
  parallax = 0.02,
  clickBurst = false,
  className,
}: MagicRingsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let width = 0;
    let height = 0;
    let visible = false;
    let hovered = false;
    let burstStartedAt = 0;
    let pointerX = 0;
    let pointerY = 0;
    let smoothX = 0;
    let smoothY = 0;

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const draw = (time: number) => {
      context.clearRect(0, 0, width, height);
      context.globalCompositeOperation = "screen";
      context.lineCap = "round";
      context.filter = blur > 0 ? `blur(${blur}px)` : "none";

      smoothX += (pointerX - smoothX) * 0.06;
      smoothY += (pointerY - smoothY) * 0.06;

      const minimumDimension = Math.min(width, height);
      const mouseOffsetX = followMouse ? smoothX * mouseInfluence : smoothX * parallax;
      const mouseOffsetY = followMouse ? smoothY * mouseInfluence : smoothY * parallax;
      const centerX = width / 2 + mouseOffsetX;
      const centerY = height / 2 + mouseOffsetY;
      const hoverMultiplier = hovered ? hoverScale : 1;
      const burstAge = burstStartedAt ? Math.min((time - burstStartedAt) / 700, 1) : 1;
      const burstMultiplier = burstAge < 1 ? 1 + Math.sin(burstAge * Math.PI) * 0.16 : 1;
      const gradient = context.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, colorTwo);

      for (let ring = 0; ring < Math.max(1, ringCount); ring += 1) {
        const cycle = reducedMotion.matches
          ? ring / Math.max(ringCount, 1)
          : (time * 0.00012 * speed + (ring / Math.max(ringCount, 1)) * ringGap) % 1;
        const fade = clamp(Math.min(cycle / Math.max(fadeIn, 0.01), (1 - cycle) / Math.max(fadeOut, 0.01)), 0, 1);
        const radius = minimumDimension * 0.5 *
          (baseRadius + ring * radiusStep + cycle * scaleRate) *
          hoverMultiplier * burstMultiplier;

        context.beginPath();
        for (let segment = 0; segment <= 96; segment += 1) {
          const angle = (segment / 96) * Math.PI * 2 + (rotation * Math.PI) / 180;
          const noise = Math.sin(angle * 7 + time * 0.0007 * speed + ring * 1.9) * noiseAmount * minimumDimension * 0.06;
          const x = centerX + Math.cos(angle) * (radius + noise);
          const y = centerY + Math.sin(angle) * (radius + noise);
          if (segment === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        }
        context.closePath();
        context.strokeStyle = gradient;
        context.lineWidth = lineThickness;
        context.globalAlpha = opacity * fade / (1 + ring / Math.max(attenuation, 1));
        context.shadowColor = ring % 2 === 0 ? color : colorTwo;
        context.shadowBlur = 8 + blur * 8;
        context.stroke();
      }

      context.globalAlpha = 1;
      context.globalCompositeOperation = "source-over";
      context.filter = "none";
      context.shadowBlur = 0;

      if (visible && !reducedMotion.matches) frame = window.requestAnimationFrame(draw);
    };

    const updatePointer = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      pointerX = event.clientX - (bounds.left + bounds.width / 2);
      pointerY = event.clientY - (bounds.top + bounds.height / 2);
    };
    const enter = () => { hovered = true; };
    const leave = () => { hovered = false; pointerX = 0; pointerY = 0; };
    const burst = () => { if (clickBurst) burstStartedAt = performance.now(); };

    const resizeObserver = new ResizeObserver(() => {
      resize();
      if (reducedMotion.matches) draw(0);
    });
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      window.cancelAnimationFrame(frame);
      if (visible) frame = window.requestAnimationFrame(draw);
    }, { rootMargin: "120px" });

    resizeObserver.observe(canvas);
    visibilityObserver.observe(canvas);
    canvas.addEventListener("pointermove", updatePointer, { passive: true });
    canvas.addEventListener("pointerenter", enter);
    canvas.addEventListener("pointerleave", leave);
    canvas.addEventListener("pointerdown", burst);
    resize();

    return () => {
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      canvas.removeEventListener("pointermove", updatePointer);
      canvas.removeEventListener("pointerenter", enter);
      canvas.removeEventListener("pointerleave", leave);
      canvas.removeEventListener("pointerdown", burst);
      window.cancelAnimationFrame(frame);
    };
  }, [attenuation, baseRadius, blur, clickBurst, color, colorTwo, fadeIn, fadeOut, followMouse, hoverScale, lineThickness, mouseInfluence, noiseAmount, opacity, parallax, radiusStep, ringCount, ringGap, rotation, scaleRate, speed]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
