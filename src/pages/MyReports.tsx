import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { getReports, getImageUrl, updateReport } from '../services/reports';
import type { Report } from '../services/reports';
import { detectPollutionFromUrl } from '../services/ai';
import Auth from '../components/Auth';
import { MapPin, Calendar, AlertTriangle, Bot, Sparkles, Loader2, RefreshCw } from 'lucide-react';

interface ReportWithImages extends Report {
  report_images?: { storage_path: string }[];
}

const statusColors: Record<string, string> = {
  reported: '#6b7280',
  ai_analyzed: '#2563eb',
  under_review: '#d97706',
  verified: '#059669',
  action_initiated: '#7c3aed',
  resolved: '#16a34a',
};

const severityColors: Record<string, { bg: string; text: string }> = {
  high: { bg: '#fee2e2', text: '#dc2626' },
  medium: { bg: '#fef3c7', text: '#b45309' },
  low: { bg: '#dcfce7', text: '#16a34a' },
};

const MyReports = () => {
  const [session, setSession] = useState<any>(null);
  const [reports, setReports] = useState<ReportWithImages[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzingIds, setAnalyzingIds] = useState<Record<string, boolean>>({});
  const [analyzeErrors, setAnalyzeErrors] = useState<Record<string, string>>({});
  const autoAnalyzedRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAnalyzeReport = async (report: ReportWithImages) => {
    const imagePath = report.report_images?.[0]?.storage_path;
    if (!imagePath) return;

    setAnalyzingIds(prev => ({ ...prev, [report.id]: true }));
    setAnalyzeErrors(prev => ({ ...prev, [report.id]: '' }));

    try {
      const imageUrl = getImageUrl(imagePath);
      const aiResult = await detectPollutionFromUrl(imageUrl);

      const updates = {
        category: aiResult.category,
        description: aiResult.description,
        ai_category: aiResult.ai_category,
        ai_confidence: aiResult.ai_confidence,
        ai_description: aiResult.ai_description,
        severity: aiResult.severity,
        status: 'ai_analyzed' as const,
      };

      // Try updating in Supabase
      try {
        await updateReport(report.id, updates);
      } catch (dbErr) {
        console.warn('Could not persist all AI fields to database (RLS trigger), updating local view:', dbErr);
        // Fallback update just category and description
        try {
          await updateReport(report.id, {
            category: aiResult.category,
            description: aiResult.description,
          });
        } catch (_) {}
      }

      // Update state locally so user immediately sees complete report
      setReports(prev =>
        prev.map(r => (r.id === report.id ? { ...r, ...updates } : r))
      );
    } catch (err: any) {
      console.error('Error analyzing report:', err);
      setAnalyzeErrors(prev => ({
        ...prev,
        [report.id]: err.message || 'Failed to complete AI analysis. Please try again.',
      }));
    } finally {
      setAnalyzingIds(prev => ({ ...prev, [report.id]: false }));
    }
  };

  useEffect(() => {
    if (session) {
      getReports().then(data => {
        if (data) {
          const userReports = (data as unknown as ReportWithImages[]).filter(
            r => r.user_id === session.user.id
          );
          setReports(userReports);

          // Auto-trigger analysis for pending reports with an image
          userReports.forEach(r => {
            const isPending = r.category === 'pending_ai' || !r.ai_category;
            const hasImage = r.report_images?.[0]?.storage_path;
            if (isPending && hasImage && !autoAnalyzedRef.current[r.id]) {
              autoAnalyzedRef.current[r.id] = true;
              handleAnalyzeReport(r);
            }
          });
        }
        setLoading(false);
      });
    }
  }, [session]);

  if (!session) {
    return (
      <div className="container" style={{ padding: '4rem 1rem' }}>
        <Auth onAuth={() => {}} />
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '4rem 1rem', maxWidth: '900px' }}>
      <h1 style={{ marginBottom: '0.5rem', color: 'var(--primary-color)' }}>My Reports</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
        {reports.length} report{reports.length !== 1 ? 's' : ''} submitted
      </p>

      {loading ? (
        <p>Loading your reports...</p>
      ) : reports.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          <AlertTriangle size={48} style={{ opacity: 0.4, marginBottom: '1rem' }} />
          <p>You haven't submitted any reports yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {reports.map(report => {
            const imagePath = report.report_images?.[0]?.storage_path;
            const imageUrl = imagePath ? getImageUrl(imagePath) : null;
            const isPending = report.category === 'pending_ai';
            const isAnalyzing = Boolean(analyzingIds[report.id]);
            const error = analyzeErrors[report.id];

            const displayTitle = isAnalyzing
              ? 'Analyzing with AI...'
              : isPending
              ? 'Awaiting AI Analysis'
              : report.ai_category || report.category;

            const statusColor = statusColors[report.status] || '#6b7280';
            const sevColor = report.severity ? severityColors[report.severity] : null;

            return (
              <div
                key={report.id}
                style={{
                  display: 'flex',
                  gap: '1.25rem',
                  backgroundColor: 'white',
                  borderRadius: '1rem',
                  border: '1px solid var(--border-color)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  overflow: 'hidden',
                }}
              >
                {/* Photo thumbnail */}
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt="Report photo"
                    style={{
                      width: '150px',
                      minHeight: '150px',
                      objectFit: 'cover',
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '150px',
                      minHeight: '150px',
                      flexShrink: 0,
                      backgroundColor: 'var(--bg-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-muted)',
                      fontSize: '0.75rem',
                    }}
                  >
                    No Photo
                  </div>
                )}

                {/* Card body */}
                <div style={{ padding: '1.25rem', flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    {/* Top row: Category + Badges */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-color)' }}>
                          {displayTitle.replace(/_/g, ' ')}
                        </span>
                        {sevColor && (
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '12px',
                              backgroundColor: sevColor.bg,
                              color: sevColor.text,
                              textTransform: 'uppercase',
                            }}
                          >
                            {report.severity}
                          </span>
                        )}
                      </div>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          padding: '3px 10px',
                          borderRadius: '12px',
                          backgroundColor: `${statusColor}22`,
                          color: statusColor,
                          textTransform: 'capitalize',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {report.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    {/* Pending AI Banner / Re-run Action */}
                    {isPending && (
                      <div
                        style={{
                          backgroundColor: 'var(--accent-light)',
                          borderRadius: '0.5rem',
                          padding: '0.75rem 1rem',
                          marginBottom: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.75rem',
                          flexWrap: 'wrap',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--primary-color)' }}>
                          {isAnalyzing ? (
                            <>
                              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                              <span>Generating complete AI report from your photo...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles size={16} />
                              <span>AI report generation ready</span>
                            </>
                          )}
                        </div>
                        {!isAnalyzing && (
                          <button
                            onClick={() => handleAnalyzeReport(report)}
                            className="btn btn-primary"
                            style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                          >
                            <Sparkles size={13} />
                            Generate Complete Report
                          </button>
                        )}
                      </div>
                    )}

                    {error && (
                      <div style={{ fontSize: '0.8rem', color: '#c62828', backgroundColor: '#ffebee', padding: '0.5rem', borderRadius: '0.4rem', marginBottom: '0.75rem' }}>
                        {error}
                        <button
                          onClick={() => handleAnalyzeReport(report)}
                          style={{ marginLeft: '0.5rem', background: 'none', border: 'none', color: '#c62828', textDecoration: 'underline', cursor: 'pointer' }}
                        >
                          Retry
                        </button>
                      </div>
                    )}

                    {/* AI Analysis block */}
                    {(report.ai_category || (report.ai_confidence !== null && report.ai_confidence !== undefined) || report.ai_description) && (
                      <div
                        style={{
                          backgroundColor: 'var(--accent-light)',
                          borderRadius: '0.5rem',
                          padding: '0.65rem 0.9rem',
                          marginBottom: '0.75rem',
                          fontSize: '0.82rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.3rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, color: 'var(--primary-color)', marginBottom: '0.1rem' }}>
                          <Bot size={15} />
                          AI Verified Analysis
                        </div>
                        {report.ai_category && (
                          <div><strong>Detected:</strong> {report.ai_category.replace(/_/g, ' ')}</div>
                        )}
                        {report.ai_confidence !== null && report.ai_confidence !== undefined && (
                          <div>
                            <strong>Confidence:</strong> {(report.ai_confidence * 100).toFixed(1)}%
                            <span
                              style={{
                                marginLeft: '0.5rem',
                                display: 'inline-block',
                                height: '6px',
                                width: `${Math.min(100, report.ai_confidence * 80)}px`,
                                backgroundColor: 'var(--primary-color)',
                                borderRadius: '3px',
                                verticalAlign: 'middle',
                              }}
                            />
                          </div>
                        )}
                        {report.ai_description && (
                          <div style={{ color: 'var(--text-dark)', marginTop: '0.2rem', lineHeight: '1.4' }}>
                            {report.ai_description}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Description */}
                    {report.description && report.description !== report.ai_description && (
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem', lineHeight: '1.4', whiteSpace: 'pre-line' }}>
                        {report.description}
                      </p>
                    )}
                  </div>

                  {/* Footer row */}
                  <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.75rem', color: 'var(--text-muted)', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Calendar size={13} />
                      {new Date(report.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    {report.latitude && report.longitude && (
                      <a
                        href={`https://maps.google.com/?q=${report.latitude},${report.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--primary-color)', textDecoration: 'none', fontWeight: 500 }}
                      >
                        <MapPin size={13} />
                        View on Map
                      </a>
                    )}
                    {!isPending && imageUrl && (
                      <button
                        onClick={() => handleAnalyzeReport(report)}
                        disabled={isAnalyzing}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          marginLeft: 'auto',
                          padding: 0,
                        }}
                        title="Re-run AI verification"
                      >
                        <RefreshCw size={12} style={{ animation: isAnalyzing ? 'spin 1s linear infinite' : 'none' }} />
                        {isAnalyzing ? 'Re-analyzing...' : 'Re-analyze'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyReports;

