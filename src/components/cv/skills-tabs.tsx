"use client";

import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { skills } from "@/data/resume";

const skillTabs = [
  { key: "ux", ...skills.ux },
  { key: "ui", ...skills.ui },
  { key: "project", ...skills.project },
  { key: "soft", ...skills.soft },
  { key: "tools", ...skills.tools },
] as const;

export function SkillsTabs() {
  return (
    <Tabs defaultValue="ux" className="w-full gap-4">
      <TabsList className="h-auto w-full flex-wrap justify-start">
        {skillTabs.map((tab) => (
          <TabsTrigger key={tab.key} value={tab.key} className="flex-none">
            {tab.key === "project"
              ? "Gestion"
              : tab.key === "soft"
                ? "Soft Skills"
                : tab.key === "tools"
                  ? "Outils"
                  : tab.key === "ux"
                    ? "UX"
                    : "UI"}
          </TabsTrigger>
        ))}
      </TabsList>
      {skillTabs.map((tab) => (
        <TabsContent key={tab.key} value={tab.key} className="pt-1">
          <div className="flex flex-wrap gap-2">
            {tab.items.map((item) => (
              <Badge key={item} variant="secondary">
                {item}
              </Badge>
            ))}
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}
