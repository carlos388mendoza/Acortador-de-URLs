import { useEffect, useRef, useState } from "react";
import QRCodeStyling from "qr-code-styling";
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
  const [logo, setLogo] = useState<string | undefined>("/dashboard/logo.png");

  // Genera una vista previa nueva cada vez que cambia color, logo o destino.
  useEffect(() => {
    const container = preview.current;
    qrCode.current = new QRCodeStyling({
      width: 280,
      height: 280,
      type: "svg",
      data: url.short_url,
      image: logo,
      margin: 8,
      dotsOptions: { color, type: "rounded" },
      cornersSquareOptions: { color },
      backgroundOptions: { color: "#ffffff" },
      imageOptions: { crossOrigin: "anonymous", margin: 5, imageSize: 0.25 },
    });

    if (container) {
      container.replaceChildren();
      qrCode.current.append(container);
    }

    return () => container?.replaceChildren();
  }, [url.short_url, color, logo]);

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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Código QR</DialogTitle>
          <DialogDescription>
            Personaliza el código de {url.code} y descárgalo.
          </DialogDescription>
        </DialogHeader>
        <div className="grid justify-items-center gap-4">
          <div
            ref={preview}
            className="max-w-full overflow-hidden rounded-lg border bg-white p-2"
          />
          <p
            className="w-full truncate text-center text-sm text-muted-foreground"
            title={url.short_url}
          >
            {url.short_url}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Label className="grid gap-2">
            Color del QR
            <Input
              aria-label="Color del QR"
              type="color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              className="h-10 p-1"
            />
          </Label>
          <Label className="grid gap-2">
            Logo central
            <input
              className="block w-full text-sm"
              type="file"
              accept="image/*"
              onChange={(event) => uploadLogo(event.target.files?.[0])}
            />
          </Label>
        </div>
        <div className="flex flex-wrap justify-between gap-2">
          <Button variant="outline" onClick={() => setLogo(undefined)}>
            Quitar logo
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => download("svg")}>
              Descargar SVG
            </Button>
            <Button onClick={() => download("png")}>Descargar PNG</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
