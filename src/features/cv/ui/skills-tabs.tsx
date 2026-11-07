"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SkillItem, SkillsData } from "@/lib/content";

const tabKeys = ["tools", "ux", "ui", "project", "soft"] as const;

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

export function SkillsTabs({ skills }: { skills: SkillsData }) {
  const t = useTranslations("skills");

  const skillTabs = tabKeys.map((key) => ({
    key,
    label: t(key),
    items: skills[key].items,
  }));

  return (
    <Tabs defaultValue="tools" className="w-full gap-4">
      <TabsList className="h-auto w-full flex-wrap justify-start">
        {skillTabs.map((tab) => (
          <TabsTrigger key={tab.key} value={tab.key} className="flex-none">
            {tab.label}
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
