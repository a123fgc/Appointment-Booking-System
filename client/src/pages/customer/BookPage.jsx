import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listServices } from '../../api/services.js';
import { listStaff } from '../../api/staff.js';
import { getSlots, createBooking } from '../../api/bookings.js';
import SlotPicker from '../../components/SlotPicker.jsx';
import Flash from '../../components/Flash.jsx';
import Avatar from '../../components/Avatar.jsx';
import { money } from '../../utils/format.js';
import { todayStr, addDays, formatDateStr } from '../../utils/date.js';

export default function BookPage() {
  const navigate = useNavigate();

  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loadingInit, setLoadingInit] = useState(true);

  const [serviceId, setServiceId] = useState('');
  const [staffId, setStaffId] = useState('');
  const [date, setDate] = useState(todayStr());

  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selected, setSelected] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Pehli baar: services aur staff ki list lao
  useEffect(() => {
    Promise.all([listServices(), listStaff()])
      .then(([s, st]) => {
        setServices(s.services);
        setStaff(st.staff.filter((m) => m.active));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoadingInit(false));
  }, []);

  // Jab bhi service / staff / din badle, naye slots lao
  useEffect(() => {
    setSelected('');
    if (!serviceId || !staffId || !date) {
      setSlots([]);
      return;
    }

    let active = true;
    setLoadingSlots(true);
    getSlots({ serviceId, staffId, date })
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
  }, [serviceId, staffId, date, refreshKey]);

  const service = services.find((s) => String(s.id) === String(serviceId));
  const member = staff.find((m) => String(m.id) === String(staffId));

  async function handleConfirm() {
    setError('');
    setSubmitting(true);
    try {
      await createBooking({ staffId: Number(staffId), serviceId: Number(serviceId), start: selected });
      navigate('/customer/appointments', {
        state: { ok: 'Booking confirm ho gayi! Confirmation email bhej di gayi hai.' },
      });
    } catch (err) {
      // Mumkin hai kisi aur ne yehi slot abhi book kar liya ho, is liye slots dobara lao
      setError(err.message);
      setRefreshKey((k) => k + 1);
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingInit) return <p>Loading...</p>;

  return (
    <>
      <div className="page-head">
        <h1>Appointment book karein</h1>
      </div>

      <Flash error={error} />

      <div className="card">
        <h3>1. Service aur staff chunein</h3>
        <div className="grid grid-2">
          <div className="field">
            <label htmlFor="service">Service</label>
            <select id="service" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
              <option value="">-- Service chunein --</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.duration_min} min, {money(s.price)})
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="staff">Staff member</label>
            <select id="staff" value={staffId} onChange={(e) => setStaffId(e.target.value)}>
              <option value="">-- Staff chunein --</option>
              {staff.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {member && (
          <div className="row" style={{ marginTop: 8 }}>
            <Avatar src={member.photo_url} name={member.name} size={48} />
            <div>
              <strong>{member.name}</strong>
              <div className="muted">{member.bio}</div>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h3>2. Din chunein</h3>
        <div className="field" style={{ maxWidth: 240 }}>
          <input
            type="date"
            value={date}
            min={todayStr()}
            max={addDays(todayStr(), 60)}
            onChange={(e) => setDate(e.target.value || todayStr())}
          />
        </div>
        {date && <p className="muted">{formatDateStr(date)}</p>}
      </div>

      <div className="card">
        <h3>3. Time slot chunein</h3>
        {!serviceId || !staffId ? (
          <p className="muted">Pehle service aur staff chunein.</p>
        ) : (
          <SlotPicker slots={slots} value={selected} onChange={setSelected} loading={loadingSlots} />
        )}

        {selected && service && member && (
          <div style={{ marginTop: 20 }}>
            <p>
              <strong>{service.name}</strong> with <strong>{member.name}</strong> on{' '}
              <strong>{formatDateStr(date)}</strong> ({money(service.price)})
            </p>
            <button className="btn" onClick={handleConfirm} disabled={submitting}>
              {submitting ? 'Book ho raha hai...' : 'Booking confirm karein'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}