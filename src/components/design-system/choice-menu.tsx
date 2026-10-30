"use client";

import { useId, type ReactNode } from "react";
import { ActionList, ActionMenu } from "@primer/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
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
              <ActionList.Group>
                {title && (
                  <ActionList.GroupHeading>{title}</ActionList.GroupHeading>
                )}
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
              </ActionList.Group>
            </ActionList>
          </ActionMenu.Overlay>
        </ActionMenu>
      ) : designSystem === "adobe" ? (
        <div className="relative w-full">
          <DesignSystemSidebarButton
            id={id}
            tooltip={label}
            aria-hidden
            tabIndex={-1}
            className="pointer-events-none"
            data-analytics-action={`${analyticsAction}_open`}
          >
            {icon}
            <span>{current.label}</span>
          </DesignSystemSidebarButton>
          <select
            aria-label={label}
            title={title ?? label}
            value={value}
            className="ds-native-choice-select"
            data-analytics-action={`${analyticsAction}_open`}
            onChange={(event) => {
              const next = event.target.value;
              select(next);
              event.target.dataset.analyticsValue = next;
            }}
          >
            {choices.map((choice) => (
              <option key={choice.value} value={choice.value}>
                {choice.label}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild data-slot="sidebar-menu-button">
            {trigger}
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side={state === "collapsed" && !isMobile ? "right" : "top"}
            align="start"
            sideOffset={8}
            className="min-w-44 w-auto"
          >
            {title && <DropdownMenuLabel>{title}</DropdownMenuLabel>}
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
