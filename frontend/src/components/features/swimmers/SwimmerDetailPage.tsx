import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { SwimmerDetailCard } from "./SwimmerDetailCard";
import "./SwimmersPage.css";
import { useSwimmersStore } from "@/stores/useSwimmersStore";

export const SwimmerDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const swimmers = useSwimmersStore((s) => s.swimmers);
  const fetchOne = useSwimmersStore((s) => s.fetchOne);
  const poolSize = useSwimmersStore((s) => s.poolSize);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      console.log('Fetching swimmer with ID:', id, 'for pool size:', poolSize);
      try {
        const swimmerData = await fetchOne(id, poolSize);
        console.log('Fetched swimmer data:', swimmerData);
        if (mounted) setLoading(false);
      } catch (error) {
        console.error('Error fetching swimmer:', error);
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id, fetchOne, poolSize]);

  const swimmer = swimmers.find((s) => String(s.id) === String(id));

  if (loading) {
    return (
      <div className="swimmers-page-root">
        <main className="swimmers-page-main">
          <section className="swimmers-page-container">
            <p>Načítám detail plavce...</p>
            <Link to="/swimmers">Zpět na databázi plavců</Link>
          </section>
        </main>
      </div>
    );
  }

  if (!swimmer) {
    return (
      <div className="swimmers-page-root">
        <main className="swimmers-page-main">
          <section className="swimmers-page-container">
            <p>Plavec nebyl nalezen.</p>
            <Link to="/swimmers">Zpět na databázi plavců</Link>
          </section>
        </main>
      </div>
    );
  }

  const lastToShow = swimmer.newLastName && swimmer.newLastName.trim() ? swimmer.newLastName : swimmer.lastName;
  const swimmerName = `${swimmer.firstName} ${lastToShow}`.trim();

  // Map short event names to full names (e.g., "100K" -> "100m Volný způsob")
  const mapShortToFull = (short?: string): string | null => {
    if (!short) return null;
    const s = short.trim().toUpperCase();
    
    // Pattern: number + letter (e.g., "100K", "50M", "200P")
    const match = s.match(/^(\d+)([KMOPZ])$/);
    if (!match) return null;
    
    const distance = match[1];
    const style = match[2];
    
    const styleMap: Record<string, string> = {
      'K': 'Volný způsob',
      'M': 'Motýlek',
      'P': 'Prsa',
      'Z': 'Znak',
      'O': 'Polohový závod',
    };
    
    const styleName = styleMap[style];
    if (!styleName) return null;
    
    return `${distance}m ${styleName}`;
  };

  // Exact disciplines and order as shown in the provided design image
  const DISCIPLINES = [
    '100m Znak',
    '100m Prsa',
    '200m Prsa',
    '100m Motýlek',
    '200m Motýlek',
    '100m Volný způsob',
    '200m Volný způsob',
    '400m Volný způsob',
    '1500m Volný způsob',
    '200m Polohový závod',
    '400m Polohový závod',
    '50m Motýlek',
    '50m Znak',
    '50m Prsa',
    '50m Volný způsob',
  ];

  // Normalization for matching event names (strip diacritics, spaces, punctuation, lowercase)
  const normalize = (s?: string) => {
    if (!s) return '';
    try {
      // NFD + remove combining marks
      const decomp = s.normalize ? s.normalize('NFD') : s;
      const noDiacritics = decomp.replace(/\p{Diacritic}/gu, '');
      return noDiacritics.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    } catch (e) {
      return String(s).replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    }
  };

  const timesList = swimmer.times ?? [];
  
  // Debug: log what we received from API
  console.log('=== SWIMMER DETAIL DEBUG ===');
  console.log('Full swimmer object:', swimmer);
  console.log('Swimmer times from API:', timesList);
  console.log('Number of times:', timesList.length);

  // Build a map of normalized event -> best time object
  const timesMap: Record<string, any> = {};
  for (const t of timesList) {
    const originalEvent = t.event ?? t.eventName ?? '';
    if (!originalEvent) {
      console.warn('Skipping time entry with no event name:', t);
      continue;
    }
    
    // Try to map short name to full name
    const fullEventName = mapShortToFull(originalEvent) || originalEvent;
    
    // Normalize the full event name for matching
    const key = normalize(fullEventName);
    if (!key) {
      console.warn('Skipping time entry - could not normalize event name:', originalEvent);
      continue;
    }
    
    const existing = timesMap[key];
    const pb = typeof t.personalBestMs === 'number' ? t.personalBestMs : (t.personalBest ? Number(t.personalBest) : null);
    if (!existing) {
      timesMap[key] = { ...t, event: fullEventName, personalBestMs: pb };
    } else {
      // prefer smaller (faster) personal best
      if (pb !== null && pb !== undefined && (existing.personalBestMs === null || pb < existing.personalBestMs)) {
        timesMap[key] = { ...t, event: fullEventName, personalBestMs: pb };
      }
    }
  }
  
  console.log('Normalized times map:', timesMap);

  const effectiveRows = DISCIPLINES.map((ev) => {
    const key = normalize(ev);
    const found = timesMap[key];
    const row = {
      event: ev,
      personalBest: found?.personalBestMs ? String(found.personalBestMs) : undefined,
      expectedTime: found?.expectedTimeMs ? String(found.expectedTimeMs) : undefined,
      personalBestMs: found?.personalBestMs ?? undefined,
      expectedTimeMs: found?.expectedTimeMs ?? undefined,
    };
    if (found) {
      console.log(`Matched discipline "${ev}" (normalized: "${key}") with time:`, found);
    }
    return row;
  });
  
  console.log('Effective rows for display:', effectiveRows);

  return (
    <div className="swimmers-page-root">
      <main className="swimmers-page-main">
        <section className="swimmers-page-container">
          <header>
            <h1 className="swimmers-page-title">TJ Bohemians Praha - Štafety a Liga</h1>
          </header>

          <div className="swimmers-page-tabs">
            <div className="swimmers-page-tabs-row">
              <Link to="/swimmers" className="swimmers-page-tab swimmers-page-tab--active">
                Plavci
              </Link>
              <div className="swimmers-page-tab-separator" />
              <Link to="/relay" className="swimmers-page-tab">
                Štafeta
              </Link>
              <div className="swimmers-page-tab-separator" />
              <Link to="/league" className="swimmers-page-tab">
                Liga
              </Link>
              <div className="swimmers-page-tab-pill" />
            </div>

            <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <div style={{ width: "100%", maxWidth: 800, display: "flex", justifyContent: "center" }}>
                  <button className="swimmers-back-button" onClick={() => navigate('/swimmers')}>
                  Zpět na databázi plavců
                </button>
              </div>
              <SwimmerDetailCard
                name={swimmerName}
                yearOfBirth={swimmer.yearOfBirth}
                gender={swimmer.gender}
                category={swimmer.category}
                rows={effectiveRows}
              />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};


