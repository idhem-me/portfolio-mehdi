"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export default function PlaygroundPage() {
  return (
    <main className="mx-auto w-full max-w-3xl space-y-12 px-6 py-12">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Playground</h1>
        <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
          Catalogue des composants Shadcn installés dans{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            src/components/ui
          </code>
          . Sert de banc d&apos;essai pour le design system.
        </p>
      </header>

      <Separator />

      <Section title="Button" description="Variantes et tailles">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="default">Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="xs">XS</Button>
            <Button size="sm">SM</Button>
            <Button size="default">Default</Button>
            <Button size="lg">LG</Button>
            <Button disabled>Disabled</Button>
          </div>
        </div>
      </Section>

      <Separator />

      <Section title="Badge" description="Variantes">
        <div className="flex flex-wrap gap-2">
          <Badge variant="default">Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Badge variant="ghost">Ghost</Badge>
          <Badge variant="link">Link</Badge>
        </div>
      </Section>

      <Separator />

      <Section title="Card" description="Tailles default et sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Card default</CardTitle>
              <CardDescription>
                Conteneur pour contenu structuré.
              </CardDescription>
            </CardHeader>
            <CardContent>
              Contenu principal de la carte.
            </CardContent>
            <CardFooter>
              <Button size="sm">Action</Button>
            </CardFooter>
          </Card>
          <Card size="sm">
            <CardHeader>
              <CardTitle>Card sm</CardTitle>
              <CardDescription>Version compacte.</CardDescription>
            </CardHeader>
            <CardContent>Moins d&apos;espace vertical.</CardContent>
          </Card>
        </div>
      </Section>

      <Separator />

      <Section title="Tabs" description="Variantes default et line">
        <div className="space-y-6">
          <Tabs defaultValue="a" className="gap-3">
            <TabsList>
              <TabsTrigger value="a">Onglet A</TabsTrigger>
              <TabsTrigger value="b">Onglet B</TabsTrigger>
              <TabsTrigger value="c">Onglet C</TabsTrigger>
            </TabsList>
            <TabsContent value="a">Contenu de l&apos;onglet A.</TabsContent>
            <TabsContent value="b">Contenu de l&apos;onglet B.</TabsContent>
            <TabsContent value="c">Contenu de l&apos;onglet C.</TabsContent>
          </Tabs>
          <Tabs defaultValue="x" className="gap-3">
            <TabsList variant="line">
              <TabsTrigger value="x">Line X</TabsTrigger>
              <TabsTrigger value="y">Line Y</TabsTrigger>
            </TabsList>
            <TabsContent value="x">Variante line — X.</TabsContent>
            <TabsContent value="y">Variante line — Y.</TabsContent>
          </Tabs>
        </div>
      </Section>

      <Separator />

      <Section title="Accordion">
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="item-1">
            <AccordionTrigger>Premier item</AccordionTrigger>
            <AccordionContent>
              Contenu déplié du premier item accordion.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger>Deuxième item</AccordionTrigger>
            <AccordionContent>
              Contenu déplié du deuxième item accordion.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Section>

      <Separator />

      <Section title="Avatar" description="Tailles sm, default, lg + fallback">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar size="sm">
            <AvatarFallback>SM</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback>MD</AvatarFallback>
          </Avatar>
          <Avatar size="lg">
            <AvatarFallback>LG</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarImage src="https://github.com/shadcn.png" alt="Exemple" />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
        </div>
      </Section>

      <Separator />

      <Section title="Separator" description="Horizontal et vertical">
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-sm text-muted-foreground">Horizontal</p>
            <Separator />
          </div>
          <div className="flex h-8 items-center gap-3">
            <span className="text-sm">Gauche</span>
            <Separator orientation="vertical" />
            <span className="text-sm">Droite</span>
          </div>
        </div>
      </Section>

      <Separator />

      <Section title="Tooltip">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline">Survolez-moi</Button>
          </TooltipTrigger>
          <TooltipContent>Contenu du tooltip</TooltipContent>
        </Tooltip>
      </Section>

      <Separator />

      <Section title="Sheet" description="Panneau latéral (mobile sidebar pattern)">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline">Ouvrir le Sheet</Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Titre du Sheet</SheetTitle>
              <SheetDescription>
                Exemple de panneau latéral Shadcn.
              </SheetDescription>
            </SheetHeader>
            <p className="px-4 text-sm text-muted-foreground">
              Contenu du sheet. Sur mobile, la navigation utilise ce pattern.
            </p>
          </SheetContent>
        </Sheet>
      </Section>

      <Separator />

      <Section title="Input">
        <div className="max-w-sm space-y-2">
          <Input placeholder="Placeholder…" />
          <Input disabled placeholder="Disabled" />
          <Input type="email" defaultValue="exemple@email.com" />
        </div>
      </Section>

      <Separator />

      <Section title="Skeleton" description="États de chargement">
        <div className="flex items-center gap-4">
          <Skeleton className="size-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
      </Section>

      <Separator />

      <Section
        title="Sidebar"
        description="Composant structurel utilisé uniquement sur le site CV (hors playground)."
      >
        <Card size="sm">
          <CardHeader>
            <CardTitle>SidebarProvider + AppSidebar</CardTitle>
            <CardDescription>
              Monté dans le layout du site (rétractable / Sheet mobile). Pas de
              démo isolée ici — le playground reste un environnement séparé.
            </CardDescription>
          </CardHeader>
        </Card>
      </Section>
    </main>
  );
}
