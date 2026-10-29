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

export function QrDialog({ url, onClose }: QrDialogProps) {
  const preview = useRef<HTMLDivElement>(null);
  const qrCode = useRef<QRCodeStyling | null>(null);
  const [color, setColor] = useState("#e30613");
  const [background, setBackground] = useState("#ffffff");
  const [size, setSize] = useState(280);
  const [logo, setLogo] = useState<string | undefined>("/dashboard/logo.png");

  // Genera una vista previa nueva cada vez que cambia color, logo o destino.
  useEffect(() => {
    const container = preview.current;
    let active = true;
    void import("qr-code-styling").then(({ default: QRCodeStyling }) => {
      if (!active) return;
      qrCode.current = new QRCodeStyling({
        width: size,
        height: size,
        type: "svg",
        data: url.short_url,
        image: logo,
        margin: 8,
        dotsOptions: { color, type: "rounded" },
        cornersSquareOptions: { color },
        backgroundOptions: { color: background },
        imageOptions: { crossOrigin: "anonymous", margin: 5, imageSize: 0.25 },
      });
      if (container) {
        container.replaceChildren();
        qrCode.current.append(container);
      }
    });

    return () => {
      active = false;
      container?.replaceChildren();
    };
  }, [url.short_url, color, background, logo, size]);

  const uploadLogo = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Elige un archivo de imagen");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setLogo(String(reader.result));
    reader.readAsDataURL(file);
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
              ref={preview}
              className="mx-auto grid w-full max-w-[340px] place-items-center overflow-hidden rounded-2xl border bg-white p-4 [&>svg]:max-w-full"
            />
            <p
              className="w-full truncate text-center text-sm text-muted-foreground"
              title={url.short_url}
            >
              {url.short_url}
            </p>
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
                    className={`size-8 rounded-full border ${color === value ? "ring-2 ring-brand ring-offset-2" : ""}`}
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
            <Label className="grid gap-2">
              Color de fondo
              <Input
                aria-label="Color de fondo"
                type="color"
                value={background}
                onChange={(event) => setBackground(event.target.value)}
                className="h-10 p-1"
              />
            </Label>
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
                      onChange={(event) => uploadLogo(event.target.files?.[0])}
                    />
                  </label>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLogo("/dashboard/logo.png")}
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
          >
            Descargar PNG
          </Button>
          <Button variant="outline" onClick={() => download("svg")}>
            Descargar SVG
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
