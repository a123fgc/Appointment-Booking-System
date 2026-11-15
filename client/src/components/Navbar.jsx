import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Scissors } from 'lucide-react';
import { useToast } from '../context/ToastContext.jsx';
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
  const toast = useToast();
  const navigate = useNavigate();

  async function handleLogout() {
    let serverConfirmed = true;
    try {
      await logout();
    } catch (error) {
      serverConfirmed = false;
      console.error(
        'Server logout could not be confirmed; local credentials were cleared.',
        error
      );
    }

    if (serverConfirmed) toast.success('Logged out successfully.');
    else toast.info('You have been logged out. The server could not confirm the session change.');

    navigate('/login', { replace: true });
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
