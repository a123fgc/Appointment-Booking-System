
import { Routes, Route, Navigate } from 'react-router-dom';

import { useAuth, HOME_BY_ROLE } from '../context/AuthContext.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
import Layout from '../components/Layout.jsx';

import LoginPage from '../pages/auth/LoginPage.jsx';
import SignupPage from '../pages/auth/SignupPage.jsx';

import DashboardPage from '../pages/admin/DashboardPage.jsx';
import ServicesPage from '../pages/admin/ServicesPage.jsx';
import StaffPage from '../pages/admin/StaffPage.jsx';
import BookingsPage from '../pages/admin/BookingsPage.jsx';
import CustomersPage from '../pages/admin/CustomersPage.jsx';

import SchedulePage from '../pages/staff/SchedulePage.jsx';

import BookPage from '../pages/customer/BookPage.jsx';
import MyAppointmentsPage from '../pages/customer/MyAppointmentsPage.jsx';
import ReschedulePage from '../pages/customer/ReschedulePage.jsx';

function RootRedirect() {
    const { user, loading } = useAuth();

    if (loading) return <p className="p-6">Loading...</p>;

    return (
        <Navigate
            to={user ? HOME_BY_ROLE[user.role] || '/login' : '/login'}
            replace
        />
    );
}

function PublicOnly({ children }) {
    const { user, loading } = useAuth();

    if (loading) return <p className="p-6">Loading...</p>;

    if (user) {
        return (
            <Navigate
                to={HOME_BY_ROLE[user.role] || '/login'}
                replace
            />
        );
    }

    return children;
}

export default function AppRoutes() {
    return (
        <Routes>
            {/* Public Routes */}
            <Route path="/" element={<RootRedirect />} />

            <Route
                path="/login"
                element={
                    <PublicOnly>
                        <LoginPage />
                    </PublicOnly>
                }
            />

            <Route
                path="/signup"
                element={
                    <PublicOnly>
                        <SignupPage />
                    </PublicOnly>
                }
            />

            {/* Admin Routes */}
            <Route element={<ProtectedRoute role="admin" />}>
                <Route element={<Layout />}>
                    <Route path="/admin" element={<DashboardPage />} />
                    <Route path="/admin/bookings" element={<BookingsPage />} />
                    <Route path="/admin/customers" element={<CustomersPage />} />
                    <Route path="/admin/services" element={<ServicesPage />} />
                    <Route path="/admin/staff" element={<StaffPage />} />
                </Route>
            </Route>

            {/* Staff Routes */}
            <Route element={<ProtectedRoute role="staff" />}>
                <Route element={<Layout />}>
                    <Route path="/staff/schedule" element={<SchedulePage />} />
                </Route>
            </Route>

            {/* Customer Routes */}
            <Route element={<ProtectedRoute role="customer" />}>
                <Route element={<Layout />}>
                    <Route path="/customer/book" element={<BookPage />} />
                    <Route path="/customer/appointments" element={<MyAppointmentsPage />} />
                    <Route
                        path="/customer/appointments/:id/reschedule"
                        element={<ReschedulePage />}
                    />
                </Route>
            </Route>

            <Route path="*" element={<RootRedirect />} />
        </Routes>
    );
}