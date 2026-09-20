import { Link } from 'react-router-dom';
import { Leaf, User, LogOut, LogIn } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { signOut } from '../services/auth';
import AuthForm from './AuthForm';

const Navbar = () => {
  const [session, setSession] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    if (!supabase) return;

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

  useEffect(() => {
    if (!showAuthModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowAuthModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAuthModal]);

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
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAuthModal(false);
          }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--card-bg, white)',
              padding: '2rem',
              borderRadius: '1rem',
              maxWidth: '400px',
              width: '100%',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            }}
          >
            <AuthForm
              onSuccess={() => setShowAuthModal(false)}
              onCancel={() => setShowAuthModal(false)}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
