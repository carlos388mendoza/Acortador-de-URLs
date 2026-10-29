import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { ApiUserResponse } from "@/types";
import { errorMessage } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileForm } from "./profile-form";

export function ProfilePage() {
  const profile = useQuery({
    queryKey: ["me"],
    queryFn: () => api<ApiUserResponse>("/api/auth/me"),
  });

  if (profile.isPending) {
    return (
      <Card className="max-w-2xl">
        <CardContent className="grid gap-4 p-6">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (profile.error || !profile.data) {
    return (
      <Card>
        <CardContent className="p-6 text-destructive">
          {errorMessage(profile.error)}
        </CardContent>
      </Card>
    );
  }

  return <ProfileForm key={profile.data.user.id} user={profile.data.user} />;
}
