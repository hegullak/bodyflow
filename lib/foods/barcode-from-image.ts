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

export async function detectEanFromImageFile(file: File): Promise<string | null> {
  const Detector = getBarcodeDetector();
  if (!Detector) return null;

  const bitmap = await createImageBitmap(file);
  try {
    const detector = new Detector({
      formats: ["ean_13", "ean_8", "upc_a", "upc_e"],
    });
    const codes = await detector.detect(bitmap);
    const ean = codes[0]?.rawValue?.replace(/\D/g, "");
    return ean || null;
  } catch {
    return null;
  } finally {
    bitmap.close();
  }
}

export function isBarcodeImageDetectionSupported(): boolean {
  return Boolean(getBarcodeDetector());
}
