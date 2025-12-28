import { Link } from "react-router-dom";
import "./LeagueBuilderPage.css";
import { PoolSelectorModal } from "../pool-selector/PoolSelectorModal";
import { useState, useEffect, useMemo } from "react";
import { useSwimmersStore } from "@/stores/useSwimmersStore";
import { solveLeagueTeam, LeagueResult } from "@/core/algorithms/leagueSolver";
import { formatMs, calculateFinaPoints } from "@/core/utils";

// Local normalization helper (mirror of leagueSolver.normalizeEventName)
const normalizeEventName = (eventCode: string): string => {
  const distanceMatch = eventCode.match(/^(\d+)/);
  const distance = distanceMatch ? distanceMatch[1] : '';
  const lastChar = eventCode.slice(-1).toUpperCase();
  let stroke = '';
  switch (lastChar) {
    case 'K': stroke = 'Volný způsob'; break;
    case 'Z': stroke = 'Znak'; break;
    case 'O': stroke = 'Polohový závod'; break;
    case 'P': stroke = 'Prsa'; break;
    case 'M': stroke = 'Motýlek'; break;
    default: return eventCode;
  }
  return distance ? `${distance}m ${stroke}` : eventCode;
};

const imgLogo = "https://www.figma.com/api/mcp/asset/851fb922-a65f-4447-95af-1542f51c3cd9";

const EVENTS = [
  "100m Znak",
  "100m Prsa",
  "200m Prsa",
  "100m Motýlek",
  "200m Motýlek",
  "100m Volný způsob",
  "200m Volný způsob",
  "400m Volný způsob",
  "1500m Volný způsob",
  "200m Polohový závod",
  "400m Polohový závod",
  "50m Volný způsob",
];

