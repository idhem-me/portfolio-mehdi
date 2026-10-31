import type { HTMLAttributes, ReactNode } from "react";

export function SettingsCard({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div {...props} className={`game-settings-card${className ? ` ${className}` : ""}`}>
      {children}
    </div>
  );
}
