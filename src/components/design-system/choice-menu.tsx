"use client";

import { useId, type ReactNode } from "react";
import { ActionList, ActionMenu } from "@primer/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { DesignSystemSidebarButton } from "./sidebar-button";
import { useDesignSystem, useDesignSystemAttributes } from "./provider";

type Choice = { value: string; label: string; icon?: ReactNode };
export function DesignSystemChoiceMenu({
  label,
  value,
  icon,
  choices,
  onChange,
  analyticsAction,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  choices: Choice[];
  onChange: (value: string) => void;
  analyticsAction: string;
}) {
  const { designSystem } = useDesignSystem();
  const attributes = useDesignSystemAttributes();
  const { state, isMobile } = useSidebar();
  const id = useId();
  const current = choices.find((choice) => choice.value === value)!;
  const trigger = (
    <DesignSystemSidebarButton
      id={id}
      tooltip={label}
      aria-label={label}
      data-analytics-action={`${analyticsAction}_open`}
    >
      {icon}
      <span>{current.label}</span>
    </DesignSystemSidebarButton>
  );
  function select(next: string) {
    onChange(next);
    // Switching libraries replaces the menu trigger; return focus to its stable id.
    requestAnimationFrame(() => document.getElementById(id)?.focus());
  }
  return (
    <SidebarMenuItem>
      {designSystem === "github" ? (
        <ActionMenu>
          <ActionMenu.Anchor id={id}>{trigger}</ActionMenu.Anchor>
          <ActionMenu.Overlay
            {...attributes}
            className="ds-scope ds-choice-overlay"
            side={
              state === "collapsed" && !isMobile
                ? "outside-right"
                : "outside-top"
            }
            align="start"
          >
            <ActionList selectionVariant="single" aria-label={label}>
              {choices.map((choice) => (
                <ActionList.Item
                  key={choice.value}
                  selected={choice.value === value}
                  onSelect={() => select(choice.value)}
                  data-analytics-action={`${analyticsAction}_select`}
                  data-analytics-value={choice.value}
                >
                  {choice.icon && (
                    <ActionList.LeadingVisual>
                      {choice.icon}
                    </ActionList.LeadingVisual>
                  )}
                  {choice.label}
                </ActionList.Item>
              ))}
            </ActionList>
          </ActionMenu.Overlay>
        </ActionMenu>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
          <DropdownMenuContent
            side={state === "collapsed" && !isMobile ? "right" : "top"}
            align="start"
            sideOffset={8}
            className="min-w-44 w-auto"
          >
            <DropdownMenuRadioGroup value={value} onValueChange={select}>
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
      )}
    </SidebarMenuItem>
  );
}
