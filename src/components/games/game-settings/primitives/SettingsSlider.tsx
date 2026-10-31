import { NativeInput } from "@/components/design-system/native-controls";

export function SettingsSlider({
  id,
  label,
  description,
  value,
  disabled = false,
  onChange,
}: {
  id: string;
  label: string;
  description?: string;
  value: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  const descriptionId = `${id}-description`;
  return (
    <div className="game-settings-slider">
      <div className="game-settings-slider-heading">
        <label htmlFor={id}>{label}</label>
        <span aria-hidden="true">{value} %</span>
      </div>
      {description && (
        <p className="game-settings-description" id={descriptionId}>
          {description}
        </p>
      )}
      <NativeInput
        id={id}
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        disabled={disabled}
        aria-valuetext={`${value} %`}
        aria-describedby={description ? descriptionId : undefined}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}
