const Footer = () => {
  return (
    <footer style={{ backgroundColor: 'white', borderTop: '1px solid var(--border-color)', padding: '1.5rem 0', marginTop: 'auto' }}>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <p>© 2026 PRAKARTI REPORT. All Rights Reserved.</p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <span>Made with 💚</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
