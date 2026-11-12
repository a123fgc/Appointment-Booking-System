import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, HOME_BY_ROLE } from '../../context/AuthContext.jsx';
import Flash from '../../components/Flash.jsx';
import { Scissors } from 'lucide-react';

// Email Icon
function MailIcon() {
    return (
        <svg
            className="pointer-events-none absolute left-3.5 h-5 w-5 text-gray-400 transition-colors peer-focus:text-violet-600"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="m3 7 9 6 9-6" />
        </svg>
    );
}

// Password Icon
function LockIcon() {
    return (
        <svg
            className="pointer-events-none absolute left-3.5 h-5 w-5 text-gray-400 transition-colors peer-focus:text-violet-600"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <rect x="4" y="11" width="16" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
    );
}

// Show / Hide Password Icon
function EyeIcon({ off }) {
    return (
        <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
            <circle cx="12" cy="12" r="3" />
            {off && <path d="M4 4l16 16" />}
        </svg>
    );
}

// Common input styling
const inputClass =
    'peer w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-11 text-sm text-gray-800 outline-none transition-all duration-200 placeholder:text-gray-400 hover:border-gray-300 focus:border-violet-600 focus:ring-4 focus:ring-violet-600/10';
export default function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');

        setSubmitting(true);

        try {
            const user = await login(email.trim(), password);

            const destination = HOME_BY_ROLE[user.role] || '/login';

            navigate(destination, { replace: true });
        } catch (err) {
            setError(err.message || 'Login failed. Please try again.');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="grid min-h-screen bg-gray-50 lg:grid-cols-[1.05fr_1fr]">

            {/* Left Brand Section */}
            <aside className="relative hidden items-center justify-center overflow-hidden bg-gradient-to-br from-violet-700 to-violet-950 p-12 text-white lg:flex">

                <div className="relative z-10 max-w-md">

                    <div className="mb-7 grid h-[68px] w-[68px] place-items-center rounded-2xl border border-white/25 bg-white/15 text-3xl backdrop-blur">
                        <Scissors size={28} strokeWidth={2} />
                    </div>

                    <h1 className="mb-3.5 text-4xl font-extrabold leading-tight tracking-tight">
                        Salon Management
                    </h1>
                    <h2>Everything Your Salon Needs, All in One Place.</h2>

                    <p className="mb-8 text-lg leading-relaxed text-white/80">
                        Manage appointments, staff, and customers effortlessly with one simple, streamlined platform.
                    </p>

                    <ul className="grid gap-3.5">
                        {[
                            'Seamless Online Appointment Booking',
                            'Personalized Dashboards for Staff & Admins',
                            'Secure, Reliable & Efficient Platform',
                        ].map((item) => (
                            <li key={item} className="flex items-center gap-3 text-white/90">

                                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-amber-400 text-xs font-bold text-amber-950">
                                    ✓
                                </span>

                                {item}

                            </li>
                        ))}
                    </ul>

                </div>

                {/* Background Decoration */}
                <div className="absolute -right-28 -top-28 h-96 w-96 rounded-full bg-white/5" />
                <div className="absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-white/5" />

            </aside>

            {/* Right Login Form */}
            <main className="flex items-center justify-center bg-gradient-to-br from-violet-50 to-gray-50 px-5 py-8 sm:px-6 lg:bg-none">

                <form
                    onSubmit={handleSubmit}
                    className="w-full max-w-[410px] rounded-2xl border border-gray-200 bg-white px-6 py-8 shadow-xl shadow-gray-900/5 sm:px-9 sm:py-10"
                >

                    {/* Mobile Logo */}
                    <div className="mb-5 grid h-[52px] w-[52px] place-items-center rounded-2xl bg-gradient-to-br from-violet-700 to-violet-950 text-2xl lg:hidden">
                        <Scissors size={28} strokeWidth={2} color="#FFFFFF"/>
                    </div>

                    {/* Heading */}
                    <h2 className="mb-1.5 text-2xl font-extrabold tracking-tight text-gray-900 sm:text-[1.65rem]">
                        Welcome Back!
                    </h2>

                    <p className="mb-6 text-[15px] text-gray-500">
                        Log in to Your Account
                    </p>

                    {/* Error Message */}
                    <Flash error={error} />

                    {/* Email Field */}
                    <div className="mb-[18px]">

                        <label
                            htmlFor="email"
                            className="mb-2 block text-sm font-semibold text-gray-800"
                        >
                            Email
                        </label>

                        <div className="relative  flex items-center">
                            <MailIcon />
                            <input
                                id="email"
                                type="email"
                                placeholder="name@example.com"
                                autoComplete="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoFocus
                                className={inputClass}
                            />



                        </div>

                    </div>

                    {/* Password Field */}
                    <div className="mb-[18px]">

                        <label
                            htmlFor="password"
                            className="mb-2 block text-sm font-semibold text-gray-800"
                        >
                            Password
                        </label>

                        <div className="relative  flex items-center">

                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Enter your password"
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className={inputClass}
                            />

                            <LockIcon />

                            {/* Toggle Password */}
                            <button
                                type="button"
                                onClick={() => setShowPassword((s) => !s)}
                                aria-label={
                                    showPassword
                                        ? 'Password chupayein'
                                        : 'Password dikhayein'
                                }
                                className="absolute right-2 grid h-9 w-9 place-items-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-violet-600"
                            >
                                <EyeIcon off={showPassword} />
                            </button>

                        </div>

                    </div>

                    {/* Login Button */}
                    <button
                        type="submit"
                        disabled={submitting}
                        className="mt-1.5 flex w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-br from-violet-700 to-violet-950 py-3.5 text-base font-bold text-white shadow-lg shadow-violet-700/40 transition hover:-translate-y-px hover:shadow-xl hover:shadow-violet-700/50 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-75 disabled:hover:translate-y-0"
                    >

                        {submitting ? (
                            <>
                                <span className="h-[18px] w-[18px] animate-spin rounded-full border-[2.5px] border-white/35 border-t-white" />
                                Login Successful...
                            </>
                        ) : (
                            'Login'
                        )}

                    </button>

                    {/* Signup Link */}
                    <p className="mt-6 text-center text-sm text-gray-500">

                        Don't have an account?{' '}

                        <Link
                            to="/signup"
                            className="font-semibold text-violet-700 hover:underline"
                        >
                            Signup
                        </Link>

                    </p>

                </form>

            </main>

        </div>
    );
}
