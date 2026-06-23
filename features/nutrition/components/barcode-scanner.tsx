"use client";

import { useEffect, useRef, useState } from "react";
import {
  cameraErrorMessage,
  isLiveBarcodeScanSupported,
  requestCameraStream,
  startLiveBarcodeScan,
  type LiveBarcodeScanner,
} from "@/lib/foods/barcode-detect";

function CameraView({
  stream,
  onDetected,
  onError,
}: {
  stream: MediaStream;
  onDetected: (ean: string) => void;
  onError?: (message: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<LiveBarcodeScanner | null>(null);
  const onDetectedRef = useRef(onDetected);
  const onErrorRef = useRef(onError);
  const [status, setStatus] = useState<"starting" | "live">("starting");

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    let cancelled = false;

    const stopScanner = () => {
      scannerRef.current?.stop();
      scannerRef.current = null;
    };

    const attach = async () => {
      try {
        const video = videoRef.current;
        if (!video || cancelled) return;

        video.srcObject = stream;
        video.setAttribute("playsinline", "true");
        video.muted = true;
        await video.play();

        if (cancelled) return;

        scannerRef.current = await startLiveBarcodeScan(video, stream, (ean) => {
          stopScanner();
          onDetectedRef.current(ean);
        });

        if (!cancelled) setStatus("live");
      } catch (error) {
        if (!cancelled) onErrorRef.current?.(cameraErrorMessage(error));
      }
    };

    void attach();

    return () => {
      cancelled = true;
      stopScanner();
    };
  }, [stream]);

  return (
    <div className="relative overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-black">
      <video ref={videoRef} className="aspect-[4/3] w-full object-cover" playsInline muted />
      {status === "starting" ? (
        <p className="absolute inset-x-0 bottom-0 bg-black/50 py-1 text-center text-[10px] text-white">
          Starter kamera…
        </p>
      ) : null}
    </div>
  );
}

export function BarcodeScanner({
  stream,
  onDetected,
  onError,
  onRetry,
}: {
  stream: MediaStream | null;
  onDetected: (ean: string) => void;
  onError?: (message: string) => void;
  onRetry?: () => void;
}) {
  const supported = isLiveBarcodeScanSupported();

  if (!supported) {
    return (
      <p className="text-xs text-[var(--color-muted-foreground)]">
        Kamera krever HTTPS og tillatelse. Skriv inn EAN manuelt under.
      </p>
    );
  }

  if (!stream) {
    return (
      <p className="text-xs text-[var(--color-muted-foreground)]">
        Starter kamera…
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <CameraView stream={stream} onDetected={onDetected} onError={onError} />
      {onRetry ? (
        <button
          type="button"
          className="w-full text-center text-[10px] text-[var(--color-muted-foreground)] underline-offset-2 hover:underline"
          onClick={onRetry}
        >
          Kamera problemer? Prøv igjen
        </button>
      ) : null}
    </div>
  );
}

export { cameraErrorMessage, requestCameraStream };
