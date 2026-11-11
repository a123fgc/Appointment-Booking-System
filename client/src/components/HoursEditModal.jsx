import { useState } from 'react';
import { saveStaffHours } from '../api/staff.js';
import Flash from './Flash.jsx';
import { WEEKDAYS } from '../utils/date.js';

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Monday se Sunday
const DEFAULT_HOURS = { start: '09:00', end: '18:00' };

// Backend ke hours array ko 7 din ke object mein badalta hai
function toState(hours = []) {
  const state = {};
  for (let d = 0; d < 7; d++) state[d] = { start: '', end: '' };
  hours.forEach((h) => {
    state[h.weekday] = { start: h.start.slice(0, 5), end: h.end.slice(0, 5) };
  });
  return state;
}

export default function HoursEditModal({ member, onClose, onSaved }) {
  const [hours, setHours] = useState(() => toState(member.hours));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const setDay = (d, key, value) =>
    setHours((h) => ({ ...h, [d]: { ...h[d], [key]: value } }));

  // Mon–Sat 9 se 6, Sunday off
  function applyDefault() {
    const state = {};
    for (let d = 0; d < 7; d++) {
      state[d] = d === 0 ? { start: '', end: '' } : { ...DEFAULT_HOURS };
    }
    setHours(state);
  }

  async function handleSave(e) {
    e.preventDefault();

    const list = [];
    for (const d of DAY_ORDER) {
      const { start, end } = hours[d];
      if (!start && !end) continue; // off din
      if (!start || !end) {
        setError(`${WEEKDAYS[d]}: shuruat aur khatam, dono waqt likhein ya dono khali chhorein.`);
        return;
      }
      if (end <= start) {
        setError(`${WEEKDAYS[d]}: khatam ka waqt shuruat ke baad ka hona chahiye.`);
        return;
      }
      list.push({ weekday: d, start, end });
    }

    setError('');
    setSaving(true);
    try {
      await saveStaffHours(member.id, list);
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="card modal" onClick={(e) => e.stopPropagation()}>
        <h3>{member.name} ke kaam ke ghante</h3>
        <Flash error={error} />

        <form onSubmit={handleSave}>
          <div className="hours-grid">
            {DAY_ORDER.map((d) => (
              <div key={d} style={{ display: 'contents' }}>
                <strong>{WEEKDAYS[d]}</strong>
                <input
                  type="time"
                  value={hours[d].start}
                  onChange={(e) => setDay(d, 'start', e.target.value)}
                />
                <input
                  type="time"
                  value={hours[d].end}
                  onChange={(e) => setDay(d, 'end', e.target.value)}
                />
              </div>
            ))}
          </div>
          <p className="muted" style={{ marginTop: 8 }}>Jis din dono khane khali hon, us din staff off hoga.</p>

          <div className="row" style={{ marginTop: 16 }}>
            <button className="btn btn-sm" type="submit" disabled={saving}>
              {saving ? 'Save ho raha hai...' : 'Save'}
            </button>
            <button className="btn btn-ghost btn-sm" type="button" onClick={applyDefault}>
              Default 9 se 6
            </button>
            <button className="btn btn-ghost btn-sm right" type="button" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}