"use client";

import { Textarea, Radio, Checkbox } from "@primer/react";
import {
  Checkbox as SpectrumCheckbox,
  Radio as SpectrumRadio,
  TextArea as SpectrumTextArea,
} from "@adobe/react-spectrum";
import type { ChangeEvent, ComponentProps } from "react";
import { useDesignSystem } from "./provider";
import { Input } from "@/components/ui/input";
import { DesignSystemButton } from "./button";

/** Preserve the unstyled Mehdi controls used in bespoke layouts and game artwork. */
export function NativeButton(props: ComponentProps<"button">) {
  const { designSystem } = useDesignSystem();
  return designSystem === "github" || designSystem === "adobe" ? (
    <DesignSystemButton variant="ghost" {...props} />
  ) : (
    <button {...props} />
  );
}
export function NativeTextarea(props: ComponentProps<"textarea">) {
  const { designSystem } = useDesignSystem();
  if (designSystem === "github") return <Textarea {...props} block />;
  if (designSystem === "adobe")
    return (
      <SpectrumTextArea
        label={props["aria-label"] || props.placeholder || "Text"}
        value={
          typeof props.value === "string" || typeof props.value === "number"
            ? String(props.value)
            : undefined
        }
        defaultValue={
          typeof props.defaultValue === "string" ||
          typeof props.defaultValue === "number"
            ? String(props.defaultValue)
            : undefined
        }
        isDisabled={props.disabled}
        isRequired={props.required}
        name={props.name}
        id={props.id}
        onChange={(value) =>
          props.onChange?.({
            target: { value },
          } as ChangeEvent<HTMLTextAreaElement>)
        }
        width="100%"
        UNSAFE_className="ds-spectrum-input"
      />
    );
  return <textarea {...props} />;
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
  if (designSystem === "adobe") {
    if (props.type === "radio")
      return (
        <SpectrumRadio
          value={String(props.value ?? "on")}
          isDisabled={props.disabled}
        >
          {props["aria-label"] || ""}
        </SpectrumRadio>
      );
    if (props.type === "checkbox")
      return (
        <SpectrumCheckbox
          isSelected={props.checked}
          defaultSelected={props.defaultChecked}
          isDisabled={props.disabled}
          name={props.name}
          value={
            typeof props.value === "string" ? props.value : String(props.value ?? "on")
          }
          onChange={(isSelected) =>
            props.onChange?.({
              target: { checked: isSelected, value: props.value },
            } as ChangeEvent<HTMLInputElement>)
          }
        >
          {props["aria-label"] || ""}
        </SpectrumCheckbox>
      );
    return <Input {...props} />;
  }
  if (props.type === "radio")
    return <Radio {...props} value={String(props.value ?? "on")} />;
  if (props.type === "checkbox")
    return <Checkbox {...props} value={String(props.value ?? "on")} />;
  return <Input {...props} />;
}
