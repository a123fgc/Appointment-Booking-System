import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuth, HOME_BY_ROLE } from './context/AuthContext.jsx';
import { BrowserRouter } from 'react-router-dom';
import Layout from './components/Layout.jsx';

// Auth pages
import LoginPage from './pages/auth/LoginPage.jsx';
import SignupPage from './pages/auth/SignupPage.jsx';

// Admin pages
import DashboardPage from './pages/admin/DashboardPage.jsx';
import BookingsPage from './pages/admin/BookingsPage.jsx';
import ServicesPage from './pages/admin/ServicesPage.jsx';
import StaffPage from './pages/admin/StaffPage.jsx';
import CustomersPage from './pages/admin/CustomersPage.jsx';

// Customer pages
import BookPage from './pages/customer/BookPage.jsx';
import MyAppointmentsPage from './pages/customer/MyAppointmentsPage.jsx';
import ReschedulePage from './pages/customer/ReschedulePage.jsx';

// Staff pages
import SchedulePage from './pages/staff/SchedulePage.jsx';

/* ------------------------------------------------------------------
   Route table: naya page add karna ho to sirf yahan ek line add karein
------------------------------------------------------------------- */
const ROLE_ROUTES = [
  {
    role: 'admin',
    base: '/admin',
    pages: [
      { index: true, element: <DashboardPage /> },
      { path: 'bookings', element: <BookingsPage /> },
      { path: 'customers', element: <CustomersPage /> },
      { path: 'services', element: <ServicesPage /> },
      { path: 'staff', element: <StaffPage /> },
    ],
  },
  {
    role: 'staff',
    base: '/staff',
    pages: [
      { index: true, element: <Navigate to="schedule" replace /> },
      { path: 'schedule', element: <SchedulePage /> },
    ],
  },
  {
    role: 'customer',
    base: '/customer',
    pages: [
      { index: true, element: <Navigate to="book" replace /> },
      { path: 'book', element: <BookPage /> },
          { path: 'customers', element: <CustomersPage /> },

      { path: 'appointments', element: <MyAppointmentsPage /> },
      { path: 'appointments/:id/reschedule', element: <ReschedulePage /> },
    ],
  },
];
/* ---------------------------- Helpers ----------------------------- */

function LoadingScreen() {
  return (
    <div className="grid min-h-screen place-items-center bg-gray-50">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-200 border-t-violet-700" />
    </div>
  );
}

// "/" par: login nahi to /login, warna apne role ke page par
function RootRedirect() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;

  return <Navigate to={HOME_BY_ROLE?.[user.role] || '/login'} replace />;
}

// Sirf allowedRoles wale users andar ja sakte hain
function ProtectedRoute({ allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={HOME_BY_ROLE?.[user.role] || '/login'} replace />;
  }

  return <Outlet />;
}

/* ------------------------------ App ------------------------------- */

export default function App() {
  return (
        <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* Root */}
      <Route path="/" element={<RootRedirect />} />

      {/* Role based (protected) routes */}
      {ROLE_ROUTES.map(({ role, base, pages }) => (
        <Route key={role} element={<ProtectedRoute allowedRoles={[role]} />}>
          <Route path={base} element={<Layout />}>
            {pages.map((page, i) => (
              <Route key={page.path ?? `index-${i}`} {...page} />
            ))}
          </Route>
        </Route>
      ))}

      {/* Unknown URL */}
      <Route path="*" element={<RootRedirect />} />
    </Routes>    
  );
}