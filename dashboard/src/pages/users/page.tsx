import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
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

  const refresh = () => client.invalidateQueries({ queryKey: ["users"] });
  const deleteUser = async () => {
    if (!deleting) return;
    try {
      await apiDelete(`/api/admin/users/${deleting.id}`);
      toast.success("Persona borrada");
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
          No tienes permiso para administrar personas.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid min-w-0 gap-5">
      <div className="flex justify-end">
        <Button onClick={() => setEditing(null)}>
          <Plus className="mr-2 size-4" /> Nueva persona
        </Button>
      </div>
      {users.isPending ? (
        <LoadingCards />
      ) : users.error ? (
        <Card>
          <CardContent className="p-8 text-center text-destructive">
            {errorMessage(users.error)}
          </CardContent>
        </Card>
      ) : (
        <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {users.data.data.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              onEdit={setEditing}
              onDelete={setDeleting}
            />
          ))}
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
          title={`¿Borrar a ${deleting.name}?`}
          onClose={() => setDeleting(null)}
          onConfirm={deleteUser}
        />
      )}
    </div>
  );
}
