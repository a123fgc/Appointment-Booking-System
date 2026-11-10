
import { useCallback, useEffect, useState } from 'react';

import {
    listStaff,
    createStaff,
    updateStaff,
    saveStaffHours,
    uploadStaffPhoto,
} from '../../api/staff.js';

import Flash from '../../components/Flash.jsx';
import Avatar from '../../components/Avatar.jsx';
import { WEEKDAYS } from '../../utils/date.js';

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

const EMPTY = {
    name: '',
    email: '',
    password: '',
    bio: '',
};

const inputClass =
    'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100';

const labelClass =
    'mb-2 block text-sm font-semibold text-slate-700';

function hoursToState(hours = []) {
    const state = {};

    for (let d = 0; d < 7; d++) {
        state[d] = { start: '', end: '' };
    }

    hours.forEach((h) => {
        state[h.weekday] = {
            start: h.start,
            end: h.end,
        };
    });

    return state;
}

function StaffCard({ member, onChanged, notify }) {
    const [profile, setProfile] = useState({
        name: member.name,
        bio: member.bio || '',
    });

    const [hours, setHours] = useState(
        hoursToState(member.hours)
    );

    const [busy, setBusy] = useState(false);

    useEffect(() => {
        setProfile({
            name: member.name,
            bio: member.bio || '',
        });

        setHours(hoursToState(member.hours));
    }, [member]);

    async function run(fn, successMsg) {
        notify('', '');
        setBusy(true);

        try {
            await fn();
            notify(successMsg, '');
            await onChanged();
        } catch (err) {
            notify('', err.message);
        } finally {
            setBusy(false);
        }
    }

    const saveProfile = (e) => {
        e.preventDefault();

        run(
            () =>
                updateStaff(member.id, {
                    name: profile.name.trim(),
                    bio: profile.bio.trim(),
                    active: member.active,
                }),
            'Staff profile successfully updated.'
        );
    };

    const toggleActive = () =>
        run(
            () =>
                updateStaff(member.id, {
                    name: member.name,
                    bio: member.bio || '',
                    active: !member.active,
                }),
            member.active
                ? 'Staff member deactivated successfully.'
                : 'Staff member activated successfully.'
        );

    function saveHours(e) {
        e.preventDefault();

        const list = [];

        for (const d of DAY_ORDER) {
            const { start, end } = hours[d];

            if (!start && !end) continue;

            if (!start || !end) {
                notify(
                    '',
                    `${WEEKDAYS[d]}: Please enter both start and end times.`
                );
                return;
            }

            if (end <= start) {
                notify(
                    '',
                    `${WEEKDAYS[d]}: End time must be after start time.`
                );
                return;
            }

            list.push({
                weekday: d,
                start,
                end,
            });
        }

        run(
            () => saveStaffHours(member.id, list),
            'Working hours successfully updated.'
        );
    }

    function handlePhoto(e) {
        const file = e.target.files?.[0];

        e.target.value = '';

        if (!file) return;

        if (
            !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
        ) {
            notify('', 'Only JPG, PNG or WEBP images are allowed.');
            return;
        }

        if (file.size > MAX_PHOTO_BYTES) {
            notify('', 'Profile photo must be smaller than 2 MB.');
            return;
        }

        run(
            () => uploadStaffPhoto(member.id, file),
            'Profile picture successfully updated.'
        );
    }

    const setHour = (day, key) => (e) =>
        setHours((h) => ({
            ...h,
            [day]: {
                ...h[day],
                [key]: e.target.value,
            },
        }));

    return (
        <div
            className={`overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:border-indigo-200 hover:shadow-lg sm:p-6 ${!member.active ? 'opacity-70' : ''
                }`}
        >
            {/* Profile Section */}
            <div className="flex flex-col gap-6 lg:flex-row">

                {/* Avatar */}
                <div className="flex flex-col items-center gap-3 lg:w-32">
                    <div className="rounded-full bg-indigo-50 p-1.5 ring-4 ring-indigo-50/70">
                        <Avatar
                            src={member.photo_url}
                            name={member.name}
                            size={88}
                        />
                    </div>

                    <label className="cursor-pointer rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100">
                        Change Photo

                        <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handlePhoto}
                            disabled={busy}
                            className="hidden"
                        />
                    </label>

                    <span className="text-xs text-slate-400">
                        Max size 2 MB
                    </span>
                </div>

                {/* Profile Form */}
                <form
                    onSubmit={saveProfile}
                    className="min-w-0 flex-1 space-y-5"
                >
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

                        <div>
                            <label className={labelClass}>
                                Full Name
                            </label>

                            <input
                                type="text"
                                className={inputClass}
                                value={profile.name}
                                onChange={(e) =>
                                    setProfile((p) => ({
                                        ...p,
                                        name: e.target.value,
                                    }))
                                }
                                required
                                minLength={2}
                                placeholder="Enter staff name"
                            />
                        </div>

                        <div>
                            <label className={labelClass}>
                                Email Address
                            </label>

                            <input
                                type="email"
                                className={inputClass}
                                value={member.email}
                                disabled
                            />

                            <p className="mt-1 text-xs text-slate-400">
                                Email address cannot be changed.
                            </p>
                        </div>

                    </div>

                    <div>
                        <label className={labelClass}>
                            Professional Bio
                        </label>

                        <textarea
                            className={`${inputClass} resize-none`}
                            rows={3}
                            value={profile.bio}
                            onChange={(e) =>
                                setProfile((p) => ({
                                    ...p,
                                    bio: e.target.value,
                                }))
                            }
                            maxLength={300}
                            placeholder="Write a short professional introduction..."
                        />
                    </div>

                    {/* Profile Actions */}
                    <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">

                        <button
                            type="submit"
                            disabled={busy}
                            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {busy ? 'Saving...' : 'Save Changes'}
                        </button>

                        <button
                            type="button"
                            onClick={toggleActive}
                            disabled={busy}
                            className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition disabled:opacity-50 ${member.active
                                ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                }`}
                        >
                            {member.active
                                ? 'Deactivate Staff'
                                : 'Activate Staff'}
                        </button>

                        <span
                            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${member.active
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-slate-100 text-slate-500'
                                }`}
                        >
                            {member.active ? 'Active' : 'Inactive'}
                        </span>

                    </div>
                </form>
            </div>

            {/* Working Hours */}
            <div className="mt-7 border-t border-slate-100 pt-6">

                <div className="mb-5">
                    <h3 className="text-lg font-bold text-slate-800">
                        Working Hours
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                        Manage staff availability for each day of the week.
                        Leave both fields empty for an off day.
                    </p>
                </div>

                <form onSubmit={saveHours}>

                    <div className="mb-3 hidden grid-cols-[1fr_1fr_1fr] gap-4 px-3 text-xs font-bold uppercase tracking-wider text-slate-400 sm:grid">
                        <span>Day</span>
                        <span>Start Time</span>
                        <span>End Time</span>
                    </div>

                    <div className="space-y-3">
                        {DAY_ORDER.map((d) => (
                            <div
                                key={d}
                                className="grid grid-cols-1 items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/70 p-3 transition hover:border-indigo-100 sm:grid-cols-[1fr_1fr_1fr] sm:gap-4"
                            >
                                <strong className="text-sm font-semibold text-slate-700">
                                    {WEEKDAYS[d]}
                                </strong>

                                <div>
                                    <label className="mb-1 block text-xs text-slate-400 sm:hidden">
                                        Start Time
                                    </label>

                                    <input
                                        type="time"
                                        className={`${inputClass} !py-2.5`}
                                        value={hours[d].start}
                                        onChange={setHour(d, 'start')}
                                        disabled={busy}
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs text-slate-400 sm:hidden">
                                        End Time
                                    </label>

                                    <input
                                        type="time"
                                        className={`${inputClass} !py-2.5`}
                                        value={hours[d].end}
                                        onChange={setHour(d, 'end')}
                                        disabled={busy}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        type="submit"
                        disabled={busy}
                        className="mt-5 rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-900 disabled:opacity-50"
                    >
                        {busy ? 'Saving...' : 'Save Working Hours'}
                    </button>

                </form>
            </div>
        </div>
    );
}

export default function StaffPage() {
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);

    const [form, setForm] = useState(EMPTY);

    const [busy, setBusy] = useState(false);

    const [ok, setOk] = useState('');
    const [error, setError] = useState('');

    // Load Staff

    const load = useCallback(async () => {
        try {
            const data = await listStaff();

            console.log('Staff API Response:', data);

            setStaff(
                Array.isArray(data?.staff)
                    ? data.staff
                    : Array.isArray(data?.items)
                        ? data.items
                        : []
            );
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);


    useEffect(() => {
        load();
    }, [load]);

    // Notifications
    const notify = (okMsg, errMsg) => {
        setOk(okMsg);
        setError(errMsg);
    };

    // Input Handler
    const set = (key) => (e) =>
        setForm((f) => ({
            ...f,
            [key]: e.target.value,
        }));

    // Create Staff
    async function handleCreate(e) {
        e.preventDefault();

        notify('', '');
        setBusy(true);

        try {
            await createStaff({
                name: form.name.trim(),
                email: form.email.trim(),
                password: form.password,
                bio: form.bio.trim(),
            });

            setForm(EMPTY);

            notify(
                'New staff member added successfully.',
                ''
            );

            await load();
        } catch (err) {
            notify('', err.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="min-h-screen bg-slate-50/70 p-4 sm:p-6 lg:p-8">

            {/* Page Header */}
            <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">
                        Staff Management
                    </h1>

                    <p className="mt-1 text-sm text-slate-500">
                        Manage your team, profiles and working schedules.
                    </p>
                </div>

                <div className="flex items-center gap-3 self-start rounded-xl border border-indigo-100 bg-white px-4 py-3 shadow-sm sm:self-auto">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-lg">
                        👥
                    </div>

                    <div>
                        <p className="text-xs font-medium text-slate-500">
                            Total Staff
                        </p>

                        <p className="text-lg font-bold text-slate-800">
                            {staff.length}
                        </p>
                    </div>
                </div>

            </div>

            {/* Notifications */}
            <div className="mb-5">
                <Flash ok={ok} error={error} />
            </div>

            {/* Add Staff Card */}
            <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">

                <div className="mb-6 flex items-center gap-3">

                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-2xl text-indigo-600">
                        +
                    </div>

                    <div>
                        <h2 className="text-lg font-bold text-slate-800">
                            Add New Staff Member
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Create a new staff account and assign login credentials.
                        </p>
                    </div>

                </div>

                <form onSubmit={handleCreate}>

                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

                        <div>
                            <label htmlFor="n-name" className={labelClass}>
                                Full Name
                            </label>

                            <input
                                id="n-name"
                                type="text"
                                className={inputClass}
                                value={form.name}
                                onChange={set('name')}
                                required
                                minLength={2}
                                placeholder="Enter full name"
                            />
                        </div>

                        <div>
                            <label htmlFor="n-email" className={labelClass}>
                                Email Address
                            </label>

                            <input
                                id="n-email"
                                type="email"
                                className={inputClass}
                                value={form.email}
                                onChange={set('email')}
                                required
                                placeholder="example@email.com"
                            />
                        </div>

                        <div>
                            <label htmlFor="n-pass" className={labelClass}>
                                Password
                            </label>

                            <input
                                id="n-pass"
                                type="password"
                                className={inputClass}
                                value={form.password}
                                onChange={set('password')}
                                required
                                minLength={8}
                                placeholder="Minimum 8 characters"
                            />
                        </div>

                        <div>
                            <label htmlFor="n-bio" className={labelClass}>
                                Professional Bio
                            </label>

                            <input
                                id="n-bio"
                                type="text"
                                className={inputClass}
                                value={form.bio}
                                onChange={set('bio')}
                                maxLength={300}
                                placeholder="Enter short bio (optional)"
                            />
                        </div>

                    </div>

                    {/* Form Actions */}
                    <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5">

                        <button
                            type="submit"
                            disabled={busy}
                            className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-100 transition hover:-translate-y-0.5 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {busy ? 'Adding Staff...' : '+ Add Staff Member'}
                        </button>

                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => setForm(EMPTY)}
                            className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                        >
                            Clear Form
                        </button>

                    </div>
                </form>
            </div>

            {/* Staff List */}
            <div className="mb-5">
                <h2 className="text-xl font-bold text-slate-800">
                    Team Members
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                    View and manage all registered staff members.
                </p>
            </div>

            {/* Loading */}
            {loading ? (

                <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-12">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />

                    <p className="mt-4 text-sm font-medium text-slate-500">
                        Loading staff members...
                    </p>
                </div>

            ) : staff.length === 0 ? (

                /* Empty State */
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center">

                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">
                        👥
                    </div>

                    <h3 className="text-lg font-bold text-slate-800">
                        No Staff Members Found
                    </h3>

                    <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                        You haven't added any staff members yet.
                        Use the form above to add your first team member.
                    </p>

                </div>

            ) : (

                /* Staff Cards */
                <div className="grid grid-cols-1 gap-6">
                    {staff.map((member) => (
                        <StaffCard
                            key={member.id}
                            member={member}
                            onChanged={load}
                            notify={notify}
                        />
                    ))}
                </div>
            )}

        </div>
    );
}
