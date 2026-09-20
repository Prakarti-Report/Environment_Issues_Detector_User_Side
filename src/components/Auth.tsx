import AuthForm from './AuthForm';

interface AuthProps {
  onAuth: () => void;
}

const Auth = ({ onAuth }: AuthProps) => {
  return (
    <div
      style={{
        padding: '2rem',
        maxWidth: '400px',
        margin: '0 auto',
        backgroundColor: 'white',
        borderRadius: '1rem',
        border: '1px solid var(--border-color)',
      }}
    >
      <AuthForm onSuccess={onAuth} />
    </div>
  );
};

export default Auth;
