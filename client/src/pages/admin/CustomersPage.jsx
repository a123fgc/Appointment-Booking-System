import { useEffect, useState } from 'react';
import { listCustomerBookings, listCustomers } from '../../api/customers.js';
import useDebounce from '../../hooks/useDebounce.js';
import Flash from '../../components/Flash.jsx';
import Pagination from '../../components/Pagination.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import { formatDateTime } from '../../utils/date.js';
import { money } from '../../utils/format.js';

const PAGE_SIZE = 10;

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [customers, setCustomers] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [history, setHistory] = useState({ items: [], total: 0 });
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const debouncedSearch = useDebounce(search, 400);

  useEffect(() => {
    let active = true;
    listCustomers({
      q: debouncedSearch.trim() || undefined,
      page,
      limit: PAGE_SIZE,
    })
      .then((data) => {
        if (active) setCustomers(data);
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [debouncedSearch, page]);

  useEffect(() => {
    if (selectedId === null) return undefined;
    let active = true;
    listCustomerBookings(selectedId, { page: historyPage, limit: PAGE_SIZE })
      .then((data) => {
        if (active) setHistory(data);
      })
      .catch((err) => {
        if (active) setHistoryError(err.message);
      })
      .finally(() => {
        if (active) setHistoryLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedId, historyPage]);

  function handleSearch(value) {
    setSearch(value);
    setPage(1);
    setLoading(true);
    setError('');
  }

  function showBookings(customerId) {
    setSelectedId(customerId === selectedId ? null : customerId);
    setHistoryPage(1);
    setHistory({ items: [], total: 0 });
    setHistoryLoading(customerId !== selectedId);
    setHistoryError('');
  }

  const pages = Math.max(1, Math.ceil(customers.total / PAGE_SIZE));
  const bookingPages = Math.max(1, Math.ceil(history.total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3 rounded-2xl bg-gradient-to-r from-violet-700 to-violet-900 p-6 text-white shadow-lg">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Customers</h1>
          <p className="mt-1 text-sm text-white/80">Customer accounts and their appointment history</p>
        </div>
        <span className="rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-sm font-semibold">
          {customers.total} total
        </span>
      </header>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <label className="sr-only" htmlFor="customer-search">Search customers</label>
        <input
          id="customer-search"
          type="search"
          value={search}
          onChange={(event) => handleSearch(event.target.value)}
          placeholder="Search by customer name or email"
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-violet-600 focus:bg-white focus:ring-4 focus:ring-violet-600/10"
        />
      </div>

      {error && <Flash error={error} />}

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                <th className="px-5 py-3.5 font-semibold">Customer</th>
                <th className="px-5 py-3.5 font-semibold">Joined</th>
                <th className="px-5 py-3.5 font-semibold">Appointments</th>
                <th className="px-5 py-3.5 font-semibold">History</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={4} className="px-5 py-12 text-center text-gray-500">Loading customers...</td></tr>
              ) : customers.items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-14 text-center">
                    <p className="text-3xl">👥</p>
                    <p className="mt-2 font-semibold text-gray-700">No customers found</p>
                    <p className="text-sm text-gray-500">Try another name or email</p>
                  </td>
                </tr>
              ) : customers.items.map((customer) => (
                <tr key={customer.id} className="transition hover:bg-violet-50/50">
                  <td className="px-5 py-3.5">
                    <div className="font-semibold text-gray-900">{customer.name}</div>
                    <div className="text-xs text-gray-500">{customer.email}</div>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-gray-700">
                    {formatDateTime(customer.created_at)}
                  </td>
                  <td className="px-5 py-3.5 text-gray-700">{customer.booking_count}</td>
                  <td className="px-5 py-3.5">
                    <button
                      type="button"
                      className="rounded-lg border border-violet-200 px-3 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-50"
                      onClick={() => showBookings(customer.id)}
                    >
                      {selectedId === customer.id ? 'Hide history' : 'View history'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && customers.total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 px-5 py-3">
            <p className="text-sm text-gray-500">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, customers.total)} of {customers.total} customers
            </p>
            <Pagination page={page} pages={pages} onChange={(nextPage) => {
              setPage(nextPage);
              setLoading(true);
            }} />
          </div>
        )}
      </section>

      {selectedId !== null && (
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="text-lg font-bold text-gray-900">Appointment history</h2>
          </div>
          {historyError && <div className="p-5"><Flash error={historyError} /></div>}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3 font-semibold">Service</th>
                  <th className="px-5 py-3 font-semibold">Staff</th>
                  <th className="px-5 py-3 font-semibold">Price</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {historyLoading ? (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-500">Loading appointment history...</td></tr>
                ) : history.items.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-500">No appointments found for this customer.</td></tr>
                ) : history.items.map((booking) => (
                  <tr key={booking.id}>
                    <td className="whitespace-nowrap px-5 py-3.5">{formatDateTime(booking.start_time)}</td>
                    <td className="px-5 py-3.5">{booking.service_name}</td>
                    <td className="px-5 py-3.5">{booking.staff_name}</td>
                    <td className="px-5 py-3.5">{money(booking.price_cents / 100)}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={booking.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!historyLoading && history.total > 0 && (
            <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-5 py-3">
              <p className="text-sm text-gray-500">
                {(historyPage - 1) * PAGE_SIZE + 1}–{Math.min(historyPage * PAGE_SIZE, history.total)} of {history.total} appointments
              </p>
              <Pagination page={historyPage} pages={bookingPages} onChange={(nextPage) => {
                setHistoryPage(nextPage);
                setHistoryLoading(true);
              }} />
            </div>
          )}
        </section>
      )}
    </div>
  );
}
