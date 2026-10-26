"use client";

import { Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ProfileHelpButton() {
  const t = useTranslations("playerProfile");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 rounded-full text-muted-foreground hover:text-foreground"
          aria-label={t("helpLabel")}
        >
          <Info className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="z-[95] w-80 max-w-[min(20rem,calc(100vw-2rem))] space-y-1.5 p-3"
      >
        <p className="text-sm font-medium">{t("helpTitle")}</p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t("helpBody")}
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
