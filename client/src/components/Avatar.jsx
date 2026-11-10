import { initials } from '../utils/format.js';

export default function Avatar({ src, name, size = 64 }) {
  const style = { width: size, height: size, fontSize: size * 0.35 };

  if (src) {
    return <img className="avatar" src={src} alt={name} style={style} />;
  }
  return (
    <div className="avatar" style={style}>
      {initials(name)}
    </div>
  );
}