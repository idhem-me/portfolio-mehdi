"use client";

import type { ReactNode } from "react";
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
}: {
  label: string;
  title?: string;
  value: string;
  icon: ReactNode;
  choices: Choice[];
  onChange: (value: string) => void;
  analyticsAction: string;
}) {
  const { state, isMobile } = useSidebar();
  const current = choices.find((choice) => choice.value === value);
  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger asChild data-slot="sidebar-menu-button">
          <SidebarMenuButton
            tooltip={label}
            aria-label={label}
            data-analytics-action={`${analyticsAction}_open`}
          >
            {icon}
            <span>{current?.label ?? label}</span>
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side={state === "collapsed" && !isMobile ? "right" : "top"}
          align="start"
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
    </SidebarMenuItem>
  );
}
