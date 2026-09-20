import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getOrganizationNames } from '../services/orgBoard';
import type { OrgName } from '../services/orgBoard';
import { useLiveTables } from '../hooks/useLiveTables';
import { Link } from 'react-router-dom';
import { ORG_REGISTRATION_PATH } from '../config/links';
import { Building2, Sparkles, PlusCircle, ArrowRight, ShieldCheck, TreePine, Droplets, Globe } from 'lucide-react';

const ICONS = [Building2, ShieldCheck, TreePine, Droplets, Globe];

const OrgTaskBoard: React.FC = () => {
  const [orgs, setOrgs] = useState<OrgName[]>([]);
  const [loading, setLoading] = useState(true);
  const [highlightedIds, setHighlightedIds] = useState<Record<string, boolean>>({});

  const prevOrgIdsRef = useRef<Set<string>>(new Set());
  const hasLoadedRef = useRef(false);

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
          }, 3000);
        }
      }

      prevOrgIdsRef.current = new Set(data.map((o) => o.id));
      hasLoadedRef.current = true;
      setOrgs(data);
    } catch (err) {
      console.error('[OrgNames] Error loading organizations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Subscribe to table 'organizations' for realtime additions
  const liveStatus = useLiveTables(fetchData, ['organizations']);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Split into two rows for the moving marquee tracks
  const midpoint = Math.ceil(orgs.length / 2);
  const row1Orgs = orgs.slice(0, midpoint);
  const row2Orgs = orgs.slice(midpoint);

  // Helper to render an organization pill
  const renderOrgPill = (org: OrgName, index: number, isDuplicate = false) => {
    const isHighlighted = Boolean(highlightedIds[org.id]);
    const IconComponent = ICONS[index % ICONS.length];

    return (
      <div
        key={`${org.id}-${isDuplicate ? 'dup' : 'orig'}-${index}`}
        title={org.name}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.65rem',
          padding: '0.65rem 1.15rem',
          backgroundColor: isHighlighted ? '#ecfdf5' : '#ffffff',
          border: `1.5px solid ${isHighlighted ? '#10b981' : '#e2e8f0'}`,
          borderRadius: '9999px',
          boxShadow: isHighlighted
            ? '0 0 12px rgba(16, 185, 129, 0.35)'
            : '0 2px 8px rgba(0, 0, 0, 0.04)',
          whiteSpace: 'nowrap',
          userSelect: 'none',
          cursor: 'default',
          transition: 'all 0.3s ease',
        }}
      >
        <div
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            backgroundColor: isHighlighted ? '#d1fae5' : 'var(--accent-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary-color)',
            flexShrink: 0,
          }}
        >
          <IconComponent size={15} />
        </div>

        <span
          style={{
            fontSize: '0.92rem',
            fontWeight: 600,
            color: 'var(--text-dark)',
            letterSpacing: '-0.01em',
          }}
        >
          {org.name}
        </span>

        {isHighlighted ? (
          <span
            style={{
              fontSize: '0.68rem',
              fontWeight: 700,
              padding: '2px 7px',
              borderRadius: '9999px',
              backgroundColor: '#10b981',
              color: 'white',
              letterSpacing: '0.02em',
              textTransform: 'uppercase',
            }}
          >
            New
          </span>
        ) : (
          <span
            style={{
              fontSize: '0.68rem',
              fontWeight: 600,
              padding: '2px 7px',
              borderRadius: '9999px',
              backgroundColor: '#f1f5f9',
              color: '#475569',
              border: '1px solid #e2e8f0',
            }}
          >
            {org.isDbRecord ? 'Registered' : 'Partner NGO'}
          </span>
        )}
      </div>
    );
  };

  return (
    <section className="container" aria-label="Registered Organizations">
      {/* Section Header */}
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
        </div>

        {/* Live Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
              border: `1px solid ${liveStatus === 'live'
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
            {liveStatus === 'live' ? '● Live' : 'Connecting…'}
          </div>
        </div>
      </div>

      {/* Moving Organizations Showcase Box */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '1.25rem',
          border: '1px solid var(--border-color)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
          overflow: 'hidden',
          padding: '1.5rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        {/* Box Top Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0 0.75rem',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.82rem',
                fontWeight: 600,
                color: 'var(--primary-color)',
                backgroundColor: 'var(--accent-light)',
                padding: '4px 10px',
                borderRadius: '9999px',
              }}
            >
              <Building2 size={14} /> Registered Action Teams & NGOs
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              ({orgs.length} active organizations)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Hover over cards to pause
            </span>
            <Link
              to={ORG_REGISTRATION_PATH}
              className="btn btn-outline"
              style={{
                fontSize: '0.8rem',
                padding: '0.35rem 0.85rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                backgroundColor: '#ffffff',
                border: '1px solid var(--border-color)',
                color: 'var(--primary-color)',
                fontWeight: 600,
              }}
            >
              <PlusCircle size={14} /> Register Organization
            </Link>
          </div>
        </div>

        {/* Continuous Moving Track Container with gradient fade overlay */}
        <div className="ef-marquee-container" style={{ padding: '0.5rem 0' }}>
          <div className="ef-marquee-fade-overlay" />

          {loading ? (
            /* Loading skeletons */
            <div style={{ display: 'flex', gap: '1rem', padding: '0.5rem 0' }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <div
                  key={n}
                  style={{
                    height: '42px',
                    width: '220px',
                    backgroundColor: '#f1f5f9',
                    borderRadius: '9999px',
                    flexShrink: 0,
                    opacity: 0.6,
                  }}
                />
              ))}
            </div>
          ) : (
            <>
              {/* Row 1: Scrolling Left */}
              <div className="ef-marquee-track-left">
                {row1Orgs.map((org, idx) => renderOrgPill(org, idx, false))}
                {/* Duplicate set for seamless continuous loop */}
                {row1Orgs.map((org, idx) => renderOrgPill(org, idx, true))}
              </div>

              {/* Row 2: Scrolling Right */}
              {row2Orgs.length > 0 && (
                <div className="ef-marquee-track-right" style={{ marginTop: '0.5rem' }}>
                  {row2Orgs.map((org, idx) => renderOrgPill(org, idx, false))}
                  {/* Duplicate set for seamless continuous loop */}
                  {row2Orgs.map((org, idx) => renderOrgPill(org, idx, true))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Box Bottom Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid #f1f5f9',
            paddingTop: '0.75rem',
            paddingLeft: '0.75rem',
            paddingRight: '0.75rem',
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Sparkles size={13} color="var(--accent-color)" />
            <span>All registered organizations continuously rotate in view</span>
          </div>

          <Link
            to={ORG_REGISTRATION_PATH}
            style={{
              color: 'var(--primary-color)',
              fontWeight: 600,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
            }}
          >
            Want your environmental team listed here? Register now <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default OrgTaskBoard;
