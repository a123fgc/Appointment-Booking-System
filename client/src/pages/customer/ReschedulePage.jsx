import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { myBookings, getSlots, rescheduleBooking } from '../../api/bookings.js';
import SlotPicker from '../../components/SlotPicker.jsx';
import Flash from '../../components/Flash.jsx';
import { formatDateTime, formatDateStr, todayStr, addDays } from '../../utils/date.js';

export default function ReschedulePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  const [date, setDate] = useState(todayStr());
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [selected, setSelected] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Is appointment ki maloomat lao
  useEffect(() => {
    myBookings()
      .then((data) => {
        const found = data.upcoming.find((b) => String(b.id) === String(id));
        if (!found) {
          navigate('/customer/appointments', {
            replace: true,
            state: { error: 'Appointment not found or can no longer be modified.' },
          });
          return;
        }
        if (!found.can_change) {
          navigate('/customer/appointments', {
            replace: true,
            state: { error: 'Appointments cannot be changed less than 2 hours before the scheduled time.' },
          });
          return;
        }
        setBooking(found);
        // Din ki shuruat purani appointment ke din se (agar woh guzar chuka ho to aaj se)
        const old = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(
          new Date(found.start_time),
        );
        setDate(old < todayStr() ? todayStr() : old);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  // Naye din ke khali slots lao (purani booking ka apna waqt bhi khali ginta hai)
  useEffect(() => {
    if (!booking || !date) return;

    let active = true;
    getSlots({
      serviceId: booking.service_id,
      staffId: booking.staff_id,
      date,
    })
      .then((data) => active && setSlots(data.slots))
      .catch((err) => {
        if (active) {
          setSlots([]);
          setError(err.message);
        }
      })
      .finally(() => active && setLoadingSlots(false));

    return () => {
      active = false;
    };
  }, [booking, date, refreshKey]);

  async function handleConfirm() {
    setError('');
    setSubmitting(true);
    try {
      const slot = slots.find((item) => item.start === selected);
      if (!slot) {
        throw new Error('This time slot is not available. Please select another time..');
      }
      await rescheduleBooking(booking.id, date, slot.time);
      navigate('/customer/appointments', {
        state: { ok: 'Appointment time updated successfully.' },
      });
    } catch (err) {
      setError(err.message);
      setSelected('');
      setLoadingSlots(true);
      setRefreshKey((k) => k + 1); // slot lag gaya ho to list taza karo
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p>Loading...</p>;
  if (!booking) return <Flash error={error || 'Appointment not found.'} />;

  return (
    <>
      <div className="page-head">
        <h1>Reschedule Appointment</h1>
        <Link className="btn btn-ghost" to="/customer/appointments">
          ← Back
        </Link>
      </div>

      <Flash error={error} />

      <div className="card">
        <h3>Current Appointment</h3>
        <p>
          <strong>{booking.service_name}</strong> with <strong>{booking.staff_name}</strong>
          <br />
          <span className="muted">{formatDateTime(booking.start_time)}</span>
        </p>
      </div>

      <div className="card">
        <h3>Select New Date</h3>
        <div className="field" style={{ maxWidth: 240 }}>
          <input
            type="date"
            value={date}
            min={todayStr()}
            max={addDays(todayStr(), 60)}
            onChange={(e) => {
              const nextDate = e.target.value || todayStr();
              setDate(nextDate);
              setSlots([]);
              setSelected('');
              setLoadingSlots(true);
              setError('');
            }}
          />
        </div>
        <p className="muted">{formatDateStr(date)}</p>
      </div>

      <div className="card">
        <h3>Select New Time Slot</h3>
        <SlotPicker slots={slots} value={selected} onChange={setSelected} loading={loadingSlots} />

        {selected && (
          <div style={{ marginTop: 20 }}>
            <button className="btn" onClick={handleConfirm} disabled={submitting}>
              {submitting ? 'Saving...' : 'Confirm New Time'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}