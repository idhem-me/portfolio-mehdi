import { Badge } from "@/components/ui/badge";

export function SettingsToggleRow({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      className="game-settings-toggle"
      data-setting-id={id}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
    >
      <span className="game-settings-toggle-copy">
        <span>{label}</span>
        {description && <span className="game-settings-description">{description}</span>}
      </span>
      <Badge variant={checked ? "default" : "secondary"} aria-hidden="true">
        {checked ? "Oui" : "Non"}
      </Badge>
    </button>
  );
}
