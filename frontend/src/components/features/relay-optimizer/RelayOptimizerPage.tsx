import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import "./RelayOptimizerPage.css";
import { PoolSelectorModal } from "../pool-selector/PoolSelectorModal";
import { useSwimmersStore } from "@/stores/useSwimmersStore";
import { relayRules } from "@/core/config/relayRules";
import { findOptimalRelayTeam, RelayTeam } from "@/core/algorithms/relaySolver";
import { formatMs } from "@/core/utils";

const imgLogo = "https://www.figma.com/api/mcp/asset/851fb922-a65f-4447-95af-1542f51c3cd9";

export const RelayOptimizerPage = () => {
  // --- Wizard Step 1: Configuration State ---
  const [poolLength, setPoolLength] = useState<25 | 50>(50);
  const [gender, setGender] = useState<'Muži' | 'Ženy' | 'Mix'>("Muži");
  const [eventType, setEventType] = useState<string>("4x50PZ");
  
  // --- Wizard Step 2: Pool Selection State ---
  const [isPoolOpen, setIsPoolOpen] = useState(false);
  const [selectedSwimmerIds, setSelectedSwimmerIds] = useState<string[]>([]);
  
  // --- Wizard Step 3: Results State ---
  const [results, setResults] = useState<RelayTeam[]>([]);
  const [calculationError, setCalculationError] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // --- Data Fetching ---
  const allSwimmers = useSwimmersStore((s) => s.swimmers);
  const fetchSwimmers = useSwimmersStore((s) => s.fetch);

  useEffect(() => {
    fetchSwimmers(1997); // Load the initial pool of swimmers
  }, [fetchSwimmers]);

  // --- Derived State & Memoization ---
  const selectedSwimmerDetails = useMemo(() => 
    selectedSwimmerIds.map(id => 
      allSwimmers.find(s => String(s.id) == id)
    ).filter((s): s is NonNullable<typeof s> => s !== undefined),
    [selectedSwimmerIds, allSwimmers]
  );
  
  // --- Event Handlers ---
  const handleCalculate = async () => {
    setCalculationError(null);
    setResults([]);
    setIsCalculating(true);
    try {
      // 1. Fetch detailed data for all selected swimmers for the correct pool size
      const swimmerDetailsPromises = selectedSwimmerIds.map(id => 
        useSwimmersStore.getState().fetchOne(id, poolLength)
      );
      await Promise.all(swimmerDetailsPromises);
      
      const updatedSwimmers = useSwimmersStore.getState().swimmers;
      const selectedSwimmersData = selectedSwimmerIds.map(id => 
        updatedSwimmers.find(s => String(s.id) == id)
      ).filter(Boolean) as any[]; // Type assertion to satisfy the solver input

      // 2. Call the solver
      const optimalTeams = findOptimalRelayTeam(selectedSwimmersData, {
        poolLength,
        relayType: eventType,
        gender,
      });
      setResults(optimalTeams);

    } catch (error: any) {
      setCalculationError(error.message);
    } finally {
      setIsCalculating(false);
    }
  };

  const strokeToAbbreviation: { [key: string]: string } = {
    'Backstroke': 'Z',
    'Breaststroke': 'P',
    'Butterfly': 'M',
    'Freestyle': 'K',
  };

  return (
    <div className="relay-page-root">
      <main className="relay-page-main">
        <section className="relay-page-container">
          <header>
            <h1 className="relay-page-title">TJ Bohemians Praha - Štafety a Liga</h1>
          </header>

          <div className="relay-page-tabs">
            {/* Tabs */}
            <div className="relay-page-tabs-row">
              <Link to="/swimmers" className="relay-page-tab">Plavci</Link>
              <div className="relay-page-tab-separator" />
              <span className="relay-page-tab relay-page-tab--active">Štafeta</span>
              <div className="relay-page-tab-separator" />
              <Link to="/league" className="relay-page-tab">Liga</Link>
              <div className="relay-page-tab-pill" />
            </div>

            {/* --- Step 1: Configuration --- */}
            <div className="relay-config-card">
              <h2 className="relay-config-title">1. Konfigurace štafety</h2>
              <div className="relay-config-divider" />
              <div className="relay-chip-row">
                <button onClick={() => setPoolLength(50)} className={`relay-chip ${poolLength === 50 ? 'relay-chip--active' : ''}`}>50m bazén</button>
                <button onClick={() => setPoolLength(25)} className={`relay-chip ${poolLength === 25 ? 'relay-chip--active' : ''}`}>25m bazén</button>
              </div>
              <div className="relay-chip-row">
                <button onClick={() => setGender('Muži')} className={`relay-chip ${gender === 'Muži' ? 'relay-chip--active' : ''}`}>Muži</button>
                <button onClick={() => setGender('Ženy')} className={`relay-chip ${gender === 'Ženy' ? 'relay-chip--active' : ''}`}>Ženy</button>
                <button onClick={() => setGender('Mix')} className={`relay-chip ${gender === 'Mix' ? 'relay-chip--active' : ''}`}>Mix</button>
              </div>
              <div className="relay-chip-row">
                {Object.keys(relayRules).map(key => (
                  <button key={key} onClick={() => setEventType(key)} className={`relay-chip relay-chip--pill ${eventType === key ? 'relay-chip--active' : ''}`}>
                    {relayRules[key].description}
                  </button>
                ))}
              </div>
            </div>

            {/* --- Step 2: Pool Selection --- */}
            <div className="relay-config-card">
              <h2 className="relay-config-title">2. Výběr plavců</h2>
              <div className="relay-config-divider" />
              <div className="relay-chip-row">
                <button className="relay-chip relay-chip--primary" type="button" onClick={() => setIsPoolOpen(true)}>
                  Přidat / Odebrat plavce
                </button>
              </div>
              <div className="selected-swimmers-list">
                {selectedSwimmerDetails.map(swimmer => (
                  <div key={swimmer.id} className="selected-swimmer-pill">
                    <span>{swimmer.firstName} {swimmer.lastName}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* --- Step 3: Calculation --- */}
            <div className="relay-config-card">
               <h2 className="relay-config-title">3. Spočítat</h2>
               <div className="relay-config-divider" />
              <div className="relay-chip-row">
                <button onClick={handleCalculate} className="relay-chip relay-chip--primary" disabled={selectedSwimmerIds.length < 4 || isCalculating}>
                  Spočítat optimální štafetu
                </button>
              </div>
              {isCalculating && <p>Počítám...</p>}
            </div>

            {/* --- Results --- */}
            {results.length > 0 && (
              <div className="relay-results-grid">
                {results.map((team, index) => (
                  <article key={index} className="relay-result-card">
                    <h3 className="relay-result-heading">Tým {index + 1}</h3>
                    <ol className="relay-result-list">
                      {team.swimmers.map((leg, legIndex) => (
                        <li key={legIndex}>{leg.swimmer.name} ({strokeToAbbreviation[leg.stroke] || leg.stroke}): {formatMs(leg.time)}</li>
                      ))}
                    </ol>
                    <p>Celkový čas: {formatMs(team.totalTime)}</p>
                  </article>
                ))}
              </div>
            )}
            {calculationError && <p className="error-message">{calculationError}</p>}
          </div>
        </section>
      </main>

      <footer className="relay-footer">
        <div className="relay-footer-logo"><img src={imgLogo} alt="TJ Bohemians Praha" /></div>
        <p className="relay-footer-text">© 2025 Všechna práva vyhrazena.</p>
      </footer>

      <PoolSelectorModal
        open={isPoolOpen}
        onClose={() => setIsPoolOpen(false)}
        selectedSwimmers={selectedSwimmerIds}
        setSelectedSwimmers={setSelectedSwimmerIds}
      />
    </div>
  );
};