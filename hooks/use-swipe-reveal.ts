"use client";

import { useRef } from "react";
import type React from "react";

interface Options {
  revealW?: number;
  snapThreshold?: number;
}

export function useSwipeReveal({ revealW = 112, snapThreshold = 40 }: Options = {}) {
  const innerRef = useRef<HTMLDivElement>(null);
  const sw = useRef({ startX: 0, startY: 0, tracking: false, revealed: false, dragging: false });

  function snapTo(x: number, animate = true) {
    const el = innerRef.current;
    if (!el) return;
    el.style.transition = animate ? "transform 0.25s cubic-bezier(0.4,0,0.2,1)" : "none";
    el.style.transform = `translateX(${x}px)`;
    sw.current.revealed = x < 0;
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    sw.current = { startX: e.clientX, startY: e.clientY, tracking: true, dragging: false, revealed: sw.current.revealed };
    e.currentTarget.setPointerCapture(e.pointerId);
    if (innerRef.current) innerRef.current.style.transition = "none";
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!sw.current.tracking || !innerRef.current) return;
    const dx = e.clientX - sw.current.startX;
    const dy = e.clientY - sw.current.startY;
    if (!sw.current.dragging && Math.abs(dy) > Math.abs(dx) + 5) { sw.current.tracking = false; return; }
    if (!sw.current.dragging && Math.abs(dx) > 4) sw.current.dragging = true;
    if (!sw.current.dragging) return;
    const base = sw.current.revealed ? -revealW : 0;
    innerRef.current.style.transform = `translateX(${Math.max(-revealW, Math.min(0, base + dx))}px)`;
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!sw.current.tracking) return;
    sw.current.tracking = false;
    if (!sw.current.dragging) return;
    const base = sw.current.revealed ? -revealW : 0;
    snapTo(base + (e.clientX - sw.current.startX) < -snapThreshold ? -revealW : 0);
  }

  function onPointerCancel() {
    sw.current.tracking = false;
    snapTo(sw.current.revealed ? -revealW : 0);
  }

  return {
    innerRef,
    snapTo,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
    isDragging: () => sw.current.dragging,
  };
}
