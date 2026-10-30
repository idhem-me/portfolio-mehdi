"use client";

import { Textarea, Radio, Checkbox } from "@primer/react";
import type { ComponentProps } from "react";
import { useDesignSystem } from "./provider";
import { Input } from "@/components/ui/input";
import { DesignSystemButton } from "./button";

/** Preserve the unstyled Mehdi controls used in bespoke layouts and game artwork. */
export function NativeButton(props: ComponentProps<"button">) {
  const { designSystem } = useDesignSystem();
  return designSystem === "github" ? (
    <DesignSystemButton variant="ghost" {...props} />
  ) : (
    <button {...props} />
  );
}
export function NativeTextarea(props: ComponentProps<"textarea">) {
  const { designSystem } = useDesignSystem();
  return designSystem === "github" ? (
    <Textarea {...props} block />
  ) : (
    <textarea {...props} />
  );
}

/** Keep file pickers, ranges and hidden platform probes native. */
export function NativeInput({ size, ...props }: ComponentProps<"input">) {
  const { designSystem } = useDesignSystem();
  if (
    designSystem === "mehdi" ||
    props.hidden ||
    props["aria-hidden"] ||
    ["file", "range", "color", "hidden"].includes(props.type ?? "text")
  )
    return <input size={size} {...props} />;
  if (props.type === "radio")
    return <Radio {...props} value={String(props.value ?? "on")} />;
  if (props.type === "checkbox")
    return <Checkbox {...props} value={String(props.value ?? "on")} />;
  return <Input {...props} />;
}
