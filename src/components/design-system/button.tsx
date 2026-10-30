"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  type ComponentProps,
  type FunctionComponent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react";
import { Button as PrimerButton, IconButton } from "@primer/react";
import {
  ActionButton as SpectrumActionButton,
  Button as SpectrumButton,
} from "@adobe/react-spectrum";
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

function mergeSlotProps(
  props: Record<string, unknown>,
  childProps: Record<string, unknown> & { children?: ReactNode },
) {
  const slotProps: Record<string, unknown> = { ...props, ...childProps };
  for (const [key, handler] of Object.entries(childProps)) {
    const parentHandler = props[key];
    if (
      /^on[A-Z]/.test(key) &&
      typeof handler === "function" &&
      typeof parentHandler === "function"
    ) {
      slotProps[key] = (...args: unknown[]) => {
        (handler as (...a: unknown[]) => void)(...args);
        (parentHandler as (...a: unknown[]) => void)(...args);
      };
    }
  }
  if (props.style || childProps.style)
    slotProps.style = {
      ...(props.style as object),
      ...(childProps.style as object),
    };
  if (props.ref && childProps.ref)
    slotProps.ref = composeRefs(
      props.ref as Ref<HTMLElement>,
      childProps.ref as Ref<HTMLElement>,
    );
  return slotProps;
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

  if (designSystem === "adobe") {
    const spectrumVariant =
      variant === "destructive"
        ? ("negative" as const)
        : variant === "default" || variant === "primary" || variant === "accent"
          ? ("accent" as const)
          : variant === "secondary" || variant === "outline"
            ? ("primary" as const)
            : ("secondary" as const);
    const isQuiet = variant === "ghost" || variant === "link";
    const spectrumClass = ["ds-button", className].filter(Boolean).join(" ");
    const {
      style: _style,
      value: _value,
      type: _type,
      onClick,
      disabled,
      "aria-label": ariaLabel,
      id,
      ...restHtml
    } = props;
    void _style;
    void _value;
    void _type;
    void restHtml;
    if (asChild) {
      const child = Children.only(children);
      if (
        !isValidElement<Record<string, unknown> & { children?: ReactNode }>(
          child,
        )
      )
        throw new Error("DesignSystemButton requires one element");
      // Spectrum's elementType drops Next.js Link href; keep the original
      // link and paint it with Spectrum button tokens via CSS.
      const slotProps = mergeSlotProps(
        props as Record<string, unknown>,
        child.props,
      );
      return cloneElement(
        child as ReactElement<Record<string, unknown>>,
        {
          ...slotProps,
          "data-spectrum-aschild-button": spectrumVariant,
          className: [
            spectrumClass,
            "ds-spectrum-aschild-button",
            isQuiet && "ds-spectrum-aschild-button-quiet",
            slotProps.className as string | undefined,
          ]
            .filter(Boolean)
            .join(" "),
        },
      );
    }
    if (size?.startsWith("icon") || isQuiet) {
      return (
        <SpectrumActionButton
          id={id}
          aria-label={ariaLabel}
          isDisabled={disabled}
          isQuiet
          onPress={(e) =>
            onClick?.({
              ...e,
              preventDefault: () => undefined,
              stopPropagation: () => undefined,
            } as unknown as MouseEvent<HTMLButtonElement>)
          }
          UNSAFE_className={spectrumClass}
        >
          {children}
        </SpectrumActionButton>
      );
    }
    return (
      <SpectrumButton
        id={id}
        aria-label={ariaLabel}
        isDisabled={disabled}
        variant={spectrumVariant}
        onPress={(e) =>
          onClick?.({
            ...e,
            preventDefault: () => undefined,
            stopPropagation: () => undefined,
          } as unknown as MouseEvent<HTMLButtonElement>)
        }
        UNSAFE_className={spectrumClass}
      >
        {children}
      </SpectrumButton>
    );
  }

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
    const slotProps = mergeSlotProps(
      props as Record<string, unknown>,
      child.props,
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
