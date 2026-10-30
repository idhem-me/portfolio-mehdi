"use client";

import {
  Children,
  isValidElement,
  type ComponentProps,
  type FunctionComponent,
  type ReactNode,
} from "react";
import { Button as PrimerButton, IconButton } from "@primer/react";
import { Button } from "@/components/ui/button";
import {
  SidebarMenuButton,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { PanelLeft } from "lucide-react";
import { useDesignSystem } from "./provider";

/** Polymorphic bridge: keep the original link, ref, click tracking and destination. */
export function DesignSystemButton({
  asChild,
  children,
  variant = "default",
  size,
  className,
  ...props
}: ComponentProps<typeof Button>) {
  const { designSystem } = useDesignSystem();
  if (designSystem === "mehdi")
    return (
      <Button {...props} {...{ asChild, variant, size, className }}>
        {children}
      </Button>
    );
  const primerVariant =
    variant === "default" || variant === "primary" || variant === "accent"
      ? "primary"
      : variant === "ghost"
        ? "invisible"
        : variant === "destructive"
          ? "danger"
          : "default";
  const primerSize =
    size === "sm" || size === "xs"
      ? "small"
      : size === "lg"
        ? "large"
        : "medium";
  if (asChild) {
    const child = Children.only(children);
    if (
      !isValidElement<Record<string, unknown> & { children?: ReactNode }>(child)
    )
      throw new Error("DesignSystemButton requires one element");
    return (
      <PrimerButton
        as={child.type as FunctionComponent<Record<string, unknown>>}
        {...props}
        {...child.props}
        variant={primerVariant}
        size={primerSize}
        labelWrap
        className="ds-home-button"
      >
        {child.props.children}
      </PrimerButton>
    );
  }
  if (size?.startsWith("icon") && props["aria-label"]) {
    return (
      <IconButton
        {...props}
        aria-label={props["aria-label"]}
        aria-labelledby={undefined}
        icon={() => <>{children}</>}
        variant={primerVariant}
        className={className}
      />
    );
  }
  return (
    <PrimerButton
      {...props}
      variant={primerVariant}
      size={primerSize}
      className={className}
    >
      {children}
    </PrimerButton>
  );
}

export function DesignSystemSidebarButton({
  asChild,
  children,
  className,
  ...props
}: ComponentProps<typeof SidebarMenuButton>) {
  const { designSystem } = useDesignSystem();
  if (designSystem === "mehdi")
    return (
      <SidebarMenuButton {...props} {...{ asChild, className }}>
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
