import { useEffect, useRef, useState } from "react";
import type QRCodeStyling from "qr-code-styling";
import { ImagePlus, QrCode } from "lucide-react";
import { toast } from "sonner";
import type { AdminUrl } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type QrDialogProps = {
  url: AdminUrl;
  onClose: () => void;
};

const PROJECT_LOGO = "/dashboard/logo.png";
const LOGO_MAX_SIZE = 256;
const LOAD_TIMEOUT_MS = 5000;

/** qr-code-styling nunca termina de dibujar si el logo no carga, así que toda espera tiene un límite. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(
      () => reject(new Error("Tiempo de espera agotado")),
      ms,
    );
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (reason: unknown) => {
        window.clearTimeout(timer);
        reject(reason);
      },
    );
  });
}

/** Carga una imagen y la convierte en un PNG pequeño. Falla si el navegador no puede leerla. */
function prepareLogo(src: string): Promise<string> {
  const loading = new Promise<string>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      try {
        // Un SVG sin tamaño declarado reporta 0 × 0
        const width = image.naturalWidth || LOGO_MAX_SIZE;
        const height = image.naturalHeight || LOGO_MAX_SIZE;
        const scale = Math.min(1, LOGO_MAX_SIZE / Math.max(width, height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas no disponible");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/png"));
      } catch (reason) {
        reject(reason instanceof Error ? reason : new Error(String(reason)));
      }
    };
    image.onerror = () => reject(new Error("Imagen no válida"));
    image.src = src;
  });
  return withTimeout(loading, LOAD_TIMEOUT_MS);
}

