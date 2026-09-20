import React, { useState } from 'react';
import { logIn, signUp, friendlyAuthError } from '../services/auth';

interface AuthFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  initialMode?: 'login' | 'signup';
}

const AuthForm: React.FC<AuthFormProps> = ({
  onSuccess,
  onCancel,
  initialMode = 'login',
}) => {
  const [isLogin, setIsLogin] = useState(initialMode !== 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // Client-side validations
    const emailTrimmed = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrimmed)) {
      setMessage({ type: 'error', text: 'Please enter a valid email address.' });
      return;
    }

    if (password.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters.' });
      return;
    }

    if (!isLogin) {
      if (!name.trim()) {
        setMessage({ type: 'error', text: 'Full name is required.' });
        return;
      }
      if (!gender) {
        setMessage({ type: 'error', text: 'Please select a gender.' });
        return;
      }
    }

    setLoading(true);
    try {
      if (isLogin) {
        await logIn(emailTrimmed, password);
        onSuccess?.();
      } else {
        const data = await signUp({
          email: emailTrimmed,
          password,
          fullName: name,
          gender,
        });

        if (data?.session) {
          onSuccess?.();
        } else {
          setMessage({
            type: 'success',
            text: 'Account created. Check your email to confirm, then log in.',
          });
          setIsLogin(true);
          setPassword('');
        }
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: friendlyAuthError(err) });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMode = () => {
    setIsLogin(!isLogin);
    setMessage(null);
  };

  return (
    <div style={{ width: '100%' }}>
      <h2 style={{ marginBottom: '1.5rem', color: 'var(--primary-color)' }}>
        {isLogin ? 'Log In' : 'Sign Up'}
      </h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {!isLogin && (
          <>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                required
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border-color)',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border-color)',
                  boxSizing: 'border-box',
                }}
              >
                <option value="" disabled>Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="non-binary">Non-binary</option>
                <option value="prefer-not-to-say">Prefer not to say</option>
              </select>
            </div>
          </>
        )}

        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            style={{
              width: '100%',
              padding: '0.5rem',
              borderRadius: '0.5rem',
              border: '1px solid var(--border-color)',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            required
            style={{
              width: '100%',
              padding: '0.5rem',
              borderRadius: '0.5rem',
              border: '1px solid var(--border-color)',
              boxSizing: 'border-box',
            }}
          />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
            Password must be at least 8 characters.
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: onCancel ? 'flex-end' : 'stretch', marginTop: '0.5rem' }}>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="btn btn-outline"
              disabled={loading}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ flex: onCancel ? undefined : 1 }}
          >
            {loading ? 'Processing...' : isLogin ? 'Log In' : 'Sign Up'}
          </button>
        </div>

        {message && (
          <div
            style={{
              marginTop: '0.5rem',
              padding: '0.75rem',
              backgroundColor: message.type === 'error' ? '#ffebee' : 'var(--accent-light)',
              color: message.type === 'error' ? '#c62828' : 'var(--accent-color)',
              borderRadius: '0.4rem',
              fontSize: '0.875rem',
              border: message.type === 'error' ? '1px solid #ffcdd2' : '1px solid var(--accent-color)',
              lineHeight: 1.4,
            }}
          >
            {message.text}
          </div>
        )}
      </form>

      <button
        type="button"
        onClick={handleToggleMode}
        style={{
          marginTop: '1.25rem',
          background: 'none',
          border: 'none',
          color: 'var(--accent-color)',
          cursor: 'pointer',
          textDecoration: 'underline',
          fontSize: '0.875rem',
          padding: 0,
        }}
      >
        {isLogin ? 'Need an account? Sign up' : 'Already have an account? Log in'}
      </button>
    </div>
  );
};

export default AuthForm;
