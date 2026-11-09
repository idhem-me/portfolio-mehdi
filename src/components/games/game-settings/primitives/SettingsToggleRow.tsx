import { useId } from "react";
import { useTranslations } from "next-intl";
import { NativeButton } from "@/components/design-system/native-controls";
import { Badge } from "@/components/ui/badge";

export function SettingsToggleRow({
  id,
  label,
  description,
  checked,
  disabled = false,
  onChange,
}: {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  const t = useTranslations("ui");
  const descriptionId = useId();

  return (
    <NativeButton
      type="button"
      className="game-settings-toggle"
      data-setting-id={id}
      role="switch"
      aria-label={label}
      aria-describedby={description ? descriptionId : undefined}
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <span className="game-settings-toggle-copy">
        <span>{label}</span>
        {description && <span id={descriptionId} className="game-settings-description">{description}</span>}
      </span>
      <Badge variant={checked ? "default" : "secondary"} aria-hidden="true">
        {t(checked ? "yes" : "no")}
      </Badge>
    </NativeButton>
  );
}
