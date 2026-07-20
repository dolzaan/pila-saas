"use client";

import { useEffect } from "react";

type PublicEventName =
  | "landing_cta_clicked"
  | "registration_started"
  | "support_requested";

function sendEvent(
  eventName: PublicEventName,
  properties?: Record<string, string | number | boolean>,
) {
  void fetch("/api/product-events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventName, properties }),
    keepalive: true,
  }).catch(() => undefined);
}

export function ProductEventTracker() {
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest("a");
      if (!link) return;

      const href = link.getAttribute("href") || "";
      const location = window.location.pathname;

      if (href === "/register" || href.startsWith("/register?")) {
        sendEvent(
          location === "/" ? "landing_cta_clicked" : "registration_started",
          { location },
        );
        return;
      }

      if (href.includes("wa.me/") && href.toLowerCase().includes("pila")) {
        sendEvent("support_requested", { location });
      }
    }

    document.addEventListener("click", handleClick, { capture: true });
    return () => document.removeEventListener("click", handleClick, { capture: true });
  }, []);

  return null;
}
