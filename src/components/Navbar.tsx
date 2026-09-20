import { Link } from 'react-router-dom';
import { Leaf, User, LogOut, LogIn } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { signIn, signOut } from '../services/auth';

const Navbar = () => {
  const [session, setSession] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    try {
      await signIn(email);
      setMessage('Check your email for the login link!');
    } catch (error: any) {
      setMessage(error.message || 'An error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <>
      <nav className="navbar">
        <Link to="/" className="nav-brand">
          <Leaf size={24} color="var(--accent-color)" />
          Earth Forward <span style={{ fontSize: '0.75rem', backgroundColor: 'var(--accent-light)', padding: '2px 8px', borderRadius: '12px', color: 'var(--accent-color)' }}>EARTH DAY HACKATHON</span>
        </Link>
        <div className="nav-links">
          <Link to="/" className="nav-link active">Home</Link>
          <Link to="/explore" className="nav-link">Explore Map</Link>
          <Link to="/report" className="nav-link">Report Issue</Link>
          <Link to="/learn" className="nav-link">Learn</Link>
          <Link to="/action" className="nav-link">Take Action</Link>
        </div>
        <div className="nav-actions" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {session ? (
            <>
              <Link to="/my-reports" className="btn btn-outline">My Reports</Link>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-color)' }}>
                <User size={18} />
                <span style={{ fontSize: '0.875rem' }}>{session.user.email}</span>
              </div>
              <button onClick={handleLogout} className="btn" style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }} title="Logout">
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <button onClick={() => setShowAuthModal(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <LogIn size={18} />
              Sign In / Sign Up
            </button>
          )}
          <Link to="/report" className="btn btn-primary">Report Issue</Link>
        </div>
      </nav>

      {showAuthModal && !session && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            backgroundColor: 'var(--card-bg, white)', padding: '2rem', borderRadius: '8px', 
            maxWidth: '400px', width: '100%', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ marginTop: 0, marginBottom: '1rem' }}>Sign In / Sign Up</h2>
            <p style={{ marginBottom: '1.5rem', color: 'var(--text-light)' }}>
              Enter your email to receive a magic link to sign in or create an account.
            </p>
            <form onSubmit={handleAuth}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Email</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  style={{ 
                    width: '100%', padding: '0.75rem', borderRadius: '4px', 
                    border: '1px solid #ccc', boxSizing: 'border-box'
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  onClick={() => setShowAuthModal(false)} 
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={isLoading}
                >
                  {isLoading ? 'Sending...' : 'Send Magic Link'}
                </button>
              </div>
              {message && (
                <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: 'var(--accent-light)', color: 'var(--accent-color)', borderRadius: '4px', fontSize: '0.875rem' }}>
                  {message}
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
