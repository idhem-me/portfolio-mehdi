import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function SettingsButton({
  variant = "default",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "danger";
  children: ReactNode;
}) {
  return (
    <Button
      {...props}
      variant={variant === "danger" ? "destructive" : "secondary"}
      className={`game-settings-button ${props.className ?? ""}`}
    >
      {children}
    </Button>
  );
}
