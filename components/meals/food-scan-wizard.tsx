"use client";

import { useEffect, useState, useTransition } from "react";
import type { FoodProductSummary } from "@/lib/foods/types";
import { detectEanFromImageFile } from "@/lib/foods/barcode-from-image";
import { saveCustomFoodAction } from "@/lib/actions/custom-food";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/field";

type Step = "barcode" | "nutrition" | "review";

type ExtractionResult = {
  name: string | null;
  brand: string | null;
  ean: string | null;
  kcalPer100g: number | null;
  packageGrams: number | null;
  method: "vision" | "ocr";
};

export function FoodScanWizard({
  initialEan,
  onSaved,
  onUseExisting,
  onCancel,
}: {
  initialEan?: string;
  onSaved: (product: FoodProductSummary) => void;
  onUseExisting: (product: FoodProductSummary) => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState<Step>(initialEan ? "nutrition" : "barcode");
  const [prefixId, setPrefixId] = useState<string | null>(null);
  const [visionEnabled, setVisionEnabled] = useState(false);
  const [barcodeFile, setBarcodeFile] = useState<File | null>(null);
  const [nutritionFile, setNutritionFile] = useState<File | null>(null);
  const [ean, setEan] = useState(initialEan ?? "");
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [kcalPer100g, setKcalPer100g] = useState("");
  const [packageGrams, setPackageGrams] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    fetch("/api/foods/config")
      .then((res) => res.json())
      .then((json: { data?: { customPrefixId?: string; visionEnabled?: boolean } }) => {
        setPrefixId(json.data?.customPrefixId ?? null);
        setVisionEnabled(Boolean(json.data?.visionEnabled));
      })
      .catch(() => undefined);
  }, []);

  async function handleBarcodeFile(file: File | null) {
    setBarcodeFile(file);
    setError(null);
    if (!file) return;

    const detected = await detectEanFromImageFile(file);
    if (detected) setEan(detected);
  }

  async function runOcr(file: File): Promise<string> {
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("nor+eng");
    try {
      const { data } = await worker.recognize(file);
      return data.text;
    } finally {
      await worker.terminate();
    }
  }

  async function handleExtract() {
    if (!nutritionFile) {
      setError("Ta bilde av næringsinnholdet.");
      return;
    }

    setExtracting(true);
    setError(null);

    try {
      let ocrText: string | undefined;
      if (!visionEnabled) {
        ocrText = await runOcr(nutritionFile);
      }

      const formData = new FormData();
      formData.set("nutritionImage", nutritionFile);
      if (ean.trim()) formData.set("ean", ean.trim());
      if (ocrText) formData.set("ocrText", ocrText);

      const res = await fetch("/api/foods/extract", { method: "POST", body: formData });
      const json = (await res.json()) as {
        data?: {
          existing?: boolean;
          product?: FoodProductSummary;
          extraction?: ExtractionResult;
        };
        error?: string;
      };

      if (!res.ok) {
        setError(json.error ?? "Kunne ikke lese etiketten.");
        return;
      }

      if (json.data?.existing && json.data.product) {
        onUseExisting(json.data.product);
        return;
      }

      const extraction = json.data?.extraction;
      if (!extraction) {
        setError("Fant ingen data i bildet.");
        return;
      }

      if (extraction.ean) setEan(extraction.ean);
      if (extraction.name) setName(extraction.name);
      if (extraction.brand) setBrand(extraction.brand);
      if (extraction.kcalPer100g != null) setKcalPer100g(String(extraction.kcalPer100g));
      if (extraction.packageGrams != null) setPackageGrams(String(extraction.packageGrams));
      setStep("review");
    } catch {
      setError("Kunne ikke lese etiketten.");
    } finally {
      setExtracting(false);
    }
  }

  function handleSave() {
    const formData = new FormData();
    formData.set("name", name);
    formData.set("brand", brand);
    formData.set("ean", ean);
    formData.set("kcalPer100g", kcalPer100g);
    formData.set("packageGrams", packageGrams);

    startTransition(async () => {
      const result = await saveCustomFoodAction(null, formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      onSaved({
        id: result.data.foodProductId,
        source: "custom",
        externalId: `${prefixId ?? "custom"}-${result.data.foodProductId}`,
        name: result.data.name,
        prettyName: null,
        brand: brand || null,
        ean: ean || null,
        image: null,
        kcalPer100g: result.data.kcalPer100g,
        packageGrams: packageGrams ? Number(packageGrams) : null,
      });
    });
  }

  if (!prefixId) {
    return (
      <p className="text-xs text-[#9a5b45]">
        Sett <code>FOOD_CUSTOM_PREFIX_ID</code> i .env.local (f.eks. go4g).
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-[var(--color-muted-foreground)]">
        Egne produkter lagres med prefix <strong>{prefixId}</strong>.
        {visionEnabled ? " AI-lesing er aktiv." : " OCR brukes lokalt i nettleseren."}
      </p>

      {step === "barcode" ? (
        <div className="space-y-2">
          <Label htmlFor="barcode-photo">1. Strekkode (valgfritt)</Label>
          <Input
            id="barcode-photo"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => handleBarcodeFile(e.target.files?.[0] ?? null)}
          />
          <Label htmlFor="ean-scan">EAN</Label>
          <Input
            id="ean-scan"
            inputMode="numeric"
            value={ean}
            onChange={(e) => setEan(e.target.value)}
            placeholder="7039010019811"
          />
          {barcodeFile ? (
            <p className="text-xs text-[var(--color-muted-foreground)]">Bilde: {barcodeFile.name}</p>
          ) : null}
          <Button type="button" className="w-full" size="sm" onClick={() => setStep("nutrition")}>
            Neste: næringsinnhold
          </Button>
        </div>
      ) : null}

      {step === "nutrition" ? (
        <div className="space-y-2">
          <Label htmlFor="nutrition-photo">2. Næringsinnhold</Label>
          <Input
            id="nutrition-photo"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => setNutritionFile(e.target.files?.[0] ?? null)}
          />
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => setStep("barcode")}>
              Tilbake
            </Button>
            <Button
              type="button"
              size="sm"
              className="flex-1"
              disabled={extracting || !nutritionFile}
              onClick={handleExtract}
            >
              {extracting ? "Leser..." : "Les etikett"}
            </Button>
          </div>
        </div>
      ) : null}

      {step === "review" ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">3. Kontroller og lagre</p>
          <Label htmlFor="custom-name">Navn</Label>
          <Input id="custom-name" value={name} onChange={(e) => setName(e.target.value)} />
          <Label htmlFor="custom-brand">Merke</Label>
          <Input id="custom-brand" value={brand} onChange={(e) => setBrand(e.target.value)} />
          <div className="form-grid-2">
            <div>
              <Label htmlFor="custom-kcal">kcal / 100g</Label>
              <Input
                id="custom-kcal"
                type="number"
                inputMode="decimal"
                value={kcalPer100g}
                onChange={(e) => setKcalPer100g(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="custom-package">Pakke (g)</Label>
              <Input
                id="custom-package"
                type="number"
                inputMode="decimal"
                value={packageGrams}
                onChange={(e) => setPackageGrams(e.target.value)}
              />
            </div>
          </div>
          <Label htmlFor="custom-ean-review">EAN</Label>
          <Input id="custom-ean-review" value={ean} onChange={(e) => setEan(e.target.value)} />
          <FieldError message={error ?? undefined} />
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => setStep("nutrition")}>
              Tilbake
            </Button>
            <Button
              type="button"
              size="sm"
              className="flex-1"
              disabled={pending || !name || !kcalPer100g}
              onClick={handleSave}
            >
              {pending ? "Lagrer..." : "Lagre produkt"}
            </Button>
          </div>
        </div>
      ) : null}

      {step !== "review" ? <FieldError message={error ?? undefined} /> : null}

      <Button type="button" variant="ghost" size="sm" className="w-full" onClick={onCancel}>
        Avbryt
      </Button>
    </div>
  );
}
