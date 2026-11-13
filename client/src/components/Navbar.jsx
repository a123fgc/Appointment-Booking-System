import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Scissors } from 'lucide-react';
const LINKS = {
  admin: [
    { to: '/admin', label: 'Dashboard', end: true },
    { to: '/admin/bookings', label: 'Bookings' },
    { to: '/admin/customers', label: 'Customers' },
    { to: '/admin/services', label: 'Services' },
    { to: '/admin/staff', label: 'Staff' },
  ],
  staff: [{ to: '/staff/schedule', label: 'My Schedule' }],
  customer: [
    { to: '/customer/book', label: 'Book Appointment' },
    { to: '/customer/appointments', label: 'My Appointments' },
  ],
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } finally {
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    window.location.href = '/login';
  }
}

  return (
    <header className="nav">
      <div className="nav-inner">
        <span className="brand flex"><Scissors size={28} strokeWidth={2}/> Salon</span>

        <nav className="nav-links">
          {(LINKS[user?.role] || []).map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="nav-user">
          <span>
            {user?.name} <span className="muted">({user?.role})</span>
          </span>
          <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}