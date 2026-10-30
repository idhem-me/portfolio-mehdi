"use client";
import {
  Children,
  isValidElement,
  type ComponentProps,
  type FunctionComponent,
  type ReactNode,
} from "react";
import { Button as PrimerButton } from "@primer/react";
import { PanelLeft } from "lucide-react";
import {
  SidebarMenuButton,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { DesignSystemButton } from "./button";
import { useDesignSystem } from "./provider";

export function DesignSystemSidebarButton({
  asChild,
  children,
  className,
  ...props
}: ComponentProps<typeof SidebarMenuButton>) {
  const { designSystem } = useDesignSystem();
  if (designSystem === "mehdi" || designSystem === "adobe")
    return (
      <SidebarMenuButton
        {...props}
        asChild={asChild}
        className={
          designSystem === "adobe"
            ? `ds-nav-button ${className ?? ""}`
            : className
        }
      >
        {children}
      </SidebarMenuButton>
    );
  let content = (
    <PrimerButton variant="invisible" alignContent="start">
      {children}
    </PrimerButton>
  );
  if (asChild) {
    const child = Children.only(children);
    if (
      !isValidElement<Record<string, unknown> & { children?: ReactNode }>(child)
    )
      throw new Error("DesignSystemSidebarButton requires one element");
    content = (
      <PrimerButton
        as={child.type as FunctionComponent<Record<string, unknown>>}
        {...child.props}
        variant="invisible"
        alignContent="start"
      >
        {child.props.children}
      </PrimerButton>
    );
  }
  return (
    <SidebarMenuButton
      {...props}
      asChild
      className={`ds-nav-button ${className ?? ""}`}
    >
      {content}
    </SidebarMenuButton>
  );
}

/** Preserve the shell's responsive behavior while changing the actual control. */
export function DesignSystemSidebarTrigger({
  onClick,
  ...props
}: ComponentProps<typeof SidebarTrigger>) {
  const { designSystem } = useDesignSystem();
  const { state, toggleSidebar } = useSidebar();
  if (designSystem === "mehdi")
    return <SidebarTrigger {...props} onClick={onClick} />;
  return (
    <DesignSystemButton
      {...props}
      data-sidebar="trigger"
      data-slot="sidebar-trigger"
      variant="ghost"
      size="icon-sm"
      aria-label={state === "expanded" ? "Fermer le panel" : "Ouvrir le panel"}
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
    >
      <PanelLeft />
    </DesignSystemButton>
  );
}
