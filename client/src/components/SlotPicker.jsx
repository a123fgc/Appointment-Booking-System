// slots: [{ start: ISO string, label: "2:30 pm" }]
// value: chuna hua slot ka start (ya '')
export default function SlotPicker({ slots, value, onChange, loading }) {
  if (loading) return <p className="muted">Slots dhoond rahe hain...</p>;

  if (!slots || slots.length === 0) {
    return <p className="empty">Is din koi slot khali nahi hai. Koi aur din ya staff chunein.</p>;
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