import { useCallback, useEffect, useState } from 'react';
import { getDashboard } from '../../api/dashboard.js';
import { listAllStaff } from '../../api/staff.js';
import StatCard from '../../components/StatCard.jsx';
import Flash from '../../components/Flash.jsx';
import { money } from '../../utils/format.js';
import HoursEditModal from '../../components/HoursEditModal.jsx';
import { WEEKDAYS, shortDay } from '../../utils/date.js';

/* Card ke upar icon badge lagane ke liye wrapper (aap ka StatCard wesa hi rahega) */
const TONES = {
    emerald: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
    amber: 'bg-amber-100 text-amber-700 ring-amber-200',
    rose: 'bg-rose-100 text-rose-700 ring-rose-200',
    violet: 'bg-violet-100 text-violet-700 ring-violet-200',
};
// [{weekday:1,start:'09:00',end:'18:00'}, ...] -> "Mon, Tue 09:00-18:00 | Sat 10:00-14:00"
function summarizeHours(hours = []) {
    if (hours.length === 0) return 'Off (No days selected)';
    const groups = {};
    hours.forEach((h) => {
        const key = `${h.start.slice(0, 5)}-${h.end.slice(0, 5)}`;
        (groups[key] ||= []).push(WEEKDAYS[h.weekday].slice(0, 3));
    });
    return Object.entries(groups)
        .map(([time, days]) => `${days.join(', ')} ${time}`)
        .join(' | ');
}
function CardShell({ icon, tone = 'violet', children }) {
    return (
        <div className="relative rounded-2xl transition duration-200 hover:-translate-y-0.5 hover:shadow-lg">
            <div
                className={`absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-xl text-lg ring-1 ${TONES[tone]}`}
            >
                {icon}
            </div>
            {children}
        </div>
    );
}

function DashboardSkeleton() {
    return (
        <div className="space-y-6">
            <div className="h-9 w-56 animate-pulse rounded-lg bg-gray-200" />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-32 animate-pulse rounded-2xl bg-gray-200/70" />
                ))}
            </div>
            <div className="h-80 animate-pulse rounded-2xl bg-gray-200/70" />
        </div>
    );
}

