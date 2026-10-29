import { useMemo, useState } from "react";
import { Plus, Search, Users } from "lucide-react";
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
import { Input } from "@/components/ui/input";

export function UsersPage() {
  const client = useQueryClient();
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api<ApiUserResponse>("/api/auth/me"),
  });
  const [editing, setEditing] = useState<User | null | undefined>();
  const [deleting, setDeleting] = useState<User | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "admin" | "user">("all");
  const users = useQuery({
    queryKey: ["users"],
    queryFn: () => api<Page<User>>("/api/admin/users?page=1&limit=100"),
    enabled: me.data?.user.role === "admin",
  });
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ["users"] });
    void client.invalidateQueries({ queryKey: ["stats", "summary"] });
  };

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return (users.data?.data ?? []).filter((user) => {
      const matchesText =
        !term ||
        user.name.toLocaleLowerCase().includes(term) ||
        user.email.toLocaleLowerCase().includes(term);
      const matchesRole = filter === "all" || user.role === filter;
      return matchesText && matchesRole;
    });
  }, [users.data?.data, search, filter]);

  const deleteUser = async () => {
    if (!deleting) return;
    try {
      await apiDelete(`/api/admin/users/${deleting.id}`);
      toast.success("Usuario eliminado");
      setDeleting(null);
      await refresh();
    } catch (error) {
      toast.error(errorMessage(error));
      throw error;
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
  const visibleAdmins = filteredUsers.filter((user) => user.role === "admin");
  const visibleUsers = filteredUsers.filter((user) => user.role === "user");

  return (
    <div className="grid min-w-0 gap-6">
      <PageHeading
        label="Administración"
        title="Usuarios"
        subtitle="Personas con acceso al dashboard."
      />
      <Card className="rounded-2xl">
        <CardContent className="grid gap-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-heading text-xl font-bold">Cuentas</h2>
              <p className="text-sm text-muted-foreground">
                Gestiona roles, acceso y contraseñas.
              </p>
            </div>
            <Button
              className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => setEditing(null)}
            >
              <Plus /> Nuevo usuario
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-[minmax(200px,1fr)_auto] sm:items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Buscar usuarios"
                placeholder="Buscar por nombre o correo..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-10 rounded-xl pl-9"
              />
            </div>
            <div
              className="flex flex-wrap gap-1 rounded-xl bg-muted p-1"
              role="tablist"
              aria-label="Filtrar usuarios"
            >
              {(
                [
                  ["all", "Todos", users.data?.total ?? 0],
                  ["admin", "Administradores", adminUsers.length],
                  ["user", "Usuarios", regularUsers.length],
                ] as const
              ).map(([value, label, count]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={filter === value}
                  onClick={() => setFilter(value)}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold ${filter === value ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {label} <span className="ml-1 opacity-70">{count}</span>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
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
            items={visibleAdmins}
            currentId={me.data.user.id}
            onEdit={setEditing}
            onDelete={setDeleting}
          />
          <UserSection
            title="Usuarios"
            items={visibleUsers}
            currentId={me.data.user.id}
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
          description={deleting.email}
          actionLabel="Eliminar usuario"
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
  currentId,
  onEdit,
  onDelete,
}: {
  title: string;
  red?: boolean;
  items: User[];
  currentId: number;
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
              isCurrent={user.id === currentId}
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
