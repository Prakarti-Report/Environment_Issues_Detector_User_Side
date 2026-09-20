import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { signOut } from '../services/auth';
import {
  isOrganizationNameAvailable,
  registerOrganization,
  friendlyOrgRegisterError,
} from '../services/organizations';
import { Building2, ArrowLeft, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { ORG_DASHBOARD_URL } from '../config/links';

const RegisterOrganization: React.FC = () => {
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [memberCount, setMemberCount] = useState('1');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [honeypot, setHoneypot] = useState('');

  // Field validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isCheckingName, setIsCheckingName] = useState(false);

  // Submission state
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [registeredOrgName, setRegisteredOrgName] = useState<string | null>(null);
  const [requiresEmailConfirm, setRequiresEmailConfirm] = useState(false);

  // Check current session
  useEffect(() => {
    let isMounted = true;
    if (!supabase) {
      setCheckingSession(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted) {
        setCurrentUserEmail(session?.user?.email || null);
        setCheckingSession(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setCurrentUserEmail(session?.user?.email || null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await signOut();
      setCurrentUserEmail(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleNameBlur = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 3) return;

    setIsCheckingName(true);
    try {
      const available = await isOrganizationNameAvailable(trimmed);
      if (!available) {
        setErrors((prev) => ({ ...prev, name: 'This name is already registered.' }));
      } else {
        setErrors((prev) => {
          const next = { ...prev };
          delete next.name;
          return next;
        });
      }
    } catch {
      // Ignore network errors on blur
    } finally {
      setIsCheckingName(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const countNum = parseInt(memberCount, 10);

    if (!trimmedName || trimmedName.length < 3 || trimmedName.length > 80) {
      newErrors.name = 'Organization name must be between 3 and 80 characters.';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (isNaN(countNum) || countNum < 1 || countNum > 10000) {
      newErrors.memberCount = 'Team size must be between 1 and 10,000.';
    }

    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
    if (!password || !passwordRegex.test(password)) {
      newErrors.password = 'Password must be at least 8 characters with at least one letter and one number.';
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // Honeypot check
    if (honeypot.trim() !== '') {
      setRegisteredOrgName(name.trim() || 'Organization');
      return;
    }

    if (!validate()) return;

    setLoading(true);
    try {
      const data = await registerOrganization({
        name: name.trim(),
        email: email.trim(),
        password,
        memberCount: parseInt(memberCount, 10) || 1,
      });

      // Check if user identity is empty (Supabase enumeration protection flag)
      if (data.user?.identities && data.user.identities.length === 0) {
        setSubmitError('An account with this email already exists.');
        setLoading(false);
        return;
      }

      // Success! If session exists, sign out so registration does not leave them logged in as citizen
      if (data.session && supabase) {
        await supabase.auth.signOut();
      }

      setRequiresEmailConfirm(!data.session);
      setRegisteredOrgName(name.trim());
    } catch (err: any) {
      const friendly = friendlyOrgRegisterError(err);
      setSubmitError(friendly);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ padding: '3rem 1rem', maxWidth: '520px', margin: '0 auto' }}>
      <Link
        to="/"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          color: 'var(--primary-color)',
          textDecoration: 'none',
          fontSize: '0.85rem',
          fontWeight: 500,
          marginBottom: '1.25rem',
        }}
      >
        <ArrowLeft size={15} /> Back to home
      </Link>

      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '1rem',
          border: '1px solid var(--border-color)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
          padding: '2rem',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'var(--accent-light)',
              color: 'var(--primary-color)',
              marginBottom: '0.75rem',
            }}
          >
            <Building2 size={24} />
          </div>
          <h1 style={{ fontSize: '1.5rem', color: 'var(--primary-color)', margin: '0 0 0.4rem 0' }}>
            Register your Organization
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
            Join PRAKARTI REPORT and get assigned real reports from citizens.
          </p>
        </div>

        {/* Existing Session Alert */}
        {!checkingSession && currentUserEmail && !registeredOrgName && (
          <div
            style={{
              backgroundColor: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: '0.5rem',
              padding: '1rem',
              marginBottom: '1.5rem',
              fontSize: '0.85rem',
              color: '#92400e',
            }}
          >
            <p style={{ margin: '0 0 0.75rem 0', lineHeight: 1.4 }}>
              You are currently logged in as <strong>{currentUserEmail}</strong>. Please log out before registering a new organization account.
            </p>
            <button
              type="button"
              onClick={handleLogout}
              className="btn btn-outline"
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.8rem' }}
            >
              Log out
            </button>
          </div>
        )}

        {/* Success Card */}
        {registeredOrgName ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <CheckCircle2 size={48} color="var(--primary-color)" style={{ marginBottom: '1rem' }} />
            <h2 style={{ fontSize: '1.3rem', color: 'var(--primary-color)', marginBottom: '0.5rem' }}>
              Registration successful!
            </h2>
            <p style={{ color: 'var(--text-dark)', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '1rem' }}>
              <strong>{registeredOrgName}</strong> is now on PRAKARTI REPORT. You can log in with your email and password.
            </p>

            {requiresEmailConfirm && (
              <p
                style={{
                  backgroundColor: 'var(--accent-light)',
                  color: 'var(--primary-color)',
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.85rem',
                  marginBottom: '1.5rem',
                }}
              >
                Please confirm your email — we sent you a verification link.
              </p>
            )}

            <div style={{ marginTop: '1.5rem' }}>
              <a
                href={ORG_DASHBOARD_URL}
                className="btn btn-primary"
                style={{ textDecoration: 'none', display: 'inline-block' }}
              >
                Go to Dashboard
              </a>
            </div>
          </div>
        ) : (
          /* Registration Form */
          <form onSubmit={handleSubmit} noValidate>
            {/* Honeypot */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              style={{ display: 'none' }}
            />

            {/* Error Banner */}
            {submitError && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: '#ffebee',
                  color: '#c62828',
                  border: '1px solid #ffcdd2',
                  padding: '0.75rem 1rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.85rem',
                  marginBottom: '1.25rem',
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{submitError}</span>
              </div>
            )}

            {/* Organization Name */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
                Organization Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
                }}
                onBlur={handleNameBlur}
                placeholder="e.g. Clean Green Action Team"
                disabled={loading || Boolean(currentUserEmail)}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.8rem',
                  borderRadius: '0.5rem',
                  border: `1px solid ${errors.name ? '#dc2626' : 'var(--border-color)'}`,
                  fontSize: '0.9rem',
                  boxSizing: 'border-box',
                }}
              />
              {isCheckingName && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>
                  Checking availability…
                </span>
              )}
              {errors.name && (
                <span style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.25rem', display: 'block' }}>
                  {errors.name}
                </span>
              )}
            </div>

            {/* Email */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
                Official Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                }}
                placeholder="contact@organization.org"
                disabled={loading || Boolean(currentUserEmail)}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.8rem',
                  borderRadius: '0.5rem',
                  border: `1px solid ${errors.email ? '#dc2626' : 'var(--border-color)'}`,
                  fontSize: '0.9rem',
                  boxSizing: 'border-box',
                }}
              />
              {errors.email && (
                <span style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.25rem', display: 'block' }}>
                  {errors.email}
                </span>
              )}
            </div>

            {/* Team Size */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
                Team Size (Members)
              </label>
              <input
                type="number"
                min="1"
                max="10000"
                value={memberCount}
                onChange={(e) => {
                  setMemberCount(e.target.value);
                  if (errors.memberCount) setErrors((prev) => ({ ...prev, memberCount: '' }));
                }}
                disabled={loading || Boolean(currentUserEmail)}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.8rem',
                  borderRadius: '0.5rem',
                  border: `1px solid ${errors.memberCount ? '#dc2626' : 'var(--border-color)'}`,
                  fontSize: '0.9rem',
                  boxSizing: 'border-box',
                }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>
                Estimated active members (1 – 10,000).
              </span>
              {errors.memberCount && (
                <span style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.25rem', display: 'block' }}>
                  {errors.memberCount}
                </span>
              )}
            </div>

            {/* Password */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
                  }}
                  placeholder="Minimum 8 characters"
                  disabled={loading || Boolean(currentUserEmail)}
                  style={{
                    width: '100%',
                    padding: '0.6rem 2.4rem 0.6rem 0.8rem',
                    borderRadius: '0.5rem',
                    border: `1px solid ${errors.password ? '#dc2626' : 'var(--border-color)'}`,
                    fontSize: '0.9rem',
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '0.6rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '0.2rem',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>
                Must be at least 8 characters with at least one letter and one number.
              </span>
              {errors.password && (
                <span style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.25rem', display: 'block' }}>
                  {errors.password}
                </span>
              )}
            </div>

            {/* Confirm Password */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
                Confirm Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: '' }));
                  }}
                  placeholder="Repeat password"
                  disabled={loading || Boolean(currentUserEmail)}
                  style={{
                    width: '100%',
                    padding: '0.6rem 2.4rem 0.6rem 0.8rem',
                    borderRadius: '0.5rem',
                    border: `1px solid ${errors.confirmPassword ? '#dc2626' : 'var(--border-color)'}`,
                    fontSize: '0.9rem',
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: 'absolute',
                    right: '0.6rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '0.2rem',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <span style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.25rem', display: 'block' }}>
                  {errors.confirmPassword}
                </span>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || Boolean(currentUserEmail)}
              style={{ width: '100%', padding: '0.75rem' }}
            >
              {loading ? 'Registering…' : 'Register Organization'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default RegisterOrganization;
