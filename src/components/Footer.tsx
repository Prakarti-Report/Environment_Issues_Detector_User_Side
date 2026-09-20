import { Link } from 'react-router-dom';
import { Leaf } from 'lucide-react';

const Footer = () => {
  return (
    <footer style={{ backgroundColor: 'white', borderTop: '1px solid var(--border-color)', paddingTop: '4rem', paddingBottom: '2rem', marginTop: 'auto' }}>
      <div className="container">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '3rem', marginBottom: '3rem' }}>
          
          {/* Brand Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '1.25rem', color: 'var(--primary-color)', textDecoration: 'none' }}>
              <Leaf size={24} color="var(--accent-color)" />
              PRAKARTI REPORT
            </Link>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Our goal is to build environmental consciousness and empower citizens to take meaningful action in their neighborhoods.
            </p>
          </div>

          {/* Platform Column */}
          <div>
            <h4 style={{ fontWeight: 600, marginBottom: '1rem', color: 'var(--text-dark)' }}>PLATFORM</h4>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <li><Link to="/explore" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.875rem' }}>Explore Map</Link></li>
              <li><Link to="/report" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.875rem' }}>Report Issue</Link></li>
              <li><Link to="/" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.875rem' }}>Live Incidents</Link></li>
              <li><span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', cursor: 'not-allowed' }}>Join as NGO/Authority</span></li>
            </ul>
          </div>

          {/* Learn Column */}
          <div>
            <h4 style={{ fontWeight: 600, marginBottom: '1rem', color: 'var(--text-dark)' }}>LEARN</h4>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <li><Link to="/learn" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.875rem' }}>All Blog Posts</Link></li>
              <li><span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', cursor: 'not-allowed' }}>Research Institute</span></li>
              <li><span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', cursor: 'not-allowed' }}>Educational Programs</span></li>
            </ul>
          </div>

          {/* Resources Column */}
          <div>
            <h4 style={{ fontWeight: 600, marginBottom: '1rem', color: 'var(--text-dark)' }}>RESOURCES</h4>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <li><Link to="/report" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.875rem' }}>Submit an Incident</Link></li>
              <li><span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', cursor: 'not-allowed' }}>FAQ / Help</span></li>
            </ul>
          </div>

          {/* Legal Column */}
          <div>
            <h4 style={{ fontWeight: 600, marginBottom: '1rem', color: 'var(--text-dark)' }}>LEGAL & PRIVACY</h4>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <li><span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', cursor: 'not-allowed' }}>Terms & Conditions</span></li>
              <li><span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', cursor: 'not-allowed' }}>Privacy Policy</span></li>
            </ul>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '2rem', borderTop: '1px solid var(--border-color)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <p>© 2026 PRAKARTI REPORT. All Rights Reserved. Built for the Earth Day Hackathon.</p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <span>Made with 💚</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
