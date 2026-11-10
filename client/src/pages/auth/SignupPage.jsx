import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, HOME_BY_ROLE } from '../../context/AuthContext.jsx';
import Flash from '../../components/Flash.jsx';

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password kam az kam 8 characters ka ho.');
      return;
    }
    if (password !== confirm) {
      setError('Dono password ek jaise nahi hain.');
      return;
    }

    setSubmitting(true);
    try {
      const user = await signup(name.trim(), email.trim(), password);
      navigate(HOME_BY_ROLE[user.role], { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container">
      <form className="card form-narrow" onSubmit={handleSubmit}>
        <h2>Naya account banayein</h2>
        <p className="muted">Appointment book karne ke liye signup karein.</p>

        <Flash error={error} />

        <div className="field">
          <label htmlFor="name">Poora naam</label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
            autoFocus
          />
        </div>

        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="password">Password (kam az kam 8 characters)</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>

        <div className="field">
          <label htmlFor="confirm">Password dobara likhein</label>
          <input
            id="confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </div>

        <button className="btn" type="submit" disabled={submitting} style={{ width: '100%' }}>
          {submitting ? 'Account ban raha hai...' : 'Signup'}
        </button>

        <p className="muted" style={{ marginTop: 16 }}>
          Pehle se account hai? <Link to="/login">Login karein</Link>
        </p>
      </form>
    </div>
  );
}