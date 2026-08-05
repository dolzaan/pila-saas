"use client";

import { useEffect, useRef } from "react";

const DEFAULT_COLOR_STOPS = ["#7cff67", "#B497CF", "#5227FF"];

type AuroraProps = {
  colorStops?: string[];
  blend?: number;
  amplitude?: number;
  speed?: number;
  className?: string;
};

function hexToRgba(hex: string, alpha: number) {
  const value = hex.replace("#", "");
  const normalized = value.length === 3
    ? value.split("").map((character) => character + character).join("")
    : value;
  const parsed = Number.parseInt(normalized, 16);

  if (!Number.isFinite(parsed) || normalized.length !== 6) return hex;

  const red = (parsed >> 16) & 255;
  const green = (parsed >> 8) & 255;
  const blue = parsed & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function Aurora({
  colorStops = DEFAULT_COLOR_STOPS,
  blend = 0.5,
  amplitude = 1,
  speed = 1,
  className,
}: AuroraProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const colorStopsKey = colorStops.join("|");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animationFrame = 0;
    let width = 0;
    let height = 0;
    let isVisible = false;
    const stops = colorStopsKey.split("|").filter(Boolean);

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
      const progress = time * 0.00035 * speed;
      context.clearRect(0, 0, width, height);
      context.globalCompositeOperation = "screen";
      context.globalAlpha = Math.max(0.15, Math.min(blend, 1));
      context.lineCap = "round";
      context.lineJoin = "round";

      const gradient = context.createLinearGradient(0, 0, width, 0);
      const activeStops = stops.length > 0 ? stops : ["#7cff67"];
      activeStops.forEach((color, index) => {
        gradient.addColorStop(index / Math.max(activeStops.length - 1, 1), hexToRgba(color, 0.95));
      });

      for (let ribbon = 0; ribbon < 3; ribbon += 1) {
        context.beginPath();
        const phase = progress * (1 + ribbon * 0.12) + ribbon * 1.7;

        for (let x = -40; x <= width + 40; x += 8) {
          const primaryWave = Math.sin(x * 0.006 + phase) * height * 0.16;
          const detailWave = Math.sin(x * 0.013 - phase * 0.72 + ribbon) * height * 0.055;
          const y = height * (0.48 + ribbon * 0.08) + (primaryWave + detailWave) * amplitude;

          if (x === -40) context.moveTo(x, y);
          else context.lineTo(x, y);
        }

        context.strokeStyle = gradient;
        context.lineWidth = Math.max(70, height * (0.38 - ribbon * 0.07));
        context.shadowColor = activeStops[ribbon % activeStops.length];
        context.shadowBlur = 42;
        context.stroke();
      }

      context.globalAlpha = 1;
      context.globalCompositeOperation = "source-over";
      context.shadowBlur = 0;

      if (isVisible && !reducedMotion.matches) {
        animationFrame = window.requestAnimationFrame(draw);
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      resize();
      if (reducedMotion.matches) draw(0);
    });

    const visibilityObserver = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;

      if (isVisible) {
        window.cancelAnimationFrame(animationFrame);
        animationFrame = window.requestAnimationFrame(draw);
      } else {
        window.cancelAnimationFrame(animationFrame);
      }
    }, { rootMargin: "120px" });

    resizeObserver.observe(canvas);
    visibilityObserver.observe(canvas);
    resize();

    return () => {
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      window.cancelAnimationFrame(animationFrame);
    };
  }, [amplitude, blend, colorStopsKey, speed]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
