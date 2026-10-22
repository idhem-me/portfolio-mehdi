"use client";

import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { skills, type SkillItem } from "@/data/resume";

const skillTabs = [
  { key: "tools", ...skills.tools },
  { key: "ux", ...skills.ux },
  { key: "ui", ...skills.ui },
  { key: "project", ...skills.project },
  { key: "soft", ...skills.soft },
] as const;

const tabLabels: Record<(typeof skillTabs)[number]["key"], string> = {
  tools: "Outils",
  ux: "UX",
  ui: "UI",
  project: "Gestion",
  soft: "Soft Skills",
};

function skillLabel(item: SkillItem): string {
  return typeof item === "string" ? item : item.name;
}

function SkillBadge({ item }: { item: SkillItem }) {
  if (typeof item === "string") {
    return <Badge variant="secondary">{item}</Badge>;
  }

  return (
    <Badge variant="secondary" className="gap-1.5">
      <span
        className="size-3.5 shrink-0 bg-current"
        style={{
          maskImage: `url(${item.logo})`,
          WebkitMaskImage: `url(${item.logo})`,
          maskSize: "contain",
          WebkitMaskSize: "contain",
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
          maskPosition: "center",
          WebkitMaskPosition: "center",
        }}
        aria-hidden
      />
      {item.name}
    </Badge>
  );
}

export function SkillsTabs() {
  return (
    <Tabs defaultValue="tools" className="w-full gap-4">
      <TabsList className="h-auto w-full flex-wrap justify-start">
        {skillTabs.map((tab) => (
          <TabsTrigger key={tab.key} value={tab.key} className="flex-none">
            {tabLabels[tab.key]}
          </TabsTrigger>
        ))}
      </TabsList>
      {skillTabs.map((tab) => (
        <TabsContent key={tab.key} value={tab.key} className="pt-1">
          <div className="flex flex-wrap gap-2">
            {tab.items.map((item) => (
              <SkillBadge key={skillLabel(item)} item={item} />
            ))}
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}
