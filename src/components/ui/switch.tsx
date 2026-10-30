"use client";
import { ToggleSwitch } from "@primer/react";
import { useDesignSystem } from "@/components/design-system/provider";
import * as React from "react";
import { Switch as Primitive } from "radix-ui";
import { cn } from "@/lib/utils";
export function Switch({
  className,
  ref,
  ...props
}: React.ComponentProps<typeof Primitive.Root>) {
  const { designSystem } = useDesignSystem();
  const labelId = React.useId();
  const [uncontrolled, setUncontrolled] = React.useState(
    props.defaultChecked ?? false,
  );
  const checked = props.checked ?? uncontrolled;
  function change(next: boolean) {
    setUncontrolled(next);
    props.onCheckedChange?.(next);
  }
  if (designSystem === "github") {
    return (
      <>
        <span id={labelId} className="sr-only">
          {props["aria-label"]}
        </span>
        <ToggleSwitch
          id={props.id}
          ref={ref}
          disabled={props.disabled}
          checked={checked}
          aria-labelledby={props["aria-labelledby"] ?? labelId}
          aria-describedby={props["aria-describedby"]}
          onChange={change}
          buttonType={props.type}
          className={className}
        />
        {props.name && checked && (
          <input
            type="hidden"
            name={props.name}
            value={props.value ?? "on"}
            form={props.form}
          />
        )}
      </>
    );
  }
  return (
    <Primitive.Root
      ref={ref}
      data-slot="switch"
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-input shadow-xs transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary",
        className,
      )}
      {...props}
      checked={checked}
      onCheckedChange={change}
    >
      <Primitive.Thumb className="pointer-events-none block size-5 rounded-full bg-background shadow-sm transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0" />
    </Primitive.Root>
  );
}
