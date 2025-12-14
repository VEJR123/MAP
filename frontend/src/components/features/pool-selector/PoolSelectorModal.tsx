import { useState } from "react";
import "./PoolSelectorModal.css";
import { useSwimmersStore } from "@/stores/useSwimmersStore";

const imgSearch = "https://www.figma.com/api/mcp/asset/2f48fe6e-ff6e-45df-b058-89f657ba90be";
const imgStarFilled = "https://www.figma.com/api/mcp/asset/f657265b-52c4-4aa1-9af3-3f73c0166a38";
const imgStarEmpty = "https://www.figma.com/api/mcp/asset/1f2cc6fb-9108-42c8-bc28-15cfc9ec1606";

interface PoolSelectorModalProps {
  open: boolean;
  onClose: () => void;
  selectedSwimmers: string[];
  setSelectedSwimmers: (ids: string[]) => void;
}

export const PoolSelectorModal = ({ open, onClose, selectedSwimmers, setSelectedSwimmers }: PoolSelectorModalProps) => {
  const [search, setSearch] = useState('');
  const allSwimmers = useSwimmersStore((s) => s.swimmers);

  if (!open) return null;

  const handleToggle = (id: string) => {
    if (selectedSwimmers.includes(id)) {
      setSelectedSwimmers(selectedSwimmers.filter(swimmerId => swimmerId !== id));
    } else {
      setSelectedSwimmers([...selectedSwimmers, id]);
    }
  };

  const filteredSwimmers = allSwimmers.filter(swimmer => {
    const fullName = `${swimmer.firstName} ${swimmer.lastName}`.toLowerCase();
    return fullName.includes(search.toLowerCase());
  });

  const sortedSwimmers = [...filteredSwimmers].sort((a, b) => {
    const aIsSelected = selectedSwimmers.includes(a.id);
    const bIsSelected = selectedSwimmers.includes(b.id);
    if (aIsSelected && !bIsSelected) {
      return -1;
    }
    if (!aIsSelected && bIsSelected) {
      return 1;
    }
    return 0;
  });

  return (
    <div className="pool-modal-backdrop">
      <div className="pool-modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="pool-modal-search-box">
          <img src={imgSearch} alt="" className="pool-modal-search-icon" />
          <input
            className="pool-modal-search-input"
            placeholder="Najdi plavce..."
            aria-label="Najdi plavce"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="pool-modal-list">
          {sortedSwimmers.map((swimmer) => {
            const name = `${swimmer.firstName} ${swimmer.lastName}`;
            const isSelected = selectedSwimmers.includes(swimmer.id);

            return (
              <button
                key={swimmer.id}
                type="button"
                className={`pool-modal-row ${isSelected ? 'selected' : ''}`}
                onClick={() => handleToggle(swimmer.id)}
              >
                <span className="pool-modal-row-name">{name}</span>
                <img
                  src={isSelected ? imgStarFilled : imgStarEmpty}
                  alt="označit plavce"
                  className="pool-modal-star"
                />
              </button>
            );
          })}
        </div>

        <div className="pool-modal-footer">
          <button className="pool-modal-confirm-button" onClick={onClose}>
            Potvrdit
          </button>
        </div>
      </div>
    </div>
  );
};

