import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { myBookings, cancelBooking } from '../../api/bookings.js';
import Flash from '../../components/Flash.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import { formatDateTime } from '../../utils/date.js';
import { money } from '../../utils/format.js';

export default function MyAppointmentsPage() {
  const location = useLocation();

  const [upcoming, setUpcoming] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ok, setOk] = useState(location.state?.ok || '');
  const [error, setError] = useState(location.state?.error || '');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await myBookings();
      setUpcoming(data.upcoming);
      setHistory(data.history);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    myBookings()
      .then((data) => {
        if (active) {
          setUpcoming(data.upcoming);
          setHistory(data.history);
        }
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
  }, []);

  async function handleCancel(b) {
    if (!window.confirm(`"${b.service_name}" ki appointment cancel karni hai?`)) return;
    setOk('');
    setError('');
    setBusyId(b.id);
    try {
      await cancelBooking(b.id);
      setOk('Appointment cancel ho gayi.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
      load(); // list dobara lao, chahe kamyabi ho ya error
    }
  }

  if (loading) return <p>Loading...</p>;

  return (
    <>
      <div className="page-head">
        <h1>Meri appointments</h1>
        <Link className="btn" to="/customer/book">
          + Nayi booking
        </Link>
      </div>

      <Flash ok={ok} error={error} />

      <div className="card">
        <h3>Upcoming Appointments</h3>
        {upcoming.length === 0 ? (
          <p className="empty card">No Upcoming Appointments</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Kab</th>
                  <th>Service</th>
                  <th>Staff</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map((b) => (
                  <tr key={b.id}>
                    <td>{formatDateTime(b.start_time)}</td>
                    <td>{b.service_name}</td>
                    <td>{b.staff_name}</td>
                    <td>{money(b.price)}</td>
                    <td>
                      <StatusBadge status={b.status} />
                    </td>
                    <td>
                      {b.can_change ? (
                        <div className="row">
                          <Link
                            className="btn btn-ghost btn-sm"
                            to={`/customer/appointments/${b.id}/reschedule`}
                          >
                            Reschedule
                          </Link>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleCancel(b)}
                            disabled={busyId === b.id}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <span className="muted">2 ghante se kam reh gaye, tabdeeli nahi ho sakti</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h3>Past Appointments</h3>
        {history.length === 0 ? (
          <p className="empty ">No Past Appointments</p>
        ) : (
          <div className="table-wrap card">
            <table className="table">
              <thead>
                <tr>
                  <th>Selected Date & Time</th>
                  <th>Service</th>
                  <th>Staff</th>
                  <th>Price</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((b) => (
                  <tr key={b.id}>
                    <td>{formatDateTime(b.start_time)}</td>
                    <td>{b.service_name}</td>
                    <td>{b.staff_name}</td>
                    <td>{money(b.price)}</td>
                    <td>
                      <StatusBadge status={b.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}