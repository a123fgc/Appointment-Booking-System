// slots: [{ start: ISO string, label: "2:30 pm" }]
// value: chuna hua slot ka start (ya '')
export default function SlotPicker({ slots, value, onChange, loading }) {
  if (loading) return <p className="muted">Finding available appointment slots....</p>;

  if (!slots || slots.length === 0) {
    return <p className="empty">No available slots for this day. Please select another date or choose a different staff member.</p>;
  }

  return (
    <div className="slots">
      {slots.map((s) => (
        <button
          key={s.start}
          type="button"
          className={`slot ${value === s.start ? 'selected' : ''}`}
          onClick={() => onChange(s.start)}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}