"use client";

import { useEffect } from "react";

const SPECULAR_SELECTOR =
  ".app-button--primary, .btn-primary, [data-specular-button]";
const PROXIMITY = 250;

/**
 * Adds a pointer-following highlight to the existing primary button primitives.
 * Event delegation keeps links and submit buttons semantically unchanged.
 */
export function SpecularButtons() {
  useEffect(() => {
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (!finePointer.matches || reducedMotion.matches) return;

    let frame: number | null = null;
    let pointerX = 0;
    let pointerY = 0;
    let elements = Array.from(document.querySelectorAll<HTMLElement>(SPECULAR_SELECTOR));

    const paint = () => {
      frame = null;

      elements.forEach((element) => {
        if (element.matches(":disabled, [aria-disabled='true']")) {
          element.style.setProperty("--specular-opacity", "0");
          return;
        }

        const rect = element.getBoundingClientRect();
        const nearestX = Math.max(rect.left, Math.min(pointerX, rect.right));
        const nearestY = Math.max(rect.top, Math.min(pointerY, rect.bottom));
        const distance = Math.hypot(pointerX - nearestX, pointerY - nearestY);
        const opacity = Math.max(0, 1 - distance / PROXIMITY);

        element.style.setProperty("--specular-x", `${pointerX - rect.left}px`);
        element.style.setProperty("--specular-y", `${pointerY - rect.top}px`);
        element.style.setProperty("--specular-opacity", opacity.toFixed(3));
      });
    };

    const handlePointerMove = (event: PointerEvent) => {
      pointerX = event.clientX;
      pointerY = event.clientY;

      if (frame === null) frame = window.requestAnimationFrame(paint);
    };

    const clear = () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      frame = null;

      elements.forEach((element) => {
        element.style.setProperty("--specular-opacity", "0");
      });
    };

    const observer = new MutationObserver(() => {
      elements = Array.from(document.querySelectorAll<HTMLElement>(SPECULAR_SELECTOR));
    });

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", clear);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      document.documentElement.removeEventListener("pointerleave", clear);
      observer.disconnect();
      clear();
    };
  }, []);

  return null;
}
