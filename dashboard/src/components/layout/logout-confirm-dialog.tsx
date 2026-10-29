import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";

type LogoutConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
};

export function LogoutConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
}: LogoutConfirmDialogProps) {
  if (!open) return null;
  return (
    <ConfirmDeleteDialog
      title="¿Cerrar sesión?"
      description="Vas a salir de tu cuenta."
      actionLabel="Cerrar sesión"
      icon="logout"
      onConfirm={onConfirm}
      onClose={() => onOpenChange(false)}
    />
  );
}
