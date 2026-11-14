"use client";

import type { ReactNode } from "react";
import { useLocale } from "next-intl";
import { isRtlLocale } from "@/i18n/routing";
import { Button } from "./mehdi-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

type Choice = { value: string; label: string; icon?: ReactNode };

export function DesignSystemChoiceMenu({
  label,
  title,
  value,
  icon,
  choices,
  onChange,
  analyticsAction,
  iconOnly = false,
}: {
  label: string;
  title?: string;
  value: string;
  icon: ReactNode;
  choices: Choice[];
  onChange: (value: string) => void;
  analyticsAction: string;
  iconOnly?: boolean;
}) {
  const { state, isMobile } = useSidebar();
  const locale = useLocale();
  const current = choices.find((choice) => choice.value === value);
  const sidebarSide = state === "collapsed" && !isMobile ? "right" : "top";
  const trigger = {
    "aria-label": label,
    "data-analytics-action": `${analyticsAction}_open`,
  };
  const menu = (
    <DropdownMenu dir={iconOnly ? (isRtlLocale(locale) ? "rtl" : "ltr") : undefined}>
      {iconOnly ? (
        <DropdownMenuTrigger asChild data-slot="button">
          <Button type="button" variant="ghost" size="icon" {...trigger}>
            {icon}
          </Button>
        </DropdownMenuTrigger>
      ) : (
        <DropdownMenuTrigger asChild data-slot="sidebar-menu-button">
          <SidebarMenuButton tooltip={label} {...trigger}>
            {icon}
            <span>{current?.label ?? label}</span>
          </SidebarMenuButton>
        </DropdownMenuTrigger>
      )}
      <DropdownMenuContent
        side={iconOnly ? "bottom" : sidebarSide}
        align={iconOnly ? "end" : "start"}
        sideOffset={8}
        className="min-w-44 w-auto"
      >
        {title && <DropdownMenuLabel>{title}</DropdownMenuLabel>}
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          {choices.map((choice) => (
            <DropdownMenuRadioItem
              key={choice.value}
              value={choice.value}
              data-analytics-action={`${analyticsAction}_select`}
              data-analytics-value={choice.value}
            >
              {choice.icon}
              {choice.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return iconOnly ? menu : <SidebarMenuItem>{menu}</SidebarMenuItem>;
}
