import { useEffect, useState } from 'react';
import { getAllBookings } from '../../api/bookings';
import { CalendarSearch } from 'lucide-react';
import useDebounce from '../../hooks/useDebounce';
// import { formatDate, formatTime } from '../../utils/format';
import StatusBadge from '../../components/StatusBadge';
import Pagination from '../../components/Pagination';
import Avatar from '../../components/Avatar';
import Flash from '../../components/Flash';
const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const formatTime = (iso) =>
  new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
const PAGE_SIZE = 10;
const STATUSES = ['all', 'confirmed', 'completed', 'cancelled', 'no_show'];

/* Sirf design ke liye: status ke pill ka rang */
const PILL_ACTIVE = {
  all: 'bg-violet-700 text-white shadow-violet-700/30',
  confirmed: 'bg-sky-600 text-white shadow-sky-600/30',
  completed: 'bg-emerald-600 text-white shadow-emerald-600/30',
  cancelled: 'bg-rose-600 text-white shadow-rose-600/30',
  no_show: 'bg-orange-600 text-white shadow-orange-600/30',
};

function SearchIcon() {
  return (
    <svg className="pointer-events-none absolute left-3.5 h-5 w-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function SkeletonRows() {
  return [...Array(6)].map((_, i) => (
    <tr key={i} className="animate-pulse">
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-gray-200" />
          <div className="space-y-2">
            <div className="h-3 w-28 rounded bg-gray-200" />
            <div className="h-2.5 w-36 rounded bg-gray-100" />
          </div>
        </div>
      </td>
      {[...Array(5)].map((_, j) => (
        <td key={j} className="px-5 py-4">
          <div className="h-3 w-20 rounded bg-gray-200" />
        </td>
      ))}
    </tr>
  ));
}

export default function BookingsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const debouncedSearch = useDebounce(search, 400);

  function handleSearchChange(value) {
    setSearch(value);
    setPage(1);
    setLoading(true);
    setError('');
  }

  function handleStatusChange(value) {
    setStatus(value);
    setPage(1);
    setLoading(true);
    setError('');
  }

  function handlePageChange(value) {
    setPage(value);
    setLoading(true);
    setError('');
  }
  useEffect(() => {
    window.lucide?.createIcons();
  }, []);
  useEffect(() => {
    let cancelled = false;

    getAllBookings({
      q: debouncedSearch.trim() || undefined,
      status: status === 'all' ? undefined : status,
      page,
      limit: PAGE_SIZE,
    })
      .then((res) => {
        if (!cancelled) setData({ items: res.items || [], total: res.total || 0 });
      })
      .catch((err) => {
        if (!cancelled) setError(err?.response?.data?.error || err.message || 'Bookings load nahi huin');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, status, page]);

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  /* Naya: "1–10 of 42" dikhane ke liye */
  const from = data.total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, data.total);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-2xl bg-gradient-to-r from-violet-700 to-violet-900 p-6 text-white shadow-lg">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Bookings</h1>
          <p className="mt-1 text-sm text-white/80">Search and Filter Appointments</p>
        </div>
        <span className="rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-sm font-semibold backdrop-blur">
          {data.total} total
        </span>
      </div>

      {/* Toolbar */}
      <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex flex-1 items-center">
            <SearchIcon />
            <input
              type="search"
              className="w-full rounded-xl border-[1.5px] border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-[15px] text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-violet-600 focus:bg-white focus:ring-4 focus:ring-violet-600/10"
              placeholder="Search the customer, service, or staff..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>

          {/* Chhoti screen par dropdown */}
          <select
            className="rounded-xl border-[1.5px] border-gray-200 bg-gray-50 px-4 py-3 text-[15px] capitalize text-gray-800 outline-none transition focus:border-violet-600 focus:ring-4 focus:ring-violet-600/10 md:hidden"
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === 'all' ? 'All status' : s}
              </option>
            ))}
          </select>
        </div>

        {/* Bari screen par pill buttons (wahi setStatus) */}
        <div className="hidden flex-wrap gap-2 md:flex">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => handleStatusChange(s)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold capitalize transition ${status === s
                ? `${PILL_ACTIVE[s]} shadow-md`
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              {s === 'all' ? 'All status' : s}
            </button>
          ))}
        </div>
      </div>

      {error && <Flash error={error} />}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                <th className="px-5 py-3.5 font-semibold">Customer</th>
                <th className="px-5 py-3.5 font-semibold">Service</th>
                <th className="px-5 py-3.5 font-semibold">Staff</th>
                <th className="px-5 py-3.5 font-semibold">Date</th>
                <th className="px-5 py-3.5 font-semibold">Time</th>
                <th className="px-5 py-3.5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <SkeletonRows />
              ) : data.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-gray-500">
                    <p className="text-5xl flex justify-center">
                      <CalendarSearch
                      size={48}
                      strokeWidth={1.5}
                      className="text-gray-400"
                    /></p>
                    <h3 className="mt-2 font-semibold text-gray-700">No Appointments Found</h3>
                    <p className="text-sm text-gray-500">Try a different search or update your filters to find appointments</p>
                  </td>
                </tr>
              ) : (
                data.items.map((b) => (
                  <tr key={b.id} className="transition hover:bg-violet-50/50">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={b.customer_name} size={36} />
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-gray-900">{b.customer_name}</div>
                          <div className="truncate text-xs text-gray-500">{b.customer_email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-gray-800">{b.service_name}</td>
                    <td className="px-5 py-3.5 text-gray-700">{b.staff_name}</td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-gray-700">
                      {formatDate(b.start_time)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-gray-700">
                      {formatTime(b.start_time)} – {formatTime(b.end_time)}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={b.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {!loading && data.total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 px-5 py-3">
            <p className="text-sm text-gray-500">
              <span className="font-semibold text-gray-700">{from}–{to}</span> of{' '}
              <span className="font-semibold text-gray-700">{data.total}</span> bookings
            </p>
            {totalPages > 1 && (
              <Pagination page={page} pages={totalPages} onChange={handlePageChange} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}