export default function DashboardPage() {
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [staff, setStaff] = useState([]);
    const [editing, setEditing] = useState(null);
    const [ok, setOk] = useState('');

    const load = useCallback(() => {
        setRefreshing(true);
        setError('');

        Promise.all([getDashboard(), listAllStaff()])
            .then(([result, s]) => {
                setData({
                    ...result,
                    perDay: Array.isArray(result?.perDay) ? result.perDay : [],
                    totals: result?.totals || { bookings: 0, customers: 0, staff: 0 },
                });
                setStaff(s.staff);
            })
            .catch((err) => setError(err.message))
            .finally(() => setRefreshing(false));
    }, []);

    useEffect(() => {
        let active = true;

        Promise.all([getDashboard(), listAllStaff()])
            .then(([result, staffResult]) => {
                if (active) {
                    setData({
                        ...result,
                        perDay: Array.isArray(result?.perDay) ? result.perDay : [],
                        totals: result?.totals || { bookings: 0, customers: 0, staff: 0 },
                    });
                    setStaff(staffResult.staff);
                }
            })
            .catch((err) => {
                if (active) setError(err.message);
            })
            .finally(() => {
                if (active) setRefreshing(false);
            });

        return () => {
            active = false;
        };
    }, []);
    const handleSaved = () => {
        setEditing(null);
        setOk('Staff working hours updated successfully.');
        load();
    };
    if (error) {
        return (
            <div className="mx-auto max-w-lg space-y-4 py-10">
                <Flash error={error} />
                <button
                    onClick={load}
                    className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-violet-800"
                >
                    Try again
                </button>
            </div>
        );
    }

    if (!data) return <DashboardSkeleton />;

    const {
        perDay = [],
        revenue = 0,
        busiest = null,
        noShowRate = 0,
        totals = {},
    } = data;

    const maxCount = Math.max(
        1,
        ...perDay.map((d) => Number(d.count) || 0)
    );

    const total14 = perDay.reduce(
        (sum, d) => sum + (Number(d.count) || 0),
        0
    );

    /* Naye extra numbers (sirf perDay se) */
    const avgPerDay = perDay.length ? (total14 / perDay.length).toFixed(1) : 0;
    const peakDay = perDay.reduce(
        (best, d) => ((Number(d.count) || 0) > (Number(best?.count) || 0) ? d : best),
        null
    );

    const today = new Date().toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });

    return (
        <div className="space-y-6">
            <Flash ok={ok} />
            {/* Header */}
            <div className="flex flex-wrap items-end justify-between gap-3 rounded-2xl bg-gradient-to-r from-violet-700 to-violet-900 p-6 text-white shadow-lg">
                <div>
                    <p className="text-sm text-white/70">{today}</p>
                    <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
                        Dashboard
                    </h1>
                    <p className="mt-1 text-sm text-white/80">
                        Salon Performance Overview
                    </p>
                </div>
                <button
                    onClick={load}
                    disabled={refreshing}
                    className="rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur transition hover:bg-white/20 disabled:opacity-60"
                >
                    {refreshing ? 'Refreshing....' : ' Refresh'}
                </button>
            </div>

            {/* Stat cards */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <CardShell icon="💰" tone="emerald">
                    <StatCard
                        label="Total revenue"
                        value={money(revenue)}
                        sub="Only completed appointments"
                    />
                </CardShell>

                <CardShell icon="⭐" tone="amber">
                    <StatCard
                        label="Busiest Staff"
                        value={busiest ? busiest.name : '-'}
                        sub={
                            busiest
                                ? `${busiest.count} appointments`
                                : 'There are no bookings at the moment'
                        }
                    />
                </CardShell>

                <CardShell icon="🚫" tone="rose">
                    <StatCard
                        label="No-show rate"
                        value={`${noShowRate}%`}
                        sub="Completed + no-show mein se"
                    />
                </CardShell>

                <CardShell icon="📅" tone="violet">
                    <StatCard
                        label="Total bookings"
                        value={totals.bookings ?? 0}
                        sub={`${totals.customers ?? 0} customers, ${totals.staff ?? 0} staff`}
                    />
                </CardShell>
            </div>
            {/* Staff ke ghante */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900">Staff Working Hours</h3>
                <p className="mb-4 text-sm text-gray-500">
New staff members have default working hours of Monday–Saturday, 9 AM–6 PM. You can edit these hours for any staff member.                </p>

                <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                        <thead className="border-b border-gray-200 text-xs uppercase text-gray-500">
                            <tr>
                                <th className="py-2 pr-4">Name</th>
                                <th className="py-2 pr-4">Hours</th>
                                <th className="py-2 pr-4">Status</th>
                                <th className="py-2" />
                            </tr>
                        </thead>
                        <tbody>
                            {staff.map((m) => (
                                <tr
                                    key={m.id}
                                    className={`border-b border-gray-100 last:border-0 ${m.active ? '' : 'opacity-55'}`}
                                >
                                    <td className="py-3 pr-4 font-semibold text-gray-900">{m.name}</td>
                                    <td className="py-3 pr-4 text-gray-600">{summarizeHours(m.hours)}</td>
                                    <td className="py-3 pr-4">
                                        <span
                                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${m.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'
                                                }`}
                                        >
                                            {m.active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="py-3 text-right">
                                        <button
                                            onClick={() => setEditing(m)}
                                            className="rounded-lg border border-violet-200 px-3 py-1 text-xs font-semibold text-violet-700 transition hover:bg-violet-50"
                                        >
                                            Edit
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {staff.length === 0 && (
                        <p className="py-6 text-center text-sm text-gray-500">There are no staff members at the moment.</p>
                    )}
                </div>
            </div>
            {editing && (
                <HoursEditModal
                    member={editing}
                    onClose={() => setEditing(null)}
                    onSaved={handleSaved}
                />
            )}
            {/* Chart */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">
                            Bookings per day (aakhri 14 din)
                        </h3>
                        <p className="text-sm text-gray-500">
                            {total14} bookings (cancelled shamil nahi)
                        </p>
                    </div>

                    {perDay.length > 0 && (
                        <div className="flex flex-wrap gap-2 text-xs font-semibold">
                            <span className="rounded-full bg-violet-100 px-3 py-1 text-violet-700">
                                Average: {avgPerDay} / din
                            </span>
                            {peakDay && (
                                <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700">
                                    Peak: {shortDay(peakDay.day)} ({peakDay.count})
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {perDay.length === 0 ? (
                    <div className="grid h-56 place-items-center rounded-xl border border-dashed border-gray-300 text-center">
                        <div>
                            <p className="text-3xl">📊</p>
                            <p className="mt-2 text-sm text-gray-500">
                                There are no booking statistics available for the dashboard at the moment.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        {/* Bars */}
                        <div className="relative flex h-64 min-w-[560px] items-end gap-2 border-b border-gray-200">
                            {/* Peeche ki halki lines */}
                            <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="border-t border-dashed border-gray-100" />
                                ))}
                            </div>

                            {perDay.map((d) => {
                                const count = Number(d.count) || 0;
                                const isPeak = peakDay && d.day === peakDay.day && count > 0;

                                return (
                                    <div
                                        key={d.day}
                                        title={`${d.day}: ${d.count}`}
                                        className="group relative z-10 flex h-full flex-1 flex-col items-center justify-end"
                                    >
                                        <span className="mb-1 text-xs font-bold text-gray-600 transition group-hover:text-violet-700">
                                            {d.count}
                                        </span>

                                        <div
                                            className={`w-full max-w-10 rounded-t-lg transition-all duration-500 ${isPeak
                                                ? 'bg-gradient-to-t from-amber-500 to-amber-300'
                                                : 'bg-gradient-to-t from-violet-700 to-violet-400 group-hover:from-violet-800 group-hover:to-violet-500'
                                                }`}
                                            style={{
                                                height: `${(count / maxCount) * 80}%`,
                                                minHeight: count ? 6 : 2,
                                            }}
                                        />
                                    </div>
                                );
                            })}
                        </div>

                        {/* Labels */}
                        <div className="mt-2 flex min-w-[560px] gap-2">
                            {perDay.map((d) => (
                                <span
                                    key={d.day}
                                    className="flex-1 text-center text-[11px] font-medium text-gray-500"
                                >
                                    {shortDay(d.day)}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>

    );
}