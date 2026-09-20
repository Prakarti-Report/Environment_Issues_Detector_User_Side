import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { getReports } from '../services/reports';
import type { Report } from '../services/reports';
import { Link, useLocation } from 'react-router-dom';
import { AlertCircle, Camera, CheckCircle, Droplets, Flame, MapPin, TreePine, Trash2, Navigation, Globe, LayoutDashboard } from 'lucide-react';
import { WORLD_3D_URL, ORG_DASHBOARD_URL } from '../config/links';
import OrgTaskBoard from '../components/OrgTaskBoard';

// Helper component to change map view dynamically
function ChangeView({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  map.setView(center, zoom);
  return null;
}

// Haversine distance formula (returns distance in km)
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c;
}

const Home = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [radius, setRadius] = useState<number>(5);

  const location = useLocation();

  useEffect(() => {
    getReports().then(data => {
      if (data) setReports(data as unknown as Report[]);
    }).catch(err => console.error(err));
  }, []);

  useEffect(() => {
    if (location.hash === '#environmental-issues') {
      const el = document.getElementById('environmental-issues');
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth' });
        }, 150);
      }
    }
  }, [location.hash]);

  const handleUseMyLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.error("Error getting location", error);
          alert("Could not get location. Please ensure location services are enabled.");
        }
      );
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  };

  const openGoogleMaps = (lat: number, lng: number) => {
    window.open(`https://maps.google.com/?q=${lat},${lng}`, '_blank');
  };

  // Filter reports based on distance if userLocation is set
  const filteredReports = userLocation 
    ? reports.filter(r => getDistance(userLocation[0], userLocation[1], r.latitude, r.longitude) <= radius)
    : reports;

  const mapCenter: [number, number] = userLocation || [28.6139, 77.2090];
  const mapZoom = userLocation ? 12 : 11;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4rem', paddingBottom: '4rem' }}>
      
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">See the problem.<br/>Map the impact.<br/>PRAKARTI REPORT.</h1>
          <p className="hero-subtitle">
            PRAKARTI REPORT is a citizen-powered environmental reporting platform. 
            We empower communities to document ecological challenges and track action.
          </p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <Link to="/report" className="btn btn-primary" style={{ fontSize: '1rem', padding: '0.75rem 1.5rem' }}>
              Report an Environmental Issue
            </Link>
            <button className="btn btn-outline" style={{ fontSize: '1rem', padding: '0.75rem 1.5rem', border: 'none', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              ▶ Play Explainer Video
            </button>
            <a
              href={WORLD_3D_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline"
              style={{
                fontSize: '1rem',
                padding: '0.75rem 1.5rem',
                border: 'none',
                background: 'white',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <Globe size={18} /> 3D World Environment
            </a>
            <a
              href={ORG_DASHBOARD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline"
              style={{
                fontSize: '1rem',
                padding: '0.75rem 1.5rem',
                border: 'none',
                background: 'white',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <LayoutDashboard size={18} /> Organization Dashboard
            </a>
          </div>
        </div>
        <div className="hero-map-wrapper">
          <MapContainer center={[28.6139, 77.2090]} zoom={10} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {reports.slice(0, 5).map(report => (
              <Marker key={report.id} position={[report.latitude, report.longitude]}>
                <Popup>
                  <strong>{report.category === 'pending_ai' ? (report.ai_category || 'Environmental Incident') : report.category}</strong><br/>
                  <span style={{ textTransform: 'capitalize' }}>{report.status.replace(/_/g, ' ')}</span><br/>
                  <button onClick={() => openGoogleMaps(report.latitude, report.longitude)} className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', marginTop: '0.5rem', width: '100%', display: 'flex', gap: '0.25rem', alignItems: 'center', justifyContent: 'center' }}>
                    <Navigation size={12} /> Get Location
                  </button>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </section>

      {/* Organizations & Teams at work */}
      <OrgTaskBoard />

      {/* Stats / Environmental Issues Near You */}
      <section className="container" id="environmental-issues" style={{ scrollMarginTop: '5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.75rem', color: 'var(--primary-color)' }}>Environmental Issues Near You</h2>
            <p style={{ color: 'var(--text-muted)' }}>Real-time visualizations of public reports in your area.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            
            {/* Radius Selector */}
            <select 
              value={radius} 
              onChange={(e) => setRadius(Number(e.target.value))}
              style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', outline: 'none' }}
            >
              <option value={5}>Within 5 km</option>
              <option value={15}>Within 15 km</option>
              <option value={20}>Within 20 km</option>
              <option value={100000}>Everywhere</option>
            </select>

            <button onClick={handleUseMyLocation} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderColor: 'var(--primary-color)', color: 'var(--primary-color)' }}>
              <MapPin size={16} /> Use My Location
            </button>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
          {['All Issues', 'Waste Issues', 'Garbage Dumping', 'Air Quality', 'Water Issues'].map((filter, i) => (
            <button key={filter} className={i === 0 ? "btn btn-primary" : "btn btn-outline"} style={i !== 0 ? { color: 'var(--text-dark)', borderColor: 'var(--border-color)', backgroundColor: 'white' } : {}}>
              {filter}
            </button>
          ))}
        </div>

        <div className="grid-map-list">
           <div style={{ flex: '1 1 600px', height: '500px', borderRadius: '1rem', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
             <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: '100%', width: '100%' }}>
                <ChangeView center={mapCenter} zoom={mapZoom} />
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {filteredReports.map(report => (
                  <Marker key={report.id} position={[report.latitude, report.longitude]}>
                    <Popup>
                      <strong>{report.category === 'pending_ai' ? (report.ai_category || 'Environmental Incident') : report.category}</strong><br/>
                      <span style={{ textTransform: 'capitalize' }}>{report.status.replace(/_/g, ' ')}</span><br/>
                      <button onClick={() => openGoogleMaps(report.latitude, report.longitude)} className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', marginTop: '0.5rem', width: '100%', display: 'flex', gap: '0.25rem', alignItems: 'center', justifyContent: 'center' }}>
                        <Navigation size={12} /> Get Location
                      </button>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
           </div>
           
           {/* Dynamic Live Incidents List */}
           <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '500px', overflowY: 'auto', paddingRight: '0.5rem' }}>
              <h3 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Live Incidents <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Found {filteredReports.length}</span>
              </h3>

              {filteredReports.length === 0 && (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', backgroundColor: 'white', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
                  No issues found in this area.
                </div>
              )}

              {filteredReports.map(report => (
                <div key={report.id} style={{ padding: '1rem', backgroundColor: 'white', borderRadius: '0.5rem', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <strong style={{ display: 'block' }}>{report.category === 'pending_ai' ? (report.ai_category || 'Environmental Incident') : report.category}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>Status: {report.status.replace(/_/g, ' ')}</span>
                    </div>
                    {report.severity === 'high' && (
                      <span style={{ fontSize: '0.75rem', color: 'red', backgroundColor: '#fee2e2', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>HIGH SEVERITY</span>
                    )}
                  </div>
                  {userLocation && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Distance: {getDistance(userLocation[0], userLocation[1], report.latitude, report.longitude).toFixed(1)} km away
                    </div>
                  )}
                  <button onClick={() => openGoogleMaps(report.latitude, report.longitude)} className="btn btn-outline" style={{ marginTop: '0.5rem', padding: '0.5rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                    <Navigation size={14} /> Get Location
                  </button>
                </div>
              ))}
           </div>
        </div>
      </section>

      {/* 6 Steps */}
      <section className="container section-steps" style={{ backgroundColor: '#f8fafc', borderRadius: '1rem' }}>
        <h2 style={{ fontSize: '1.75rem', color: 'var(--primary-color)', marginBottom: '0.5rem' }}>From Sighting to Solution in 6 Steps</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>A simple, transparent process.</p>
        
        <div className="grid-6-steps">
          {[
            { id: '01', title: 'See Hazard', icon: <Camera size={20}/>, desc: 'Spot an environmental issue.' },
            { id: '02', title: 'Location Tagging', icon: <MapPin size={20}/>, desc: 'GPS attaches exact coordinates.' },
            { id: '03', title: 'AI Classification', icon: <AlertCircle size={20}/>, desc: 'AI analyzes the image for category.' },
            { id: '04', title: 'Map it Publicly', icon: <CheckCircle size={20}/>, desc: 'Issue becomes visible on map.' },
            { id: '05', title: 'NGO Action', icon: <Flame size={20}/>, desc: 'Authorities and NGOs are notified.' },
            { id: '06', title: 'Resolution', icon: <TreePine size={20}/>, desc: 'Track progress until resolved.' }
          ].map(step => (
            <div key={step.id} style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent-color)', marginBottom: '1rem' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>{step.id}</span>
                {step.icon}
              </div>
              <strong style={{ display: 'block', marginBottom: '0.5rem' }}>{step.title}</strong>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Submit Incident Cards */}
      <section className="container section-submit" style={{ backgroundColor: 'var(--primary-color)', borderRadius: '1.5rem', color: 'white', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Submit an incident in 60 seconds</h2>
        <p style={{ opacity: 0.8, marginBottom: '3rem' }}>Your everyday observations can shape a greener future.</p>
        
        <div className="grid-incident-cards">
          {[
            { title: 'Garbage Dumping', icon: <Trash2 size={20}/> },
            { title: 'Deforestation', icon: <TreePine size={20}/> },
            { title: 'Water Pollution', icon: <Droplets size={20}/> },
            { title: 'Waste Burning', icon: <Flame size={20}/> }
          ].map(card => (
            <div key={card.title} style={{ backgroundColor: 'var(--primary-hover)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ color: 'var(--accent-light)', marginBottom: '1rem' }}>{card.icon}</div>
              <strong style={{ fontSize: '1.125rem' }}>{card.title}</strong>
              <p style={{ fontSize: '0.875rem', opacity: 0.8, margin: '0.5rem 0 1.5rem' }}>Report issues in your vicinity.</p>
              <Link to="/report" style={{ color: 'var(--accent-color)', textDecoration: 'none', fontWeight: 600, fontSize: '0.875rem' }}>Report Issue →</Link>
            </div>
          ))}
        </div>
      </section>
      
    </div>
  );
};

export default Home;
