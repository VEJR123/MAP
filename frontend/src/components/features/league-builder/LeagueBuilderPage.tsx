import { Link } from "react-router-dom";
import "./LeagueBuilderPage.css";
import { PoolSelectorModal } from "../pool-selector/PoolSelectorModal";
import { useState } from "react";

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

            <div className="league-config-card">
              <h2 className="league-config-title">Liga</h2>
              <div className="league-config-divider" />

              <div className="league-chip-row">
                <button className="league-chip">50</button>
                <button className="league-chip">25</button>
              </div>

              <div className="league-chip-row">
                <button className="league-chip league-chip--pill">Ženy</button>
                <button className="league-chip league-chip--pill">Muži</button>
              </div>

              <div className="league-chip-row">
                <button className="league-chip league-chip--pill">A</button>
                <button className="league-chip league-chip--pill">B</button>
                <button className="league-chip league-chip--pill">C</button>
              </div>

              <div className="league-chip-row">
                <button className="league-chip league-chip--pill">24/25</button>
                <button className="league-chip league-chip--pill">23/24</button>
                <button className="league-chip league-chip--pill">22/23</button>
                <button className="league-chip league-chip--pill">21/22</button>
              </div>

              <div className="league-config-divider" />

              <div className="league-chip-row">
                <button
                  className="league-chip league-chip--primary"
                  type="button"
                  onClick={() => setIsPoolOpen(true)}
                >
                  Přidat plavce
                </button>
              </div>

              <div className="league-config-divider" />

              <div className="league-chip-row">
                <button className="league-chip league-chip--primary" type="button">
                  Vlatní nastavení
                </button>
              </div>

              <div className="league-config-divider" />

              <div className="league-chip-row">
                <button className="league-chip league-chip--primary" type="button">
                  Spočítat
                </button>
              </div>
            </div>

            <div className="league-results-grid">
              <section className="league-result-row">
                {/* Header row */}
                <div className="cell-header cell-header--best" style={{ gridColumn: 1, gridRow: 1 }}>
                  <ol className="league-result-best-list" start={1}>
                    <li>Nejlepší</li>
                  </ol>
                  <div className="league-result-best-underline" />
                </div>

                <div className="cell-header" style={{ gridColumn: 2, gridRow: 1 }}>1.</div>
                <div className="cell-header" style={{ gridColumn: 3, gridRow: 1 }}>2.</div>
                <div className="cell-header" style={{ gridColumn: 4, gridRow: 1 }}>Fina body</div>

                {/* Rows: each event renders 4 direct grid children (label + 3 pills) */}
                {EVENTS.map((event, idx) => (
                  <>
                    <p
                      key={`label-${idx}`}
                      className="cell-label"
                      style={{ gridColumn: 1, gridRow: idx + 2 }}
                    >
                      {event}
                    </p>

                    <div
                      key={`pb-${idx}`}
                      className="cell-pill cell-pill--pb"
                      style={{ gridColumn: 2, gridRow: idx + 2 }}
                    />

                    <div
                      key={`exp-${idx}`}
                      className="cell-pill cell-pill--expected"
                      style={{ gridColumn: 3, gridRow: idx + 2 }}
                    />

                    <div
                      key={`pts-${idx}`}
                      className="cell-pill cell-pill--points"
                      style={{ gridColumn: 4, gridRow: idx + 2 }}
                    />
                  </>
                ))}
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

      <PoolSelectorModal open={isPoolOpen} onClose={() => setIsPoolOpen(false)} />
    </div>
  );
};

