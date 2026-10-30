"use client";

import { TextInput } from "@primer/react";
import { TextField } from "@adobe/react-spectrum";
import { useDesignSystem } from "@/components/design-system/provider";
import * as React from "react";
import { cn } from "cn";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  const { designSystem } = useDesignSystem();
  const nativeTypes = ["file", "checkbox", "radio", "range", "color", "hidden"];
  if (
    designSystem === "github" &&
    !nativeTypes.includes(type ?? "text")
  ) {
    return (
      <TextInput
        {...props}
        type={type}
        size="medium"
        block
        data-slot="input"
        className={cn("ds-input", className)}
      />
    );
  }
  if (designSystem === "adobe" && !nativeTypes.includes(type ?? "text")) {
    return (
      <TextField
        type={type}
        label={
          props["aria-label"] ||
          props.placeholder ||
          props.name ||
          "Input"
        }
        value={props.value as string | undefined}
        defaultValue={props.defaultValue as string | undefined}
        placeholder={props.placeholder}
        isDisabled={props.disabled}
        isRequired={props.required}
        name={props.name}
        id={props.id}
        autoComplete={props.autoComplete}
        onChange={(value) =>
          props.onChange?.({
            target: { value },
            currentTarget: { value },
          } as React.ChangeEvent<HTMLInputElement>)
        }
        width="100%"
        UNSAFE_className={cn("ds-spectrum-input", className)}
        data-slot="input"
      />
    );
  }
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-(--control-height) w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-[length:var(--control-text)] transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
