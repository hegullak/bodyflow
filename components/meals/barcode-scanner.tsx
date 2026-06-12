"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>;
};

type BarcodeDetectorConstructor = new (options?: {
  formats?: string[];
}) => BarcodeDetectorLike;

function getBarcodeDetector(): BarcodeDetectorConstructor | null {
  if (typeof window === "undefined") return null;
  return (window as Window & { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector ?? null;
}

export function BarcodeScanner({
  onDetected,
  onError,
}: {
  onDetected: (ean: string) => void;
  onError?: (message: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [active, setActive] = useState(false);
  const supported = useMemo(
    () => typeof window !== "undefined" && Boolean(getBarcodeDetector()),
    [],
  );

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setActive(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const startCamera = useCallback(async () => {
    const Detector = getBarcodeDetector();
    if (!Detector) {
      onError?.("Barcode scanning is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      setActive(true);

      const detector = new Detector({
        formats: ["ean_13", "ean_8", "upc_a", "upc_e"],
      });

      let cancelled = false;
      const scan = async () => {
        if (cancelled || !videoRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          const ean = codes[0]?.rawValue?.replace(/\D/g, "");
          if (ean) {
            stopCamera();
            onDetected(ean);
            return;
          }
        } catch {
          // ignore frame errors
        }
        if (!cancelled) requestAnimationFrame(scan);
      };
      requestAnimationFrame(scan);

      return () => {
        cancelled = true;
      };
    } catch {
      onError?.("Could not access the camera. Check permissions or enter EAN manually.");
      stopCamera();
    }
  }, [onDetected, onError, stopCamera]);

  if (!supported) {
    return (
      <p className="text-xs text-[var(--color-muted-foreground)]">
        Strekkodeskanning støttes ikke i denne nettleseren (prøv Safari/Chrome på telefon). Du kan
        skrive inn EAN-koden manuelt under.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-black/5">
        <video ref={videoRef} className="aspect-[4/3] w-full object-cover" playsInline muted />
      </div>
      <div className="flex gap-2">
        {!active ? (
          <Button type="button" variant="secondary" size="sm" className="flex-1" onClick={startCamera}>
            Start kamera
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm" className="flex-1" onClick={stopCamera}>
            Stopp kamera
          </Button>
        )}
      </div>
    </div>
  );
}
