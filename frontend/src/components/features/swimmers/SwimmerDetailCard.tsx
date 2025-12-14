import React from "react";
import "./SwimmerDetailCard.css";
import { formatMs } from "@/core/utils";

type SwimmerDisciplineRow = {
  event: string;
  personalBest?: string; // formatted or string
  expectedTime?: string;
  personalBestMs?: number | undefined;
  expectedTimeMs?: number | undefined;
};

interface SwimmerDetailCardProps {
  name: string;
  yearOfBirth?: number;
  gender?: string;
  category?: string;
  rows: SwimmerDisciplineRow[];
}

export const SwimmerDetailCard = ({ name, yearOfBirth, gender, category, rows }: SwimmerDetailCardProps) => {
  const genderLabel = gender === 'M' ? 'muž' : gender === 'F' ? 'žena' : undefined;

  return (
    <section className="swimmer-card" aria-label={`Osobní rekordy plavce ${name}`}>
      {/* header row */}
      <div className="swimmer-card-name" style={{ gridColumn: '1 / 2', gridRow: 1 }}>{name}</div>
      <div className="swimmer-card-name-underline" style={{ gridColumn: '1 / 2', gridRow: 1, alignSelf: 'end' }} />
      <div className="swimmer-card-col-title" style={{ gridColumn: '2 / 3', gridRow: 1, justifySelf: 'center' }}>Osobní rekord</div>
      <div className="swimmer-card-col-title" style={{ gridColumn: '3 / 4', gridRow: 1, justifySelf: 'center' }}>Očekávaný čas</div>

      {/* rows start at grid row 2 */}
      {(() => {
        const maxExpected = Math.max(...rows.map((r) => r.expectedTimeMs || 0), 1);
        return rows.map((row, idx) => {
          const gridRow = idx + 2; // start at row 2
          const pct = row.expectedTimeMs ? Math.max(6, Math.round((row.expectedTimeMs / maxExpected) * 100)) : 6;
          return (
            <React.Fragment key={`row-${idx}-${row.event}`}>
              <div className="swimmer-card-event" style={{ gridColumn: '1 / 2', gridRow }}>{row.event}</div>
              <div className="swimmer-card-value" style={{ gridColumn: '2 / 3', gridRow, justifySelf: 'center' }}>
                {row.personalBestMs ? <div className="swimmer-pill">{formatMs(row.personalBestMs)}</div> : <div className="swimmer-pill swimmer-pill--empty">—</div>}
              </div>
              <div className="swimmer-card-value" style={{ gridColumn: '3 / 4', gridRow }}>
                <div className="swimmer-bar-container"><div className="swimmer-bar" style={{ width: `${pct}%` }} /></div>
              </div>
            </React.Fragment>
          );
        });
      })()}
    </section>
  );
};