export function QrDialog({ url, onClose }: QrDialogProps) {
  // El contenedor llega por callback ref: el diálogo se monta en un portal y puede no existir en el primer render
  const [preview, setPreview] = useState<HTMLDivElement | null>(null);
  const qrCode = useRef<QRCodeStyling | null>(null);
  const [color, setColor] = useState("#e30613");
  const [background, setBackground] = useState("#ffffff");
  const [size, setSize] = useState(280);
  const [logo, setLogo] = useState<string | undefined>(PROJECT_LOGO);
  // Resultado del último dibujo; si sus opciones no son las actuales, la vista previa se está generando
  const [drawn, setDrawn] = useState<{
    key: string;
    ok: boolean;
    logoFailed: boolean;
  } | null>(null);
  const optionsKey = JSON.stringify([
    url.short_url,
    color,
    background,
    logo,
    size,
  ]);
  // Se puede descargar en cuanto exista un QR dibujado, aunque se esté generando uno nuevo
  const [canDownload, setCanDownload] = useState(false);
  const status =
    drawn?.key !== optionsKey ? "loading" : drawn.ok ? "ready" : "error";

  // Genera una vista previa nueva cada vez que cambia color, logo, tamaño o destino.
  useEffect(() => {
    if (!preview) return;
    let active = true;
    void (async () => {
      try {
        const { default: QRCodeStyling } = await import("qr-code-styling");
        const draw = async (image: string | undefined) => {
          const qr = new QRCodeStyling({
            width: size,
            height: size,
            type: "svg",
            data: url.short_url,
            image,
            margin: 8,
            dotsOptions: { color, type: "rounded" },
            cornersSquareOptions: { color },
            backgroundOptions: { color: background },
            // saveAsBlob: false. El logo ya llega como data: URL y se incrusta tal cual. Con true,
            // la librería lo vuelve a pedir con XMLHttpRequest, la CSP (connect-src) lo bloquea
            // y el dibujo se queda esperando para siempre.
            imageOptions: { margin: 5, imageSize: 0.25, saveAsBlob: false },
          });
          // Espera a que el SVG esté dibujado; la vista previa anterior se queda hasta entonces
          await withTimeout(qr.getRawData("svg"), LOAD_TIMEOUT_MS);
          return qr;
        };

        // Si el logo no se puede leer o dibujar, el QR se muestra igual, sin logo
        const image = logo
          ? await prepareLogo(logo).catch(() => undefined)
          : undefined;
        let logoFailed = Boolean(logo) && !image;
        let qr: QRCodeStyling;
        try {
          qr = await draw(image);
        } catch (reason) {
          if (!image) throw reason;
          logoFailed = true;
          qr = await draw(undefined);
        }
        if (!active) return;
        qrCode.current = qr;
        preview.replaceChildren();
        qr.append(preview);
        setDrawn({ key: optionsKey, ok: true, logoFailed });
        setCanDownload(true);
      } catch {
        if (active) setDrawn({ key: optionsKey, ok: false, logoFailed: false });
      }
    })();

    return () => {
      active = false;
    };
  }, [preview, optionsKey, url.short_url, color, background, logo, size]);

  const uploadLogo = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Elige un archivo de imagen");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    try {
      setLogo(await prepareLogo(objectUrl));
    } catch {
      toast.error(
        "No se pudo usar esa imagen. Prueba con un PNG, JPG, WebP o SVG.",
      );
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  };

  const download = (extension: "png" | "svg") => {
    void qrCode.current?.download({ name: `qr-${url.code}`, extension });
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader className="pr-8">
          <div className="flex items-start gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-accent text-brand">
              <QrCode className="size-5" />
            </span>
            <div>
              <DialogTitle className="text-xl font-bold">
                Personalizar código QR
              </DialogTitle>
              <DialogDescription className="mt-1">
                Cambia los colores, el logo y el tamaño.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="grid gap-5 md:grid-cols-[minmax(240px,1fr)_minmax(240px,1fr)]">
          <div className="grid justify-items-center gap-3">
            <div
              ref={setPreview}
              role="img"
              aria-label="Vista previa del código QR"
              aria-busy={status === "loading"}
              className="mx-auto grid w-full max-w-[340px] place-items-center overflow-hidden rounded-2xl border bg-white p-4 [&>svg]:max-w-full"
            />
            <p
              className="w-full truncate text-center text-sm text-muted-foreground"
              title={url.short_url}
            >
              {url.short_url}
            </p>
            {status === "ready" && drawn?.logoFailed && (
              <p
                role="status"
                className="text-center text-sm text-muted-foreground"
              >
                No se pudo cargar el logo; se muestra el QR sin logo.
              </p>
            )}
            {status === "error" && (
              <p role="alert" className="text-center text-sm text-destructive">
                No se pudo generar la vista previa. Cambia una opción para
                intentarlo de nuevo.
              </p>
            )}
          </div>
          <div className="grid content-start gap-4">
            <div className="grid gap-2">
              <Label>Color del QR</Label>
              <div className="flex flex-wrap items-center gap-2">
                {[
                  ["#1c1917", "Negro"],
                  ["#e30613", "Rojo"],
                  ["#44403c", "Gris oscuro"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-label={label}
                    title={label}
                    onClick={() => setColor(value)}
                    aria-pressed={color === value}
                    className={`size-8 rounded-full border border-border ${color === value ? "ring-2 ring-brand ring-offset-2 ring-offset-background" : ""}`}
                    style={{ backgroundColor: value }}
                  />
                ))}
                <Input
                  aria-label="Color personalizado del QR"
                  type="color"
                  value={color}
                  onChange={(event) => setColor(event.target.value)}
                  className="size-9 cursor-pointer p-1"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Color de fondo</Label>
              <div className="flex flex-wrap items-center gap-2">
                {[
                  ["#ffffff", "Blanco"],
                  ["#f5efe6", "Beige"],
                  ["#e7e5e4", "Gris claro"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-label={`Fondo ${label.toLowerCase()}`}
                    aria-pressed={background === value}
                    title={label}
                    onClick={() => setBackground(value)}
                    className={`size-8 rounded-full border border-border ${background === value ? "ring-2 ring-brand ring-offset-2 ring-offset-background" : ""}`}
                    style={{ backgroundColor: value }}
                  />
                ))}
                <Input
                  aria-label="Color de fondo personalizado"
                  type="color"
                  value={background}
                  onChange={(event) => setBackground(event.target.value)}
                  className="size-9 cursor-pointer p-1"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Logo</Label>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" asChild>
                  <label className="cursor-pointer">
                    <ImagePlus />
                    Subir imagen
                    <input
                      className="sr-only"
                      type="file"
                      accept="image/*"
                      onChange={(event) => {
                        void uploadLogo(event.target.files?.[0]);
                        // Permite volver a elegir el mismo archivo
                        event.target.value = "";
                      }}
                    />
                  </label>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLogo(PROJECT_LOGO)}
                >
                  Logo del proyecto
                </Button>
                {logo && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setLogo(undefined)}
                  >
                    Quitar logo
                  </Button>
                )}
              </div>
            </div>
            <Label className="grid gap-2">
              Tamaño
              <Input
                aria-label="Tamaño del QR"
                type="range"
                min="180"
                max="360"
                step="20"
                value={size}
                onChange={(event) => setSize(Number(event.target.value))}
                className="h-auto cursor-pointer border-0 bg-transparent p-0 accent-brand shadow-none dark:bg-transparent"
              />
              <span className="text-xs text-muted-foreground">
                {size} × {size} px
              </span>
            </Label>
          </div>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => download("png")}
            disabled={!canDownload}
          >
            Descargar PNG
          </Button>
          <Button
            variant="outline"
            onClick={() => download("svg")}
            disabled={!canDownload}
          >
            Descargar SVG
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
