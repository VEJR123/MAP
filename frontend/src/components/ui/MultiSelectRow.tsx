// src/components/ui/MultiSelectRow.tsx
import React from 'react';

interface MultiSelectRowProps {
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
  pill?: boolean;
}

export const MultiSelectRow: React.FC<MultiSelectRowProps> = ({ options, selected, onChange, pill }) => {
  const allSelected = options.length > 0 && options.every((o) => selected.includes(o));

  const toggle = (opt: string) => {
    if (selected.includes(opt)) {
      onChange(selected.filter((s) => s !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };

  const toggleAll = () => {
    if (allSelected) onChange([]);
    else onChange([...options]);
  };

  return (
    <div className="relay-chip-row">
      <button
        type="button"
        className={`relay-chip ${allSelected ? "relay-chip--active" : ""}`}
        onClick={toggleAll}
        aria-pressed={allSelected}
      >
        Vše
      </button>
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          className={`relay-chip ${pill ? "relay-chip--pill" : ""} ${
            selected.includes(opt) ? "relay-chip--active" : ""
          }`}
          aria-pressed={selected.includes(opt)}
          onClick={() => toggle(opt)}
        >
          {opt}
        </button>
      ))}
    </div>
  );
};
