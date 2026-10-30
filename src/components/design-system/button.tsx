"use client";

import {
  Children,
  isValidElement,
  type ComponentProps,
  type FunctionComponent,
  type ReactNode,
  type Ref,
} from "react";
import { Button as PrimerButton, IconButton } from "@primer/react";
import { Button } from "./mehdi-button";
import { useDesignSystem } from "./provider";

/** Compose both refs when a slotted link and its wrapper each need the element. */
function composeRefs(...refs: (Ref<HTMLElement> | undefined)[]) {
  return (node: HTMLElement | null) => {
    const cleanups = refs.map((ref) => {
      if (typeof ref === "function") return ref(node);
      if (ref) ref.current = node;
    });
    return () =>
      refs.forEach((ref, index) => {
        const cleanup = cleanups[index];
        if (typeof cleanup === "function") cleanup();
        else if (typeof ref === "function") ref(null);
        else if (ref) ref.current = null;
      });
  };
}

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
    const slotProps: Record<string, unknown> = { ...props, ...child.props };
    for (const [key, handler] of Object.entries(child.props)) {
      const parentHandler = (props as Record<string, unknown>)[key];
      if (
        /^on[A-Z]/.test(key) &&
        typeof handler === "function" &&
        typeof parentHandler === "function"
      ) {
        slotProps[key] = (...args: unknown[]) => {
          handler(...args);
          parentHandler(...args);
        };
      }
    }
    if (props.style || child.props.style)
      slotProps.style = { ...props.style, ...(child.props.style as object) };
    if (props.ref && child.props.ref)
      slotProps.ref = composeRefs(
        props.ref as Ref<HTMLElement>,
        child.props.ref as Ref<HTMLElement>,
      );
    return (
      <PrimerButton
        as={child.type as FunctionComponent<Record<string, unknown>>}
        {...slotProps}
        variant={primerVariant}
        size={primerSize}
        labelWrap
        className={["ds-button", className, child.props.className]
          .filter(Boolean)
          .join(" ")}
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
        className={["ds-button", className].filter(Boolean).join(" ")}
      />
    );
  }
  return (
    <PrimerButton
      {...props}
      variant={primerVariant}
      size={primerSize}
      className={["ds-button", className].filter(Boolean).join(" ")}
    >
      {children}
    </PrimerButton>
  );
}
