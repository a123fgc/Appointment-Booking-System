
import { useCallback, useEffect, useState } from 'react';
import {
    listServices,
    createService,
    updateService,
    setServiceActive,
} from '../../api/services.js';
import Flash from '../../components/Flash.jsx';
import { money } from '../../utils/format.js';

const EMPTY = { name: '', duration_min: '', price: '' };

function ServiceRow({
    service,
    onSave,
    onToggle,
    saveBusy,
    toggleBusy,
}) {
    const [editing, setEditing] = useState(false);

    const [form, setForm] = useState({
        name: service.name,
        duration_min: service.durationMin,
        price: service.priceCents / 100,
    });

    const set = (key) => (e) =>
        setForm((f) => ({ ...f, [key]: e.target.value }));

    async function save() {
        const done = await onSave(service.id, form);

        if (done) {
            setEditing(false);
        }
    }

    function cancel() {
        setForm({
            name: service.name,
            duration_min: service.durationMin,
            price: service.priceCents / 100,
        });

        setEditing(false);
    }

    return (
        <tr style={!service.active ? { opacity: 0.55 } : undefined}>
            {editing ? (
                <>
                    <td>
                        <input
                            value={form.name}
                            onChange={set('name')}
                        />
                    </td>

                    <td>
                        <input
                            type="number"
                            min="5"
                            max="480"
                            value={form.duration_min}
                            onChange={set('duration_min')}
                            style={{ width: 90 }}
                        />
                    </td>

                    <td>
                        <input
                            type="number"
                            min="0"
                            step="1"
                            value={form.price}
                            onChange={set('price')}
                            style={{ width: 110 }}
                        />
                    </td>

                    <td>
                        {service.active ? 'Active' : 'Inactive'}
                    </td>

                    <td>
                        <div className="row">
                            <button
                                type="button"
                                className="btn btn-sm"
                                onClick={save}
                                disabled={saveBusy}
                            >
                                {saveBusy ? 'Saving...' : 'Save'}
                            </button>

                            <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={cancel}
                                disabled={saveBusy}
                            >
                                Cancel
                            </button>
                        </div>
                    </td>
                </>
            ) : (
                <>
                    <td>{service.name}</td>

                    <td>{service.durationMin} min</td>

                    <td>{money(service.priceCents / 100)}</td>

                    <td>
                        {service.active ? 'Active' : 'Inactive'}
                    </td>

                    <td>
                        <div className="row">
                            <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => setEditing(true)}
                                disabled={toggleBusy}
                            >
                                Edit
                            </button>

                            <button
                                type="button"
                                className={`btn btn-sm ${
                                    service.active
                                        ? 'btn-warn'
                                        : 'btn-success'
                                }`}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onToggle(service);
                                }}
                                disabled={toggleBusy}
                            >
                                {toggleBusy
                                    ? 'loading...'
                                    : service.active
                                        ? 'Stop'
                                        : 'Start'}
                            </button>
                        </div>
                    </td>
                </>
            )}
        </tr>
    );
}

