import {
  Children,
  isValidElement,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import { Copy, Download, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { mocksEnabled } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function textFromCode(children: ReactNode) {
  return Children.toArray(children)
    .map((child) =>
      isValidElement<{ children?: ReactNode }>(child)
        ? String(child.props.children ?? "")
        : String(child),
    )
    .join("");
}

export function SkillPage() {
  const mockContent =
    "# SKILL para agentes\n\nUsa esta guía para integrar la API.\n\n```bash\ncurl -H 'Authorization: Bearer sk_TU_API_KEY' https://acortador-de-urls-iota.vercel.app/api/urls/new\n```";
  const [content, setContent] = useState(mocksEnabled ? mockContent : "");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    if (mocksEnabled) {
      return () => {
        active = false;
      };
    }
    void fetch("/api/skill", { credentials: "include" })
      .then(async (response) => {
        if (!response.ok)
          throw new Error("No se pudo cargar el documento SKILL.");
        return response.text();
      })
      .then((markdown) => active && setContent(markdown))
      .catch((reason: unknown) => {
        if (active)
          setError(
            reason instanceof Error ? reason.message : "Error de conexión.",
          );
      });
    return () => {
      active = false;
    };
  }, []);

  const copyText = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Copiado");
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  const download = () => {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = "SKILL.md";
    anchor.click();
    URL.revokeObjectURL(href);
  };

  const components: Components = {
    h1: ({ children }: { children?: React.ReactNode }) => (
      <h1 className="mb-4 mt-8 font-heading text-3xl font-bold first:mt-0">
        {children}
      </h1>
    ),
    h2: ({ children }: { children?: React.ReactNode }) => (
      <h2 className="mb-3 mt-7 font-heading text-2xl font-bold">{children}</h2>
    ),
    h3: ({ children }: { children?: React.ReactNode }) => (
      <h3 className="mb-2 mt-5 font-heading text-xl font-bold">{children}</h3>
    ),
    p: ({ children }: { children?: React.ReactNode }) => (
      <p className="my-3 leading-7 text-muted-foreground">{children}</p>
    ),
    ul: ({ children }: { children?: React.ReactNode }) => (
      <ul className="my-3 list-disc space-y-1 pl-6 text-muted-foreground">
        {children}
      </ul>
    ),
    ol: ({ children }: { children?: React.ReactNode }) => (
      <ol className="my-3 list-decimal space-y-1 pl-6 text-muted-foreground">
        {children}
      </ol>
    ),
    li: ({ children }: { children?: React.ReactNode }) => <li className="pl-1">{children}</li>,
    a: ({ children, href }: { children?: React.ReactNode; href?: string }) => (
      <a href={href} className="text-brand underline underline-offset-4">
        {children}
      </a>
    ),
    code: ({ children }: { children?: React.ReactNode }) => (
      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.9em]">
        {children}
      </code>
    ),
    pre: ({ children }: { children?: React.ReactNode }) => {
      const code = textFromCode(children);
      return (
        <div className="relative my-4 overflow-hidden rounded-xl bg-stone-950 text-stone-100">
          <Button
            size="sm"
            variant="ghost"
            className="absolute right-2 top-2 text-stone-200 hover:bg-white/10 hover:text-white"
            onClick={() => void copyText(code)}
          >
            <Copy />
            Copiar
          </Button>
          <pre className="overflow-x-auto p-4 pr-24 text-xs leading-6">
            {children}
          </pre>
        </div>
      );
    },
  };

  return (
    <div className="grid min-w-0 gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand">
            Desarrolladores
          </p>
          <h1 className="font-heading text-3xl font-bold sm:text-4xl">
            SKILL para agentes
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Instrucciones para que un agente de IA, como Claude Code o Codex,
            integre esta API en otro proyecto.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => void copyText(content)}
            disabled={!content}
          >
            <Copy />
            Copiar
          </Button>
          <Button
            className="bg-[#1c1917] text-white hover:bg-stone-800"
            onClick={download}
            disabled={!content}
          >
            <Download />
            Descargar SKILL.md
          </Button>
        </div>
      </div>
      {error ? (
        <Card>
          <CardContent className="p-6 text-destructive">{error}</CardContent>
        </Card>
      ) : content ? (
        <Card>
          <CardContent className="p-5 sm:p-8">
            <ReactMarkdown components={components}>{content}</ReactMarkdown>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex items-center gap-3 p-8 text-muted-foreground">
            <Sparkles className="size-5 animate-pulse" />
            Cargando instrucciones…
          </CardContent>
        </Card>
      )}
    </div>
  );
}
