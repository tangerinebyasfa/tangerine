"use client";

import { useEffect, useRef } from "react";

const PANEL_WIDTH = 535;
const PANEL_HEIGHT = 420;
const ZOOM_SCALE = 3.5;
const LENS_RATIO = 0.26;
const EDGE_GAP = 45;

/**
 * Adds an Amazon-style hover magnifier to a product image.
 * A lens follows the pointer over the image and a separate floating
 * window shows the zoomed-in portion. Enabled only for precise hover
 * devices (desktop), so touch layouts are unaffected.
 */
export default function ImageZoom({ src, className = "", children }) {
  const containerRef = useRef(null);
  const panelRef = useRef(null);
  const lensRef = useRef(null);
  const cursorRef = useRef(null);

  function applyBackground() {
    const container = containerRef.current;
    const panel = panelRef.current;
    if (!container || !panel) return;

    // Reuse the already-loaded <img> source (Next.js may have optimized it)
    // so hovering does not trigger a second download.
    const image = container.querySelector("img");
    const url = image?.currentSrc || image?.src || src;
    if (url) panel.style.backgroundImage = `url("${url.replace(/"/g, '\\"')}")`;
  }

  useEffect(() => {
    applyBackground();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  function moveLens(event) {
    const container = containerRef.current;
    const panel = panelRef.current;
    const lens = lensRef.current;
    if (!container || !panel || !lens) return;

    const rect = container.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const x = Math.min(Math.max(event.clientX - rect.left, 0), rect.width);
    const y = Math.min(Math.max(event.clientY - rect.top, 0), rect.height);
    const xPercent = (x / rect.width) * 100;
    const yPercent = (y / rect.height) * 100;

    const lensWidth = rect.width * LENS_RATIO;
    const lensHeight = rect.height * LENS_RATIO;

    lens.style.width = `${lensWidth}px`;
    lens.style.height = `${lensHeight}px`;
    lens.style.left = `${Math.min(Math.max(x - lensWidth / 2, 0), rect.width - lensWidth)}px`;
    lens.style.top = `${Math.min(Math.max(y - lensHeight / 2, 0), rect.height - lensHeight)}px`;
    lens.style.opacity = "1";

    const cursor = cursorRef.current;
    if (cursor) {
      const overButton = Boolean(event.target?.closest?.("button"));
      cursor.style.left = `${x}px`;
      cursor.style.top = `${y}px`;
      cursor.style.opacity = overButton ? "0" : "1";
    }

    panel.style.backgroundPosition = `${xPercent}% ${yPercent}%`;
  }

  function showPanel(event) {
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    const container = containerRef.current;
    const panel = panelRef.current;
    if (!container || !panel) return;

    const rect = container.getBoundingClientRect();
    let left = rect.right + EDGE_GAP;
    let top = rect.top;

    if (left + PANEL_WIDTH > window.innerWidth - EDGE_GAP) {
      left = rect.left - PANEL_WIDTH - EDGE_GAP;
    }
    if (left < EDGE_GAP) {
      left = Math.max(EDGE_GAP, window.innerWidth - PANEL_WIDTH - EDGE_GAP);
    }
    top = Math.min(
      Math.max(EDGE_GAP, top),
      Math.max(EDGE_GAP, window.innerHeight - PANEL_HEIGHT - EDGE_GAP)
    );

    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
    panel.style.opacity = "1";
    applyBackground();
    moveLens(event);
  }

  function hidePanel() {
    if (panelRef.current) panelRef.current.style.opacity = "0";
    if (lensRef.current) lensRef.current.style.opacity = "0";
    if (cursorRef.current) cursorRef.current.style.opacity = "0";
  }

  return (
    <>
      <div
        ref={containerRef}
        className={`image-zoom-surface relative cursor-zoom-in ${className}`}
        onMouseEnter={showPanel}
        onMouseMove={moveLens}
        onMouseLeave={hidePanel}
      >
        {children}
        <span
          ref={lensRef}
          aria-hidden="true"
          className="pointer-events-none absolute z-[5] hidden border border-white/80 bg-white/10 opacity-0 shadow-[0_0_0_1px_rgba(0,0,0,0.08)] transition-opacity duration-150 lg:block"
        />
        <span
          ref={cursorRef}
          aria-hidden="true"
          className="pointer-events-none absolute z-20 hidden h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-tangerine/40 text-tangerine opacity-0 transition-opacity duration-150 lg:flex"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-4 w-4 fill-none stroke-current stroke-2"
          >
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
        </span>
      </div>
      <div
        ref={panelRef}
        aria-hidden="true"
        className="pointer-events-none fixed z-30 hidden border border-ink/15 bg-white bg-no-repeat opacity-0 shadow-[0_24px_60px_rgba(0,0,0,0.22)] transition-opacity duration-150 lg:block"
        style={{
          width: PANEL_WIDTH,
          height: PANEL_HEIGHT,
          backgroundSize: `${ZOOM_SCALE * 100}%`,
        }}
      />
      <style jsx global>{`
        @media (hover: hover) and (pointer: fine) and (min-width: 1024px) {
          .image-zoom-surface {
            cursor: none;
          }
          .image-zoom-surface button {
            cursor: pointer;
          }
        }
      `}</style>
    </>
  );
}
