"use client";

import { useCallback, useState, type ReactNode } from "react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import {
  ENABLED_DESIGN_SYSTEMS,
  DesignSystemForce,
  DesignSystemScope,
  type DesignSystem,
} from "@/components/design-system/provider";
import { NativeInput } from "@/components/design-system/native-controls";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const SEMANTIC_TOKENS = [
  "--background",
  "--foreground",
  "--muted",
  "--muted-foreground",
  "--border",
  "--primary",
  "--accent",
  "--destructive",
  "--ring",
] as const;

const NATIVE_TOKENS: Record<DesignSystem, readonly string[]> = {
  mehdi: [
    "--mehdi-background",
    "--mehdi-accent",
    "--mehdi-primary",
    "--mehdi-destructive",
    "--mehdi-border",
    "--mehdi-muted",
  ],
  fun: [
    "--fun-background",
    "--fun-surface",
    "--fun-text",
    "--fun-yellow",
    "--fun-orange",
    "--fun-violet",
    "--fun-relief-ink",
  ],
  github: [
    "--bgColor-default",
    "--fgColor-default",
    "--bgColor-muted",
    "--borderColor-default",
    "--bgColor-accent-emphasis",
    "--fgColor-danger",
    "--focus-outlineColor",
  ],
  adobe: [
    "--spectrum-gray-50",
    "--spectrum-gray-800",
    "--spectrum-gray-300",
    "--spectrum-accent-background-color-default",
    "--spectrum-negative-background-color-default",
    "--spectrum-blue-800",
  ],
};

function TokenSwatch({ name, value }: { name: string; value?: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span
        className="size-5 shrink-0 rounded border border-border"
        style={{ background: `var(${name}, transparent)` }}
        aria-hidden
      />
      <code className="min-w-0 truncate font-mono text-[11px]">{name}</code>
      <span className="ml-auto max-w-[40%] shrink-0 truncate text-muted-foreground">
        {value || "—"}
      </span>
    </div>
  );
}

function ComponentBlock({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

function DesignSystemColumn({
  id,
  label,
}: (typeof ENABLED_DESIGN_SYSTEMS)[number]) {
  const t = useTranslations("designSystem");
  const { resolvedTheme } = useTheme();
  const [snapshot, setSnapshot] = useState<{
    theme: string | undefined;
    tokens: Record<string, string>;
  }>();
  const readTokens = useCallback(
    (node: HTMLElement | null) => {
      if (!node) return;
      const frame = requestAnimationFrame(() => {
        const style = getComputedStyle(node);
        setSnapshot({
          theme: resolvedTheme,
          tokens: Object.fromEntries(
            [...SEMANTIC_TOKENS, ...NATIVE_TOKENS[id]].map((name) => [
              name,
              style.getPropertyValue(name).trim(),
            ]),
          ),
        });
      });
      return () => cancelAnimationFrame(frame);
    },
    [id, resolvedTheme],
  );
  const tokens = snapshot?.theme === resolvedTheme ? snapshot?.tokens : undefined;
  const [checked, setChecked] = useState(true);

  return (
    <DesignSystemForce value={id}>
      <div
        className={
          id === "adobe"
            ? "spectrum-ds-root spectrum-ds-active contents"
            : "contents"
        }
      >
        <DesignSystemScope portalRoot scopeRadixPortals className="ds-compare-scope flex min-w-0 flex-col">
          <section
            ref={readTokens}
            data-compare-column={id}
            className="flex min-w-0 flex-col gap-6 rounded-xl border border-border bg-background p-5 text-foreground"
          >
            <header className="space-y-1 border-b border-border pb-4">
              <h2 className="text-lg font-semibold tracking-tight">{label}</h2>
              <p className="text-sm text-muted-foreground">{t(`descriptions.${id}`)}</p>
            </header>

            <ComponentBlock label="Button">
              <Button variant="default">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
            </ComponentBlock>

            <ComponentBlock label="Input">
              <Input
                placeholder="Rechercher…"
                aria-label={`Recherche ${label}`}
                className="max-w-xs"
              />
            </ComponentBlock>

            <ComponentBlock label="Switch">
              <Switch
                checked={checked}
                onCheckedChange={setChecked}
                aria-label="Notifications"
              />
              <span className="text-sm">Notifications</span>
            </ComponentBlock>

            <ComponentBlock label="Checkbox">
              <NativeInput
                type="checkbox"
                className="min-h-(--touch-target-size) min-w-(--touch-target-size)"
                defaultChecked
                aria-label="Accepter"
              />
              <span className="text-sm">Accepter</span>
            </ComponentBlock>

            <ComponentBlock label="Badge">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="destructive">Destructive</Badge>
            </ComponentBlock>

            <ComponentBlock label="Avatar">
              <Avatar size="sm">
                <AvatarImage src="/img/avatar/AD-droite.svg" alt="Avatar" />
                <AvatarFallback>MD</AvatarFallback>
              </Avatar>
            </ComponentBlock>

            <ComponentBlock label="Tabs">
              <Tabs defaultValue="overview">
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="pt-2 text-sm">
                  Panneau overview
                </TabsContent>
                <TabsContent value="settings" className="pt-2 text-sm">
                  Panneau settings
                </TabsContent>
              </Tabs>
            </ComponentBlock>

            <ComponentBlock label="Menu">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary">Actions</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>Éditer</DropdownMenuItem>
                  <DropdownMenuItem variant="destructive">
                    Supprimer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </ComponentBlock>

            <ComponentBlock label="Dialog">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="secondary">Ouvrir dialog</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirmation</DialogTitle>
                    <DialogDescription>
                      Exemple de dialogue · {label}.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="default">OK</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </ComponentBlock>

            <ComponentBlock label="Skeleton">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-24" />
            </ComponentBlock>

            <div className="space-y-4 border-t border-border pt-4">
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Tokens sémantiques
                </p>
                <div className="space-y-1.5">
                  {SEMANTIC_TOKENS.map((name) => (
                    <TokenSwatch key={name} name={name} value={tokens?.[name]} />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Tokens natifs · {label}
                </p>
                <div className="space-y-1.5">
                  {NATIVE_TOKENS[id].map((name) => (
                    <TokenSwatch key={name} name={name} value={tokens?.[name]} />
                  ))}
                </div>
              </div>
            </div>
          </section>
        </DesignSystemScope>
      </div>
    </DesignSystemForce>
  );
}

export default function DesignSystemsComparison() {
  const t = useTranslations("playground");

  return (
    <section
      aria-labelledby="comparison-title"
      className="@container mx-auto w-full max-w-5xl space-y-8 px-6 py-12"
    >
      <header className="space-y-2 text-center">
        <h1
          id="comparison-title"
          className="text-2xl font-semibold tracking-tight"
        >
          {t("compare")}
        </h1>
        <p className="mx-auto max-w-prose text-sm leading-relaxed text-muted-foreground">
          {t("comparisonIntro")}
        </p>
      </header>

      <div
        data-compare-grid=""
        className={`grid gap-6 @2xl:grid-cols-2 ${ENABLED_DESIGN_SYSTEMS.length === 3 ? "@4xl:grid-cols-3" : ""}`}
      >
        {ENABLED_DESIGN_SYSTEMS.map((system) => (
          <DesignSystemColumn key={system.id} {...system} />
        ))}
      </div>
    </section>
  );
}
