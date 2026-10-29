import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Kbd } from "@/components/ui/kbd";

type KeyboardShortcutsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isMac: boolean;
};

export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
  isMac,
}: KeyboardShortcutsDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Atajos de teclado</AlertDialogTitle>
          <AlertDialogDescription>
            Usa estos atajos para navegar más rápido.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid gap-2 text-sm">
          <p>
            <Kbd>/</Kbd> Enfocar búsqueda
          </p>
          <p>
            <Kbd>N</Kbd> Crear URL
          </p>
          <p>
            <Kbd>G</Kbd> y <Kbd>H</Kbd> Inicio · <Kbd>L</Kbd> URLs ·{" "}
            <Kbd>K</Kbd> API keys · <Kbd>U</Kbd> Usuarios
          </p>
          <p>
            <Kbd>?</Kbd> Mostrar ayuda · <Kbd>Esc</Kbd> Cerrar
          </p>
          <p>
            <Kbd>{isMac ? "⌘" : "Ctrl"} K</Kbd> Paleta de comandos
          </p>
        </div>
        <AlertDialogFooter>
          <AlertDialogAction onClick={() => onOpenChange(false)}>
            Listo
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
