import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function NotFoundPage() {
  return (
    <Card className="mx-auto max-w-lg text-center">
      <CardContent className="grid justify-items-center gap-3 p-10">
        <div className="text-5xl font-bold">404</div>
        <p className="text-muted-foreground">No encontramos esa página.</p>
        <Button asChild>
          <Link to="/">Volver al inicio</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
