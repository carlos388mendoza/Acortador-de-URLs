import { useState } from "react";
import { Ban, LogOut, Trash2, type LucideIcon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type ConfirmDeleteDialogProps = {
  title: string;
  description: string;
  actionLabel: string;
  icon?: "delete" | "deactivate" | "logout";
  onConfirm: () => Promise<void>;
  onClose: () => void;
};

const icons: Record<
  NonNullable<ConfirmDeleteDialogProps["icon"]>,
  LucideIcon
> = {
  delete: Trash2,
  deactivate: Ban,
  logout: LogOut,
};

export function ConfirmDeleteDialog({
  title,
  description,
  actionLabel,
  icon = "delete",
  onConfirm,
  onClose,
}: ConfirmDeleteDialogProps) {
  const [loading, setLoading] = useState(false);
  const Icon = icons[icon];

  const confirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch {
      // El formulario que llamó al diálogo muestra el error.
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open onOpenChange={(open) => !open && !loading && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="size-12 rounded-full bg-accent text-brand">
            <Icon className="size-5" />
          </AlertDialogMedia>
          <AlertDialogTitle className="text-xl font-bold">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm leading-relaxed">
            {description} Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              disabled={loading}
            >
              Cancelar
            </Button>
          </AlertDialogCancel>
          <Button
            className="w-full bg-[#e30613] text-white hover:bg-[#c80510] sm:w-auto"
            onClick={() => void confirm()}
            disabled={loading}
          >
            {loading ? "Procesando…" : actionLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
