"use client";

import { useEffect } from "react";
import styles from "./landing-motion.module.css";

type Cleanup = () => void;

function setDelay(element: HTMLElement, index: number, step = 70) {
  element.style.setProperty("--landing-delay", `${Math.min(index * step, 420)}ms`);
}

export function LandingMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>("[data-landing-root]");
    if (!root) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const cleanups: Cleanup[] = [];
    const hero = root.querySelector<HTMLElement>("section:first-of-type");
    const heroGrid = hero?.querySelector<HTMLElement>(":scope > div:last-child");
    const heroCopy = heroGrid?.children[0] as HTMLElement | undefined;
    const heroVisual = heroGrid?.children[1] as HTMLElement | undefined;

    root.dataset.motionReady = "true";
    root.querySelector<HTMLElement>("header")?.setAttribute("data-hero-enter", "header");
    heroCopy?.setAttribute("data-hero-enter", "copy");
    heroVisual?.setAttribute("data-hero-enter", "visual");

    if (hero) {
      const ambient = document.createElement("div");
      ambient.dataset.landingAmbient = "true";
      ambient.setAttribute("aria-hidden", "true");
      for (let index = 0; index < 7; index += 1) {
        const particle = document.createElement("i");
        particle.style.setProperty("--particle-index", String(index));
        ambient.appendChild(particle);
      }
      hero.prepend(ambient);
      cleanups.push(() => ambient.remove());
    }

    if (heroVisual) {
      heroVisual.dataset.tilt = "true";
      const directChildren = Array.from(heroVisual.children) as HTMLElement[];
      directChildren[0]?.setAttribute("data-floating", "balance");
      directChildren[1]?.setAttribute("data-floating", "phone");
      directChildren[2]?.setAttribute("data-floating", "budget");

      const phone = directChildren[1];
      const chat = phone?.children[1] as HTMLElement | undefined;
      Array.from(chat?.children || []).forEach((child, index) => {
        const bubble = child as HTMLElement;
        bubble.dataset.chatBubble = "true";
        setDelay(bubble, index, 180);
      });

      const progressFill = directChildren[2]?.querySelector<HTMLElement>("i");
      progressFill?.setAttribute("data-progress-fill", "true");

      const canTilt = window.matchMedia("(pointer: fine)").matches && !reducedMotion.matches;
      if (canTilt) {
        const handlePointerMove = (event: PointerEvent) => {
          const rect = heroVisual.getBoundingClientRect();
          const x = (event.clientX - rect.left) / rect.width - 0.5;
          const y = (event.clientY - rect.top) / rect.height - 0.5;
          heroVisual.style.setProperty("--landing-tilt-x", `${(-y * 4).toFixed(2)}deg`);
          heroVisual.style.setProperty("--landing-tilt-y", `${(x * 5).toFixed(2)}deg`);
          heroVisual.style.setProperty("--landing-pointer-x", `${((x + 0.5) * 100).toFixed(1)}%`);
          heroVisual.style.setProperty("--landing-pointer-y", `${((y + 0.5) * 100).toFixed(1)}%`);
        };
        const resetTilt = () => {
          heroVisual.style.setProperty("--landing-tilt-x", "0deg");
          heroVisual.style.setProperty("--landing-tilt-y", "0deg");
        };

        heroVisual.addEventListener("pointermove", handlePointerMove);
        heroVisual.addEventListener("pointerleave", resetTilt);
        cleanups.push(() => {
          heroVisual.removeEventListener("pointermove", handlePointerMove);
          heroVisual.removeEventListener("pointerleave", resetTilt);
        });
      }
    }

    const revealTargets = new Set<HTMLElement>();
    const sections = Array.from(root.querySelectorAll<HTMLElement>("section"));
    sections.slice(1).forEach((section) => {
      revealTargets.add(section);
      Array.from(section.querySelectorAll<HTMLElement>("article, details")).forEach(
        (element, index) => {
          element.dataset.motionCard = "true";
          setDelay(element, index);
          revealTargets.add(element);
        },
      );
    });

    root.querySelectorAll<HTMLElement>("footer").forEach((element) => revealTargets.add(element));
    hero?.nextElementSibling?.querySelectorAll<HTMLElement>("span").forEach((element, index) => {
      setDelay(element, index, 100);
      revealTargets.add(element);
    });

    const chartBars = Array.from(root.querySelectorAll<HTMLElement>('i[style*="height"]'));
    chartBars.forEach((bar, index) => {
      bar.dataset.chartBar = "true";
      setDelay(bar, index, 75);
    });

    root.querySelectorAll<HTMLAnchorElement>('a[href="/register"]').forEach((link) => {
      link.dataset.animatedCta = "true";
    });

    revealTargets.forEach((element) => {
      element.dataset.reveal = "true";
    });

    if (reducedMotion.matches || !("IntersectionObserver" in window)) {
      revealTargets.forEach((element) => {
        element.dataset.visible = "true";
      });
      chartBars.forEach((bar) => {
        bar.dataset.visible = "true";
      });
    } else {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            (entry.target as HTMLElement).dataset.visible = "true";
            observer.unobserve(entry.target);
          });
        },
        { rootMargin: "0px 0px -9%", threshold: 0.12 },
      );

      revealTargets.forEach((element) => observer.observe(element));
      chartBars.forEach((bar) => observer.observe(bar));
      cleanups.push(() => observer.disconnect());
    }

    window.requestAnimationFrame(() => {
      root.dataset.heroVisible = "true";
    });

    return () => {
      delete root.dataset.motionReady;
      delete root.dataset.heroVisible;
      cleanups.forEach((cleanup) => cleanup());
    };
  }, []);

  return <span className={styles.controller} aria-hidden="true" />;
}
