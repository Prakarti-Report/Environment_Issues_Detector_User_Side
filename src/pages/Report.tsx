import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { createReport } from '../services/reports';
import { detectPollution } from '../services/ai';
import type { NormalizedAiReport } from '../services/ai';
import { supabase } from '../lib/supabase';
import Auth from '../components/Auth';
import { Camera, CheckCircle, X, Loader2, Sparkles } from 'lucide-react';


const Report = () => {
  const [session, setSession] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [aiResult, setAiResult] = useState<NormalizedAiReport | null>(null);
  const [submitStep, setSubmitStep] = useState<'idle' | 'ai' | 'uploading' | 'done'>('idle');
  
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const handleCaptureClick = async () => {
    setErrorMsg('');
    setSuccess(false);

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        setStream(mediaStream);
        setShowCamera(true);
      } else {
        fileInputRef.current?.click();
      }
    } catch (err) {
      console.error("Camera access denied or unavailable", err);
      fileInputRef.current?.click();
    }
  };

  useEffect(() => {
    if (showCamera && videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [showCamera, stream]);

  const processFile = async (file: File) => {
    setSubmitting(true);
    setErrorMsg('');
    setAiResult(null);

    try {
      // 1. Get Location in parallel
      const locationPromise = new Promise<{lat: number, lng: number}>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error("Geolocation is not supported by this browser."));
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({ lat: position.coords.latitude, lng: position.coords.longitude });
          },
          (_error) => {
            reject(new Error("Could not get location. Please ensure location services are enabled."));
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      });

      // 2. Call AI Pollution Detection API
      setSubmitStep('ai');
      let aiReport: NormalizedAiReport | null = null;
      try {
        aiReport = await detectPollution(file);
        setAiResult(aiReport);
        console.log('AI Analysis complete:', aiReport);
      } catch (aiErr) {
        console.warn('AI Analysis failed or timed out:', aiErr);
      }

      // 3. Wait for location
      setSubmitStep('uploading');
      const location = await locationPromise;

      // 4. Submit complete report to Supabase
      const category = aiReport?.category || 'Environmental Hazard';
      const description = aiReport?.description || 'Environmental issue documented by citizen via camera.';
      const status = aiReport ? 'ai_analyzed' : 'reported';

      await createReport({
        category,
        description,
        latitude: location.lat,
        longitude: location.lng,
        location_accuracy: null,
        address: null,
        user_id: session.user.id,
        status,
        ai_category: aiReport?.ai_category || null,
        ai_confidence: aiReport?.ai_confidence ?? null,
        ai_description: aiReport?.ai_description || null,
        severity: aiReport?.severity || 'medium',
        organization_id: null,
        assigned_worker_id: null
      }, file);

      // 5. Show Success
      setSubmitStep('done');
      setSuccess(true);
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message || 'An error occurred during submission.');
      setSubmitStep('idle');
    } finally {
      setSubmitting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };


  const takePhotoFromStream = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
            stopCamera();
            processFile(file);
          }
        }, 'image/jpeg');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  if (!session) {
    return (
      <div className="container" style={{ padding: '4rem 1rem' }}>
        <Auth onAuth={() => {}} />
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '4rem 1rem', maxWidth: '600px', textAlign: 'center' }}>
      
      {showCamera ? (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={stopCamera} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>
              <X size={32} />
            </button>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
          <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center', backgroundColor: '#000' }}>
            <button 
              onClick={takePhotoFromStream}
              style={{ 
                width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'white', border: '4px solid #ccc', cursor: 'pointer' 
              }}
            />
          </div>
        </div>
      ) : success ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginTop: '2rem', maxWidth: '480px', margin: '2rem auto 0' }}>
          <CheckCircle size={72} color="var(--primary-color)" />
          <h2 style={{ color: 'var(--primary-color)', margin: 0 }}>Report Successfully Formed!</h2>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.95rem' }}>
            Your environmental report has been filed and verified with AI.
          </p>

          {aiResult && (
            <div style={{ width: '100%', marginTop: '1rem', padding: '1.25rem', backgroundColor: 'var(--accent-light)', borderRadius: '1rem', border: '1px solid var(--accent-color)', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, color: 'var(--primary-color)', fontSize: '1.05rem' }}>
                  <Sparkles size={18} />
                  AI Analysis Summary
                </div>
                {aiResult.severity && (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      backgroundColor: aiResult.severity === 'high' ? '#fee2e2' : aiResult.severity === 'medium' ? '#fef3c7' : '#dcfce7',
                      color: aiResult.severity === 'high' ? '#dc2626' : aiResult.severity === 'medium' ? '#b45309' : '#16a34a',
                      textTransform: 'uppercase',
                    }}
                  >
                    {aiResult.severity} Severity
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.9rem' }}>
                <div>
                  <strong style={{ color: 'var(--primary-color)' }}>Category:</strong> {aiResult.category}
                </div>

                {aiResult.ai_confidence !== null && (
                  <div>
                    <strong style={{ color: 'var(--primary-color)' }}>Confidence:</strong> {(aiResult.ai_confidence * 100).toFixed(1)}%
                    <div style={{ marginTop: '0.25rem', width: '100%', backgroundColor: 'rgba(0,0,0,0.08)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.min(100, Math.max(0, aiResult.ai_confidence * 100))}%`,
                          backgroundColor: 'var(--primary-color)',
                          borderRadius: '3px',
                        }}
                      />
                    </div>
                  </div>
                )}

                {aiResult.ai_description && (
                  <div style={{ marginTop: '0.25rem', color: 'var(--text-dark)', lineHeight: '1.4' }}>
                    {aiResult.ai_description}
                  </div>
                )}

                {aiResult.evidence && aiResult.evidence.length > 0 && (
                  <div style={{ marginTop: '0.4rem', backgroundColor: 'white', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid rgba(0,0,0,0.05)' }}>
                    <strong style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>
                      Key Visual Evidence:
                    </strong>
                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.82rem', color: 'var(--text-dark)' }}>
                      {aiResult.evidence.map((point, idx) => (
                        <li key={idx} style={{ marginBottom: '0.2rem' }}>{point}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', width: '100%', marginTop: '1.5rem' }}>
            <Link to="/my-reports" className="btn btn-primary" style={{ flex: 1, textDecoration: 'none', textAlign: 'center', padding: '0.75rem' }}>
              View in My Reports
            </Link>
            <button
              onClick={() => { setSuccess(false); setAiResult(null); setSubmitStep('idle'); }}
              className="btn btn-outline"
              style={{ flex: 1, padding: '0.75rem' }}
            >
              Report Another
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
          <h1 style={{ marginBottom: '1rem', color: 'var(--primary-color)' }}>Quick Report</h1>
          <p style={{ marginBottom: '3rem', color: 'var(--text-light)' }}>
            Tap the button below to snap a picture. We'll automatically fetch your location and report the issue.
          </p>
          
          <input 
            type="file" 
            accept="image/*" 
            capture="environment" 
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: 'none' }} 
          />

          <button 
            onClick={handleCaptureClick} 
            disabled={submitting} 
            className="btn btn-primary"
            style={{ 
              width: '200px', 
              height: '200px', 
              borderRadius: '50%', 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              justifyContent: 'center',
              gap: '1rem',
              fontSize: '1.25rem',
              boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
              opacity: submitting ? 0.8 : 1
            }}
          >
            {submitting ? <Loader2 size={64} style={{ animation: 'spin 1s linear infinite' }} /> : <Camera size={64} />}
            {submitStep === 'ai' ? 'Analyzing...' : submitStep === 'uploading' ? 'Saving...' : submitting ? 'Processing...' : 'Take Photo'}
          </button>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

          {errorMsg && (
            <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#ffebee', color: '#c62828', borderRadius: '8px', maxWidth: '400px' }}>
              {errorMsg}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Report;
