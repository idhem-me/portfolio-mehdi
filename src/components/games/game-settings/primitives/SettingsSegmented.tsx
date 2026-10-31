import { useId, type ComponentType } from "react";
import { Button } from "@/components/ui/button";

export type SettingsSegment = {
  value: string;
  label: string;
  icon?: ComponentType<{ "aria-hidden"?: boolean }>;
};

export function SettingsSegmented({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: SettingsSegment[];
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="game-settings-segmented" role="group" aria-label={label}>
      {options.map(({ value: option, label: optionLabel, icon: Icon }) => (
        <Button
          key={option}
          variant={value === option ? "secondary" : "ghost"}
          aria-pressed={value === option}
          aria-describedby={id}
          onClick={() => onChange(option)}
        >
          {Icon && <Icon aria-hidden />}
          {optionLabel}
        </Button>
      ))}
      <span id={id} className="sr-only">{label}</span>
    </div>
  );
}
