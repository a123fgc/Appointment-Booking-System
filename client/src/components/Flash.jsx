// Istemal: <Flash ok="Save ho gaya" />  ya  <Flash error="Kuch galat hua" />
export default function Flash({ ok, error }) {
  if (!ok && !error) return null;
  return <div className={`flash ${error ? 'err' : 'ok'}`}>{error || ok}</div>;
}