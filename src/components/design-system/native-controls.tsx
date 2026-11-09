import type { ComponentProps } from "react";

/** Keep native form behavior in bespoke layouts and game artwork. */
export function NativeButton(props: ComponentProps<"button">) {
  return <button {...props} />;
}

export function NativeTextarea(props: ComponentProps<"textarea">) {
  return <textarea {...props} />;
}

export function NativeInput(props: ComponentProps<"input">) {
  return <input {...props} />;
}

export function NativeCheckbox({ children, ...props }: Omit<ComponentProps<"input">, "type" | "className" | "children"> & {
  children: ComponentProps<"label">["children"];
}) {
  return (
    <label className="flex min-h-(--control-height-lg) min-w-(--touch-target-size) cursor-pointer items-center gap-3 text-[length:var(--control-text)] has-focus-visible:outline-2 has-focus-visible:outline-ring has-disabled:cursor-not-allowed">
      <NativeInput {...props} type="checkbox" className="size-5 shrink-0 accent-primary" />
      {children}
    </label>
  );
}
