"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Wall-clock driven timer — immune to React render timing and setInterval drift.
// All mutable state lives in refs; React state is only updated for display.
export function useRestTimer() {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);

  const r = useRef({
    endAt: null as number | null,
    running: false,
    seconds: 0,
    interval: null as ReturnType<typeof setInterval> | null,
  });

  const fns = useRef({
    stopTick() {
      if (r.current.interval !== null) {
        clearInterval(r.current.interval);
        r.current.interval = null;
      }
    },
    startTick(endAt: number) {
      fns.current.stopTick();
      r.current.interval = setInterval(() => {
        const rem = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
        r.current.seconds = rem;
        setSeconds(rem);
        if (rem <= 0) {
          fns.current.stopTick();
          r.current.endAt = null;
          r.current.running = false;
          setRunning(false);
        }
      }, 250);
    },
    start(duration: number) {
      const endAt = Date.now() + duration * 1000;
      r.current.endAt = endAt;
      r.current.seconds = duration;
      r.current.running = true;
      setSeconds(duration);
      setRunning(true);
      fns.current.startTick(endAt);
    },
    pause() {
      if (r.current.running) {
        fns.current.stopTick();
        r.current.endAt = null;
        r.current.running = false;
        setRunning(false);
      } else {
        const s = r.current.seconds;
        if (s > 0) {
          const endAt = Date.now() + s * 1000;
          r.current.endAt = endAt;
          r.current.running = true;
          setRunning(true);
          fns.current.startTick(endAt);
        }
      }
    },
    skip() {
      fns.current.stopTick();
      r.current.endAt = null;
      r.current.running = false;
      r.current.seconds = 0;
      setRunning(false);
      setSeconds(0);
    },
    add(n: number) {
      if (r.current.endAt !== null) {
        r.current.endAt += n * 1000;
        const rem = Math.max(0, Math.ceil((r.current.endAt - Date.now()) / 1000));
        r.current.seconds = rem;
        setSeconds(rem);
        fns.current.startTick(r.current.endAt);
      } else {
        const newS = Math.max(0, r.current.seconds + n);
        r.current.seconds = newS;
        setSeconds(newS);
      }
    },
  });

  useEffect(() => () => fns.current.stopTick(), []);

  const start = useCallback((duration: number) => fns.current.start(duration), []);
  const pause = useCallback(() => fns.current.pause(), []);
  const skip  = useCallback(() => fns.current.skip(), []);
  const add   = useCallback((n: number) => fns.current.add(n), []);

  return { seconds, running, active: running || seconds > 0, start, pause, skip, add };
}

export type RestTimer = ReturnType<typeof useRestTimer>;
