const EAN_FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e"] as const;

type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>;
};

type BarcodeDetectorConstructor = new (options?: {
  formats?: string[];
}) => BarcodeDetectorLike;

function normalizeEan(value: string | undefined | null): string | null {
  const ean = value?.replace(/\D/g, "") ?? "";
  return ean.length > 0 ? ean : null;
}

function getBarcodeDetector(): BarcodeDetectorConstructor | null {
  if (typeof window === "undefined") return null;
  return (window as Window & { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector ?? null;
}

export function isLiveBarcodeScanSupported(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(navigator.mediaDevices?.getUserMedia);
}

export async function requestCameraStream(): Promise<MediaStream> {
  const constraints: MediaStreamConstraints[] = [
    { video: { facingMode: { ideal: "environment" } }, audio: false },
    { video: { facingMode: "user" }, audio: false },
    { video: true, audio: false },
  ];

  let lastError: unknown;
  for (const constraint of constraints) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraint);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

export function cameraErrorMessage(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
      return "Kameratilgang ble avslått. Tillat kamera i nettleserinnstillinger og prøv igjen.";
    }
    if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
      return "Fant ikke kamera på enheten.";
    }
    if (error.name === "NotReadableError" || error.name === "TrackStartError") {
      return "Kameraet er opptatt. Lukk andre apper som bruker kamera og prøv igjen.";
    }
  }
  return "Kunne ikke starte kamera. Skriv inn EAN manuelt under.";
}

export function isBarcodeImageDetectionSupported(): boolean {
  return typeof window !== "undefined";
}

async function detectEanWithNativeDetector(source: ImageBitmapSource): Promise<string | null> {
  const Detector = getBarcodeDetector();
  if (!Detector) return null;

  try {
    const detector = new Detector({ formats: [...EAN_FORMATS] });
    const codes = await detector.detect(source);
    return normalizeEan(codes[0]?.rawValue);
  } catch {
    return null;
  }
}

async function detectEanWithZxingFromUrl(imageUrl: string): Promise<string | null> {
  const { BrowserMultiFormatReader } = await import("@zxing/browser");
  const reader = new BrowserMultiFormatReader();
  try {
    const result = await reader.decodeFromImageUrl(imageUrl);
    return normalizeEan(result.getText());
  } catch {
    return null;
  }
}

export async function detectEanFromImageFile(file: File): Promise<string | null> {
  const bitmap = await createImageBitmap(file);
  try {
    const native = await detectEanWithNativeDetector(bitmap);
    if (native) return native;
  } finally {
    bitmap.close();
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    return await detectEanWithZxingFromUrl(objectUrl);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export type LiveBarcodeScanner = {
  stop: () => void;
};

export async function startLiveBarcodeScan(
  video: HTMLVideoElement,
  stream: MediaStream,
  onDetected: (ean: string) => void,
): Promise<LiveBarcodeScanner> {
  const Detector = getBarcodeDetector();

  if (Detector) {
    const detector = new Detector({ formats: [...EAN_FORMATS] });
    let cancelled = false;

    const scan = async () => {
      if (cancelled) return;
      try {
        const codes = await detector.detect(video);
        const ean = normalizeEan(codes[0]?.rawValue);
        if (ean) {
          onDetected(ean);
          return;
        }
      } catch {
        // ignore frame errors
      }
      if (!cancelled) requestAnimationFrame(scan);
    };

    requestAnimationFrame(scan);
    return { stop: () => { cancelled = true; } };
  }

  const { BrowserMultiFormatReader } = await import("@zxing/browser");
  const reader = new BrowserMultiFormatReader();
  const controls = await reader.decodeFromStream(stream, video, (result) => {
    if (!result) return;
    const ean = normalizeEan(result.getText());
    if (ean) onDetected(ean);
  });

  return { stop: () => controls.stop() };
}
