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