export default function ServicesPage() {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);

    const [form, setForm] = useState(EMPTY);

    // Separate loading states
    const [createBusy, setCreateBusy] = useState(false);
    const [savingId, setSavingId] = useState(null);
    const [togglingId, setTogglingId] = useState(null);

    const [ok, setOk] = useState('');
    const [error, setError] = useState('');

    // Search and filter
    const [q, setQ] = useState('');
    const [filter, setFilter] = useState('all');

    // Load services
    const load = useCallback(async () => {
        try {
            const data = await listServices(true);
            setServices(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const set = (key) => (e) =>
        setForm((f) => ({ ...f, [key]: e.target.value }));

    const clearFlash = useCallback(() => {
        setOk('');
        setError('');
    }, []);

    // Add service
    async function handleCreate(e) {
        e.preventDefault();

        if (createBusy) return;

        setOk('');
        setError('');
        setCreateBusy(true);

        try {
            await createService({
                name: form.name.trim(),
                duration_min: Number(form.duration_min),
                price: Number(form.price),
            });

            setForm(EMPTY);
            setOk('Nayi service add ho gayi.');

            await load();
        } catch (err) {
            setError(err.message);
        } finally {
            setCreateBusy(false);
        }
    }

    // Update service
    async function handleSave(id, data) {
        if (savingId !== null) return false;

        setOk('');
        setError('');
        setSavingId(id);

        try {
            await updateService(id, {
                name: String(data.name).trim(),
                duration_min: Number(data.duration_min),
                price: Number(data.price),
            });

            setOk('Service update ho gayi.');

            await load();

            return true;
        } catch (err) {
            setError(err.message);
            return false;
        } finally {
            setSavingId(null);
        }
    }

    // Start / Stop service
    async function handleToggle(service) {
        if (togglingId !== null) return;

        setOk('');
        setError('');
        setTogglingId(service.id);

        try {
            await setServiceActive(service.id, !service.active);

            setOk(
                service.active
                    ? 'Service closed.'
                    : 'Service is now active.'
            );

            await load();
        } catch (err) {
            setError(err.message);
        } finally {
            setTogglingId(null);
        }
    }

    // Safe services list
    const list = Array.isArray(services) ? services : [];

    const activeCount = list.filter(
        (s) => Boolean(s.active)
    ).length;

    const inactiveCount = list.length - activeCount;

    // Filter buttons
    const FILTERS = [
        { key: 'all', label: 'All', count: list.length },
        { key: 'active', label: 'Active', count: activeCount },
        { key: 'inactive', label: 'Inactive', count: inactiveCount },
    ];

    // Search + status filter
    const searchText = q.trim().toLowerCase();

    const filtered = list.filter((service) => {
        const matchesSearch = String(service.name || '')
            .toLowerCase()
            .includes(searchText);

        const matchesFilter =
            filter === 'all' ||
            (filter === 'active' && Boolean(service.active)) ||
            (filter === 'inactive' && !service.active);

        return matchesSearch && matchesFilter;
    });

    return (
        <>
            {/* Header */}
            <header className="mb-5 flex items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-900 px-7 py-6 text-white shadow-lg shadow-purple-900/25">
                <div>
                    <h1 className="text-2xl font-extrabold sm:text-3xl">
                        Services
                    </h1>

                    <p className="mt-1 text-sm text-white/90">
                        Add, edit, and manage your services
                    </p>
                </div>

                <span className="whitespace-nowrap rounded-full border border-white/35 bg-white/15 px-4 py-1.5 text-sm font-bold">
                    {list.length} total
                </span>
            </header>

            {/* Flash messages */}
            <Flash
                ok={ok}
                error={error}
                duration={1000}
                onClear={clearFlash}
            />

            {/* Add Service Form */}
            <section className="mb-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <h3 className="mb-4 text-base font-semibold text-gray-900">
                    Add a new Service
                </h3>

                <form
                    onSubmit={handleCreate}
                    className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end"
                >
                    <div className="flex min-w-[220px] flex-1 flex-col gap-1.5">
                        <label htmlFor="s-name" className="text-sm font-medium text-gray-700">
                            Name
                        </label>

                        <input
                            id="s-name"
                            value={form.name}
                            onChange={set('name')}
                            required
                            minLength={2}
                            placeholder="jaise Haircut"
                            className="h-11 rounded-lg border border-gray-300 px-3 text-sm outline-none transition focus:border-violet-600 focus:ring-4 focus:ring-violet-600/15"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5 sm:w-40">
                        <label htmlFor="s-dur" className="text-sm font-medium text-gray-700">
                            Time
                        </label>

                        <div className="flex h-11 overflow-hidden rounded-lg border border-gray-300 bg-white">
                            <input
                                id="s-dur"
                                type="number"
                                min="5"
                                max="480"
                                value={form.duration_min}
                                onChange={set('duration_min')}
                                required
                                className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
                            />

                            <span className="flex items-center border-l border-gray-200 bg-gray-50 px-3 text-sm text-gray-500">
                                min
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5 sm:w-44">
                        <label htmlFor="s-price" className="text-sm font-medium text-gray-700">
                            Price
                        </label>

                        <div className="flex h-11 overflow-hidden rounded-lg border border-gray-300 bg-white">
                            <span className="flex items-center border-r border-gray-200 bg-gray-50 px-3 text-sm text-gray-500">
                                Rs
                            </span>

                            <input
                                id="s-price"
                                type="number"
                                min="0"
                                step="1"
                                value={form.price}
                                onChange={set('price')}
                                required
                                className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={createBusy}
                        className="h-11 rounded-full bg-gradient-to-r from-violet-600 to-purple-700 px-6 text-sm font-bold text-white shadow-md shadow-violet-600/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {createBusy ? 'Adding...' : '+ Add Service'}
                    </button>
                </form>
            </section>

            {/* Search and Filter */}
            <section className="mb-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="relative mb-4">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm">
                        🔍
                    </span>

                    <input
                        type="search"
                        placeholder="search by name …"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3.5 text-sm outline-none transition focus:border-violet-600 focus:ring-4 focus:ring-violet-600/15"
                    />
                </div>

                <div className="flex flex-wrap gap-2.5">
                    {FILTERS.map((f) => (
                        <button
                            key={f.key}
                            type="button"
                            onClick={() => setFilter(f.key)}
                            className={
                                filter === f.key
                                    ? 'rounded-full bg-violet-700 px-4 py-2 text-sm font-bold text-white shadow-md shadow-violet-700/35'
                                    : 'rounded-full bg-gray-100 px-4 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-200'
                            }
                        >
                            {f.label}
                            <b className="ml-1 opacity-70">{f.count}</b>
                        </button>
                    ))}
                </div>
            </section>

            {/* Services Table */}
            <section className="mb-5 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                {loading ? (
                    <div className="flex flex-col items-center gap-1 px-4 py-14 text-center text-sm text-gray-500">
                        <div className="mb-1.5 text-3xl">⏳</div>
                        <strong className="text-gray-800">Loading…</strong>
                    </div>
                ) : list.length === 0 ? (
                    <div className="flex flex-col items-center gap-1 px-4 py-14 text-center text-sm text-gray-500">
                        <div className="mb-1.5 text-3xl">📭</div>

                        <strong className="text-gray-800">
                            There is no service available right now
                        </strong>

                        <span>
                            Add the first service using the form above
                        </span>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center gap-1 px-4 py-14 text-center text-sm text-gray-500">
                        <div className="mb-1.5 text-3xl">🔎</div>

                        <strong className="text-gray-800">
                            No services found
                        </strong>

                        <span>
                            Search or filter by different criteria
                        </span>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left">
                            <thead>
                                <tr className="border-b border-gray-200 bg-gray-50 text-xs font-bold uppercase tracking-wider text-gray-500">
                                    <th className="px-5 py-3.5">Name</th>
                                    <th className="px-5 py-3.5">Time</th>
                                    <th className="px-5 py-3.5">Price</th>
                                    <th className="px-5 py-3.5">Status</th>
                                    <th className="px-5 py-3.5"></th>
                                </tr>
                            </thead>

                            <tbody className="[&_td]:border-b [&_td]:border-gray-100 [&_td]:px-5 [&_td]:py-3.5 [&_td]:align-middle [&_td]:text-sm [&_tr:hover]:bg-violet-50/40 [&_tr:last-child_td]:border-b-0">
                                {filtered.map((s) => (
                                    <ServiceRow
                                        key={s.id}
                                        service={s}
                                        onSave={handleSave}
                                        onToggle={handleToggle}
                                        saveBusy={savingId === s.id}
                                        toggleBusy={togglingId === s.id}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <p className="border-t border-gray-200 bg-violet-50/40 px-5 py-3.5 text-sm leading-relaxed text-gray-600">
                    Changing a service price affects new bookings only.
                    Previous bookings retain the original price charged
                    at the time of booking.
                </p>
            </section>
        </>
    )
}