export const LeagueBuilderPage = () => {
  const [isPoolOpen, setIsPoolOpen] = useState(false);
  const [poolLength, setPoolLength] = useState<25 | 50>(50);
  const [gender, setGender] = useState<'Muži' | 'Ženy'>("Muži");
  const [category, setCategory] = useState<'A' | 'B' | 'C'>("A");
  const [selectedSwimmerIds, setSelectedSwimmerIds] = useState<string[]>([]);
  
  const [leagueResult, setLeagueResult] = useState<LeagueResult | null>(null);
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

  const handleCalculate = async () => {
    setIsCalculating(true);
    try {
      // Validate swimmers before solving
      if (selectedSwimmerDetails.length === 0) {
        alert("Prosím vyberte alespoň jednoho plavce.");
        setIsCalculating(false);
        return;
      }

      // Ensure all swimmers have times loaded
      console.log("Loading times for swimmers...");
      const swimmersWithTimes: typeof selectedSwimmerDetails = [];
      
      for (const swimmer of selectedSwimmerDetails) {
        // If swimmer already has times, use them
        if (swimmer.times && Array.isArray(swimmer.times) && swimmer.times.length > 0) {
          console.log(`Swimmer ${swimmer.id} already has ${swimmer.times.length} times`);
          swimmersWithTimes.push(swimmer);
          continue;
        }
        
        // Otherwise fetch them from API
        console.log(`Fetching times for swimmer ${swimmer.id}...`);
        const fullSwimmer = await useSwimmersStore.getState().fetchOne(String(swimmer.id), poolLength);
        
        if (!fullSwimmer || !fullSwimmer.times) {
          console.warn(`Could not fetch times for swimmer ${swimmer.id}`);
          swimmersWithTimes.push(swimmer);
        } else {
          console.log(`Swimmer ${swimmer.id} now has ${fullSwimmer.times.length} times`);
          swimmersWithTimes.push(fullSwimmer);
        }
      }
      
      console.log("swimmersWithTimes population summary:", swimmersWithTimes.map(s => ({
        id: s.id,
        name: `${s.firstName} ${s.lastName}`,
        timesCount: (s.times || []).length
      })));

      const result = solveLeagueTeam(swimmersWithTimes, EVENTS, poolLength);
      setLeagueResult(result);

      // Log full result for debugging
      console.log("League result:", result);

      // Print a concise composition: swimmer -> assigned events
      const assignmentsBySwimmer: Record<string, string[]> = {};
      result.assignments.forEach(a => {
        if (!assignmentsBySwimmer[a.swimmerId]) assignmentsBySwimmer[a.swimmerId] = [];
        assignmentsBySwimmer[a.swimmerId].push(a.eventId);
      });
      console.log("Team composition:");
      result.roster.forEach(r => {
        const eventsFor = assignmentsBySwimmer[r.id] || [];
        console.log(`${r.firstName} ${r.lastName} (${r.id}): ${eventsFor.join(', ') || '-'};`);
      });
    } catch (e) {
      console.error("Optimization failed", e);
      console.error("Error details:", e instanceof Error ? e.message : String(e));
      alert("Nepodařilo se vypočítat tým. Zkontrolujte, zda máte dostatek plavců pro pokrytí disciplín.");
    } finally {
      setIsCalculating(false);
    }
  };

  // Precompute assignment counts from last solver result
  const assignmentCounts = useMemo(() => {
    const acc: Record<string, number> = {};
    (leagueResult?.assignments || []).forEach(a => {
      acc[String(a.swimmerId)] = (acc[String(a.swimmerId)] || 0) + 1;
    });
    return acc;
  }, [leagueResult]);

  return (
    <div className="league-page-root">
      <main className="league-page-main">
        <section className="league-page-container">
          <header>
            <h1 className="league-page-title">TJ Bohemians Praha - Štafety a Liga</h1>
          </header>

          <div className="league-page-tabs">
            <div className="league-page-tabs-row">
              <Link to="/swimmers" className="league-page-tab">
                Plavci
              </Link>
              <div className="league-page-tab-separator" />
              <Link to="/relay" className="league-page-tab">
                Štafeta
              </Link>
              <div className="league-page-tab-separator" />
              <span className="league-page-tab league-page-tab--active">Liga</span>
              <div className="league-page-tab-pill" />
            </div>

            {/* --- Step 1: Configuration --- */}
            <div className="league-config-card">
              <h2 className="league-config-title">1. Konfigurace ligy</h2>
              <div className="league-config-divider" />

              <div className="league-chip-row">
                <button 
                  onClick={() => setPoolLength(50)} 
                  className={`league-chip ${poolLength === 50 ? 'league-chip--active' : ''}`}
                >
                  50m bazén
                </button>
                <button 
                  onClick={() => setPoolLength(25)} 
                  className={`league-chip ${poolLength === 25 ? 'league-chip--active' : ''}`}
                >
                  25m bazén
                </button>
              </div>

              <div className="league-chip-row">
                <button 
                  onClick={() => setGender('Muži')} 
                  className={`league-chip ${gender === 'Muži' ? 'league-chip--active' : ''}`}
                >
                  Muži
                </button>
                <button 
                  onClick={() => setGender('Ženy')} 
                  className={`league-chip ${gender === 'Ženy' ? 'league-chip--active' : ''}`}
                >
                  Ženy
                </button>
              </div>

              <div className="league-chip-row">
                {(['A', 'B', 'C'] as const).map((cat) => (
                  <button 
                    key={cat}
                    onClick={() => setCategory(cat)} 
                    className={`league-chip league-chip--pill ${category === cat ? 'league-chip--active' : ''}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* --- Step 2: Pool Selection --- */}
            <div className="league-config-card">
              <h2 className="league-config-title">2. Výběr plavců</h2>
              <div className="league-config-divider" />
              <div className="league-chip-row">
                <button
                  className="league-chip league-chip--primary"
                  type="button"
                  onClick={() => setIsPoolOpen(true)}
                >
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

            {/* --- Step 3: Calculate --- */}
            <div className="league-config-card">
              <h2 className="league-config-title">3. Spočítat</h2>
              <div className="league-config-divider" />
              <div className="league-chip-row">
                <button 
                  className="league-chip league-chip--primary" 
                  type="button"
                  onClick={handleCalculate}
                  disabled={isCalculating || selectedSwimmerIds.length === 0}
                >
                  {isCalculating ? "Počítám..." : "Spočítat"}
                </button>
              </div>
            </div>

            <div className="league-results-grid">
              
            
              <section className="league-result-row">
                {/* Header row */}
                <div className="cell-header cell-header--best" style={{ gridColumn: 1, gridRow: 1 }}>
                  <ol className="league-result-best-list" start={1}>
                    <li>Celkem: {leagueResult?.totalPoints || 0}</li>
                  </ol>
                  <div className="league-result-best-underline" />
                </div>

                <div className="cell-header" style={{ gridColumn: 2, gridRow: 1 }}>1.</div>
                <div className="cell-header" style={{ gridColumn: 3, gridRow: 1 }}>2.</div>
                <div className="cell-header" style={{ gridColumn: 4, gridRow: 1 }}>Fina body</div>

                {/* Rows: each event renders 4 direct grid children (label + 3 pills) */}

                {EVENTS.map((event, idx) => {
                  // Prefer solver assignments for this event if available
                  const solverAssigned = (leagueResult?.assignments || []).filter(a => a.eventId === event).slice().sort((a,b) => b.points - a.points);

                  if (idx === 0) {
                    console.log("Event coverage report:");
                    EVENTS.forEach((e) => {
                      const count = (leagueResult?.assignments || []).filter(a => a.eventId === e).length;
                      console.log(`  ${e}: ${count} swimmer(s)`);
                    });
                  }

                  let firstNameSlot: string | null = null;
                  let secondNameSlot: string | null = null;
                  let firstPoints = 0;
                  let secondPoints = 0;
                  let p2Points = 0;

                  if (solverAssigned.length > 0) {
                    // Use solver-assigned swimmers (may be 1 or 2)
                    const nameOf = (id: string) => {
                      const s = allSwimmers.find(sw => String(sw.id) === String(id)) || leagueResult?.roster.find(r => String(r.id) === String(id));
                      return s ? `${s.firstName} ${s.lastName}` : String(id);
                    };

                    const chosen: { id: string; name: string; points: number }[] = [];
                    solverAssigned.slice(0, 2).forEach(s => {
                      chosen.push({ id: String(s.swimmerId), name: nameOf(s.swimmerId), points: s.points });
                    });

                    // If solver provided fewer than 2, fill remaining slots from best available candidates
                    if (chosen.length < 2) {
                      const candidates = (allSwimmers || []).map(s => {
                        const timeObj = (s.times || []).find((t: any) => t.event === event) || (s.times || []).find((t: any) => normalizeEventName(t.event) === event);
                        if (!timeObj || !timeObj.personalBestMs) return null;
                        const points = calculateFinaPoints(timeObj.personalBestMs, event, poolLength, s.gender);
                        return { id: String(s.id), name: `${s.firstName} ${s.lastName}`, points };
                      }).filter(Boolean) as {id:string,name:string,points:number}[];

                      if (event === "100m Znak") {
                        console.log(`DEBUG ${event}: solverAssigned=${solverAssigned.length}, candidates=${candidates.length}, chosen before=${chosen.length}`);
                      }

                      candidates.sort((a,b) => b.points - a.points);
                      for (const c of candidates) {
                        if (chosen.find(ch => ch.id === c.id)) continue;
                        const cur = assignmentCounts[c.id] || 0;
                        if (cur >= 4) continue; // respect max 4 starts
                        // assign tentatively and increment count so subsequent events respect limit
                        chosen.push(c);
                        assignmentCounts[c.id] = cur + 1;
                        if (chosen.length >= 2) break;
                      }
                    }

                    firstNameSlot = chosen[0] ? chosen[0].name : null;
                    secondNameSlot = chosen[1] ? chosen[1].name : null;
                    firstPoints = chosen[0] ? chosen[0].points : 0;
                    secondPoints = chosen[1] ? chosen[1].points : 0;
                  } else {
                    // Fallback: pick two fastest candidates by FINA points from available swimmer times
                    const candidates = (allSwimmers || []).map(s => {
                      const timeObj = (s.times || []).find((t: any) => t.event === event) || (s.times || []).find((t: any) => normalizeEventName(t.event) === event);
                      if (!timeObj || !timeObj.personalBestMs) return null;
                      const points = calculateFinaPoints(timeObj.personalBestMs, event, poolLength, s.gender);
                      return { id: String(s.id), name: `${s.firstName} ${s.lastName}`, points };
                    }).filter(Boolean) as {id:string,name:string,points:number}[];

                    candidates.sort((a,b) => b.points - a.points);
                    let picked: {id:string,name:string,points:number}[] = [];
                    for (const c of candidates) {
                      const cur = assignmentCounts[c.id] || 0;
                      if (cur >= 4) continue;
                      if (picked.find(p => p.id === c.id)) continue;
                      picked.push(c);
                      assignmentCounts[c.id] = cur + 1;
                      if (picked.length >= 2) break;
                    }

                    const best1 = picked[0] || null;
                    const best2 = picked[1] || null;
                    firstNameSlot = best1 ? best1.name : null;
                    secondNameSlot = best2 ? best2.name : null;
                    firstPoints = best1 ? best1.points : 0;
                    secondPoints = best2 ? best2.points : 0;
                  }

                  const getSwimmerName = (id: string) => {
                    const s = allSwimmers.find(sw => String(sw.id) === String(id))
                      || leagueResult?.roster.find(r => String(r.id) === String(id));
                    return s ? `${s.firstName} ${s.lastName}` : String(id);
                  };

                  return (
                    <div key={`row-${idx}`} style={{ display: 'contents' }}>
                      <p
                        className="cell-label"
                        style={{ gridColumn: 1, gridRow: idx + 2 }}
                      >
                        {event}
                      </p>

                      <div
                        className="cell-pill cell-pill--pb"
                        style={{ gridColumn: 2, gridRow: idx + 2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: '#129a5f', fontWeight: 500 }}
                      >
                        {firstNameSlot ? firstNameSlot : '-'}
                      </div>

                      <div
                        className="cell-pill cell-pill--expected"
                        style={{ gridColumn: 3, gridRow: idx + 2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: '#fff', fontWeight: 500 }}
                      >
                        {secondNameSlot ? secondNameSlot : '-'}
                      </div>

                      <div
                        className="cell-pill cell-pill--points"
                        style={{ gridColumn: 4, gridRow: idx + 2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: '#fff', fontWeight: 600 }}
                      >
                        {firstPoints > 0 || secondPoints > 0 ? `${firstPoints}+${secondPoints}` : '-'}
                      </div>
                    </div>
                  );
                })}
              </section>
            </div>

            <div className="league-pagination">
              <span>{"<"}</span>
              <div className="league-pagination-pages">
                <button className="league-page-pill league-page-pill--active">1</button>
                <button className="league-page-pill">2</button>
                <button className="league-page-pill">3</button>
              </div>
              <span>{">"}</span>
            </div>
          </div>
        </section>
      </main>

      <footer className="league-footer">
        <div className="league-footer-logo">
          <img src={imgLogo} alt="TJ Bohemians Praha" />
        </div>
        <p className="league-footer-text">© 2025 Všechna práva vyhrazena.</p>
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

