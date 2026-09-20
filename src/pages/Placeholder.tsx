const Placeholder = ({ title }: { title: string }) => (
  <div className="container" style={{ padding: '6rem 1rem', textAlign: 'center' }}>
    <h1 style={{ color: 'var(--primary-color)', marginBottom: '1rem' }}>{title}</h1>
    <p style={{ color: 'var(--text-muted)' }}>This section is currently under construction for the hackathon!</p>
  </div>
);

export default Placeholder;
