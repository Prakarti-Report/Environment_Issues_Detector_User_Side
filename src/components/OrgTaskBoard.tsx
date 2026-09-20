import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getOrganizationNames } from '../services/orgBoard';
import type { OrgName } from '../services/orgBoard';
import { useLiveTables } from '../hooks/useLiveTables';
import { Link } from 'react-router-dom';
import { ORG_REGISTRATION_PATH } from '../config/links';
import { Building2, Users, AlertCircle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

const INITIAL_VISIBLE_COUNT = 12;

const OrgTaskBoard: React.FC = () => {
  const [orgs, setOrgs] = useState<OrgName[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<{ code?: string; message: string } | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [highlightedIds, setHighlightedIds] = useState<Record<string, boolean>>({});

  const prevOrgIdsRef = useRef<Set<string>>(new Set());
  const hasLoadedRef = useRef(false);
  const hasAutoRetriedRef = useRef(false);
  const autoRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchDataRef = useRef<() => void>(() => {});

  const fetchData = useCallback(async () => {
    try {
      const data = await getOrganizationNames();

      // Highlight newly added organizations (not on first load)
      if (hasLoadedRef.current) {
        const newlyAdded: Record<string, boolean> = {};
        data.forEach((org) => {
          if (!prevOrgIdsRef.current.has(org.id)) {
            newlyAdded[org.id] = true;
          }
        });

        if (Object.keys(newlyAdded).length > 0) {
          setHighlightedIds((prev) => ({ ...prev, ...newlyAdded }));
          setTimeout(() => {
            setHighlightedIds((current) => {
              const updated = { ...current };
              Object.keys(newlyAdded).forEach((id) => delete updated[id]);
              return updated;
            });
          }, 1500);
        }
      }

      prevOrgIdsRef.current = new Set(data.map((o) => o.id));
      hasLoadedRef.current = true;
      hasAutoRetriedRef.current = false;

      setOrgs(data);
      setError(null);
      setErrorDetail(null);
    } catch (err: any) {
      console.error('[OrgNames] Error loading organizations:', {
        code: err?.code,
        message: err?.message || String(err),
        details: err?.details,
        hint: err?.hint,
      });

      setError('Couldn’t load live task board.');
      setErrorDetail({
        code: err?.code,
        message: err?.message || String(err),
      });

      // Auto-retry once after 5s on failure
      if (!hasAutoRetriedRef.current) {
        hasAutoRetriedRef.current = true;
        if (autoRetryTimerRef.current) clearTimeout(autoRetryTimerRef.current);
        autoRetryTimerRef.current = setTimeout(() => {
          fetchDataRef.current();
        }, 5000);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDataRef.current = fetchData;
  });

  // Subscribe to table 'organizations' only
  const liveStatus = useLiveTables(fetchData, ['organizations']);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    return () => {
      if (autoRetryTimerRef.current) {
        clearTimeout(autoRetryTimerRef.current);
      }
    };
  }, []);

  const handleManualRetry = () => {
    hasAutoRetriedRef.current = false;
    if (autoRetryTimerRef.current) {
      clearTimeout(autoRetryTimerRef.current);
    }
    setLoading(true);
    fetchData();
  };

  const visibleOrgs = showAll ? orgs : orgs.slice(0, INITIAL_VISIBLE_COUNT);

  return (
    <section className="container" aria-label="Registered Organizations">
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '1.25rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.75rem', color: 'var(--primary-color)', margin: 0 }}>
            Who's Working On What
          </h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem', marginBottom: 0 }}>
            Organizations and teams on the Earth Forward platform — updated live.
          </p>
          {!loading && !error && orgs.length > 0 && (
            <span
              style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--accent-color)',
                marginTop: '0.4rem',
                display: 'inline-block',
              }}
            >
              {orgs.length} organization{orgs.length !== 1 ? 's' : ''} registered
            </span>
          )}
        </div>

        {/* Live Pill with aria-live and data not refreshing hint */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div
            aria-live="polite"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '4px 12px',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 600,
              backgroundColor:
                liveStatus === 'live'
                  ? '#dcfce7'
                  : liveStatus === 'polling'
                  ? '#fef3c7'
                  : '#f3f4f6',
              color:
                liveStatus === 'live'
                  ? '#166534'
                  : liveStatus === 'polling'
                  ? '#92400e'
                  : '#4b5563',
              border: `1px solid ${
                liveStatus === 'live'
                  ? '#86efac'
                  : liveStatus === 'polling'
                  ? '#fde68a'
                  : '#e5e7eb'
              }`,
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor:
                  liveStatus === 'live'
                    ? '#16a34a'
                    : liveStatus === 'polling'
                    ? '#d97706'
                    : '#9ca3af',
                boxShadow: liveStatus === 'live' ? '0 0 6px #16a34a' : 'none',
              }}
            />
            {liveStatus === 'live'
              ? '● Live'
              : liveStatus === 'polling'
              ? '● Live (30 s)'
              : 'Connecting…'}
          </div>

          {error && (
            <span
              style={{
                fontSize: '0.75rem',
                color: '#b45309',
                backgroundColor: '#fef3c7',
                padding: '2px 8px',
                borderRadius: '8px',
                border: '1px solid #fde68a',
                fontStyle: 'italic',
              }}
            >
              data not refreshing
            </span>
          )}
        </div>
      </div>

      {/* States: Loading, Error, Empty, or Compact Cards Grid */}
      {loading ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '1rem',
          }}
        >
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              style={{
                backgroundColor: 'white',
                borderRadius: '0.75rem',
                border: '1px solid var(--border-color)',
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                opacity: 0.6,
              }}
            >
              <div style={{ width: '16px', height: '16px', backgroundColor: '#e2e8f0', borderRadius: '4px' }} />
              <div style={{ height: '14px', backgroundColor: '#e2e8f0', borderRadius: '4px', flex: 1 }} />
            </div>
          ))}
        </div>
      ) : error ? (
        <div
          style={{
            backgroundColor: '#fff',
            borderRadius: '1rem',
            border: '1px solid #fecaca',
            padding: '2.5rem',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}
        >
          <AlertCircle size={36} color="#dc2626" style={{ marginBottom: '0.75rem' }} />
          <p style={{ color: '#991b1b', fontWeight: 600, margin: '0 0 0.5rem 0' }}>{error}</p>

          {import.meta.env.DEV && errorDetail && (
            <p
              style={{
                fontFamily: 'monospace',
                fontSize: '0.8rem',
                color: '#7f1d1d',
                backgroundColor: '#fef2f2',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.4rem',
                display: 'inline-block',
                maxWidth: '100%',
                overflowX: 'auto',
                margin: '0.5rem auto 1.25rem auto',
                border: '1px solid #fee2e2',
              }}
            >
              {errorDetail.code ? `${errorDetail.code} · ` : ''}
              {errorDetail.message}
            </p>
          )}

          <div style={{ marginTop: import.meta.env.DEV && errorDetail ? '0' : '1rem' }}>
            <button
              onClick={handleManualRetry}
              className="btn btn-outline"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <RefreshCw size={14} /> Retry
            </button>
          </div>
        </div>
      ) : orgs.length === 0 ? (
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '1rem',
            border: '1px solid var(--border-color)',
            padding: '3rem 2rem',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}
        >
          <Users size={40} style={{ opacity: 0.4, marginBottom: '0.75rem' }} />
          <h3 style={{ fontSize: '1.15rem', color: 'var(--primary-color)', marginBottom: '0.5rem' }}>
            No organizations have registered yet.
          </h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
            Get your environmental action team or NGO on the board.
          </p>
          <Link
            to={ORG_REGISTRATION_PATH}
            className="btn btn-primary"
            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            Register Organization
          </Link>
        </div>
      ) : (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '1rem',
            }}
          >
            {visibleOrgs.map((org) => {
              const isHighlighted = Boolean(highlightedIds[org.id]);

              return (
                <div
                  key={org.id}
                  title={org.name}
                  style={{
                    backgroundColor: isHighlighted ? '#ecfdf5' : 'white',
                    border: `1px solid ${isHighlighted ? '#86efac' : 'var(--border-color)'}`,
                    borderRadius: '0.75rem',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    transition: 'background-color 1.5s ease, border-color 1.5s ease',
                    minWidth: 0,
                  }}
                >
                  <Building2
                    size={16}
                    color="var(--accent-color)"
                    style={{ flexShrink: 0 }}
                  />
                  <span
                    style={{
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      color: 'var(--text-dark)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {org.name}
                  </span>
                </div>
              );
            })}
          </div>

          {orgs.length > INITIAL_VISIBLE_COUNT && (
            <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
              <button
                onClick={() => setShowAll(!showAll)}
                className="btn btn-outline"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.85rem',
                  padding: '0.45rem 1rem',
                }}
              >
                {showAll ? (
                  <>
                    <ChevronUp size={14} /> Show less
                  </>
                ) : (
                  <>
                    <ChevronDown size={14} /> Show all ({orgs.length})
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default OrgTaskBoard;
