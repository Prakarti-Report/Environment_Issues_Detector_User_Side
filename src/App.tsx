import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Report from './pages/Report';
import MyReports from './pages/MyReports';
import RegisterOrganization from './pages/RegisterOrganization';
import { WORLD_3D_URL } from './config/links';
import './index.css';
import L from 'leaflet';
import { warmUpAi } from './services/ai';
import { isLocalHost } from './config/env';

// Fix Leaflet default marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function ExternalRedirect({ to }: { to: string }) {
  useEffect(() => {
    window.location.replace(to);
  }, [to]);
  return null;
}

function App() {
  useEffect(() => {
    if (!isLocalHost) {
      warmUpAi();
    }
  }, []);

  return (
    <Router>
      <div className="app-container">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/report" element={<Report />} />
            <Route path="/my-reports" element={<MyReports />} />
            <Route path="/register-organization" element={<RegisterOrganization />} />
            <Route path="/explore" element={<Navigate to="/#environmental-issues" replace />} />
            <Route path="/learn" element={<ExternalRedirect to={WORLD_3D_URL} />} />
            <Route path="/action" element={<Navigate to="/register-organization" replace />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
