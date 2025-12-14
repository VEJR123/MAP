import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useSwimmersStore } from '@/stores/useSwimmersStore';
import './SwimmersPage.css';

const PAGE_SIZE = 9;

export const SwimmersPage = () => {
  const allSwimmers = useSwimmersStore((s) => s.swimmers);
  const { poolSize, setPoolSize } = useSwimmersStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const fetchSwimmers = useSwimmersStore((s) => s.fetch);
  const loading = useSwimmersStore((s) => s.loading);
  const error = useSwimmersStore((s) => s.error);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchSwimmers(1997);
  }, [fetchSwimmers]);

  const filteredSwimmers = useMemo(() => {
    return allSwimmers.filter(swimmer => {
      const fullName = `${swimmer.firstName} ${swimmer.newLastName || swimmer.lastName}`.toLowerCase();
      return fullName.includes(search.toLowerCase());
    });
  }, [allSwimmers, search]);

  const paginatedSwimmers = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    return filteredSwimmers.slice(start, end);
  }, [filteredSwimmers, page]);

  const totalPages = Math.ceil(filteredSwimmers.length / PAGE_SIZE);

  const handleNextPage = () => {
    setPage((p) => Math.min(p + 1, totalPages));
  };

  const handlePrevPage = () => {
    setPage((p) => Math.max(p - 1, 1));
  };

  const getPaginationItems = (currentPage: number, totalPages: number) => {
    const delta = 1; // how many pages to show around the current page
    const range = [];
    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      range.unshift("...");
    }
    if (currentPage + delta < totalPages - 1) {
      range.push("...");
    }

    range.unshift(1);
    if (totalPages > 1) {
      range.push(totalPages);
    }

    return range;
  };

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

            <div className="swimmers-page-controls">
              <div className="swimmers-page-search">
                <div className="swimmers-page-search-box">
                  <input
                    type="text"
                    placeholder="Hledat plavce..."
                    className="swimmers-page-search-input"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
              <button onClick={() => setSettingsOpen(true)} className="settings-button">
                Nastavení
              </button>
            </div>
          </div>

          {settingsOpen && (
            <div className="settings-panel">
              <div className="settings-panel-content">
                <h3>Nastavení</h3>
                <div className="pool-size-switcher">
                  <button
                    className={`pool-size-button ${poolSize === 25 ? 'active' : ''}`}
                    onClick={() => setPoolSize(25)}
                  >
                    25m bazén
                  </button>
                  <button
                    className={`pool-size-button ${poolSize === 50 ? 'active' : ''}`}
                    onClick={() => setPoolSize(50)}
                  >
                    50m bazén
                  </button>
                </div>
                <button onClick={() => setSettingsOpen(false)}>Zavřít</button>
              </div>
            </div>
          )}

          {loading && <p>Načítám plavce...</p>}
          {error && <p>Chyba při načítání dat: {error}</p>}

          {!loading && !error && (
            <>
              <div className="swimmers-page-grid">
                {paginatedSwimmers.map((swimmer) => (
                  <Link to={`/swimmers/${swimmer.id}`} key={swimmer.id} className="swimmers-page-card">
                    <div className="swimmers-page-card-header">
                      <div className="swimmers-page-card-name">
                        {swimmer.firstName} {swimmer.newLastName || swimmer.lastName}
                      </div>
                      <div className="swimmers-page-card-underline" />
                    </div>
                    <div className="swimmers-page-card-meta">
                      <span>Ročník: {swimmer.yearOfBirth}</span>
                      <span>Pohlaví: {swimmer.gender === 'M' ? 'Muž' : 'Žena'}</span>
                    </div>
                  </Link>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="swimmers-page-pagination">
                  <button onClick={handlePrevPage} disabled={page === 1}>
                    Předchozí
                  </button>
                  <div className="swimmers-page-pagination-pages">
                    {getPaginationItems(page, totalPages).map((p, i) => (
                      <div
                        key={i}
                        className={`swimmers-page-page-pill ${page === p ? 'swimmers-page-page-pill--active' : ''} ${p === '...' ? 'swimmers-page-page-ellipsis' : ''}`}
                        onClick={() => typeof p === 'number' && setPage(p)}
                      >
                        {p}
                      </div>
                    ))}
                  </div>
                  <button onClick={handleNextPage} disabled={page === totalPages}>
                    Další
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </main>

      <footer className="swimmers-page-footer">
        <div className="swimmers-page-footer-logo">
          {/* Placeholder for the logo image */}
        </div>
        <div className="swimmers-page-footer-text">
          TJ Bohemians Praha
        </div>
      </footer>
    </div>
  );
};
