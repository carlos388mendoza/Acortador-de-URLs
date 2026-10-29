import { useState } from "react";
import { Plus, Users } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, apiDelete } from "@/api/client";
import type { ApiUserResponse, Page, User } from "@/types";
import { errorMessage } from "@/lib/format";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { LoadingCards } from "@/components/shared/loading-cards";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UserCard } from "./user-card";
import { UserDialog } from "./user-dialog";
import { PageHeading } from "@/components/layout/page-heading";

export function UsersPage() {
  const client = useQueryClient();
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api<ApiUserResponse>("/api/auth/me"),
  });
  const [editing, setEditing] = useState<User | null | undefined>();
  const [deleting, setDeleting] = useState<User | null>(null);
  const users = useQuery({
    queryKey: ["users"],
    queryFn: () => api<Page<User>>("/api/admin/users?page=1&limit=100"),
    enabled: me.data?.user.role === "admin",
  });
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ["users"] });
    void client.invalidateQueries({ queryKey: ["stats", "summary"] });
  };

  const deleteUser = async () => {
    if (!deleting) return;
    try {
      await apiDelete(`/api/admin/users/${deleting.id}`);
      toast.success("Usuario eliminado");
      setDeleting(null);
      await refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  if (me.isPending) return <LoadingCards />;
  if (me.data?.user.role !== "admin") {
    return (
      <Card>
        <CardContent className="p-8 text-center text-destructive">
          No tienes permiso para administrar usuarios.
        </CardContent>
      </Card>
    );
  }

  const adminUsers =
    users.data?.data.filter((user) => user.role === "admin") ?? [];
  const regularUsers =
    users.data?.data.filter((user) => user.role === "user") ?? [];

  return (
    <div className="grid min-w-0 gap-6">
      <PageHeading
        label="Administración"
        title="Usuarios"
        subtitle="Personas con acceso al dashboard."
        action={
          <Button
            className="h-11 rounded-xl bg-[#1c1917] text-white hover:bg-stone-800"
            onClick={() => setEditing(null)}
          >
            <Plus /> Nuevo usuario
          </Button>
        }
      />
      {users.isPending ? (
        <LoadingCards />
      ) : users.error ? (
        <Card>
          <CardContent className="p-8 text-center text-destructive">
            {errorMessage(users.error)}
          </CardContent>
        </Card>
      ) : users.data.data.length === 0 ? (
        <Card>
          <CardContent className="grid justify-items-center gap-3 p-10">
            <Users className="size-10 text-brand" />
            <h2 className="font-heading text-xl font-bold">No hay usuarios</h2>
            <p className="text-sm text-muted-foreground">
              Crea una cuenta para dar acceso a tu equipo.
            </p>
            <Button onClick={() => setEditing(null)}>Crear usuario</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-8">
          <UserSection
            title="Administradores"
            red
            items={adminUsers}
            onEdit={setEditing}
            onDelete={setDeleting}
          />
          <UserSection
            title="Usuarios"
            items={regularUsers}
            onEdit={setEditing}
            onDelete={setDeleting}
          />
        </div>
      )}
      {editing !== undefined && (
        <UserDialog
          key={editing?.id ?? "new-user"}
          user={editing}
          onClose={() => setEditing(undefined)}
          onSaved={() => void refresh()}
        />
      )}
      {deleting && (
        <ConfirmDeleteDialog
          title={`¿Eliminar a ${deleting.name}?`}
          onClose={() => setDeleting(null)}
          onConfirm={deleteUser}
        />
      )}
    </div>
  );
}

function UserSection({
  title,
  red = false,
  items,
  onEdit,
  onDelete,
}: {
  title: string;
  red?: boolean;
  items: User[];
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
}) {
  return (
    <section className="grid gap-3">
      <h3 className="flex items-center gap-2 font-heading text-xl font-bold">
        <span
          className={`size-2.5 rounded-full ${red ? "bg-brand" : "bg-stone-900 dark:bg-stone-300"}`}
        />
        {title}
      </h3>
      {items.length ? (
        <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
          No hay cuentas en este grupo.
        </p>
      )}
    </section>
  );
}
