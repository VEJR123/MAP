// src/components/ui/SingleSelectRow.tsx
import React from 'react';

interface SingleSelectRowProps {
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
  pill?: boolean;
}

export const SingleSelectRow: React.FC<SingleSelectRowProps> = ({ options, selected, onSelect, pill }) => {
  return (
    <div className="relay-chip-row">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          className={`relay-chip ${pill ? "relay-chip--pill" : ""} ${
            selected === opt ? "relay-chip--active" : ""
          }`}
          aria-pressed={selected === opt}
          onClick={() => onSelect(opt)}
        >
          {opt}
        </button>
      ))}
    </div>
  );
};
