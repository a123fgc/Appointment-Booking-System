import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);
const ICONS = { success: CheckCircle2, error: XCircle, warning: AlertTriangle, info: Info };

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const timers = useRef(new Map());
  const activeKeys = useRef(new Map());
  const dismiss = useCallback((id) => {
    for (const [key, activeId] of activeKeys.current) {
      if (activeId === id) activeKeys.current.delete(key);
    }
    setItems((current) => current.map((item) => item.id === id ? { ...item, leaving: true } : item));
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.set(id, setTimeout(() => {
      setItems((current) => current.filter((item) => item.id !== id));
      timers.current.delete(id);
    }, 180));
  }, []);
  const add = useCallback((type, message) => {
    const text = String(message ?? '').trim();
    if (!text) return;
    const key = `${type}:${text}`;
    if (activeKeys.current.has(key)) return;
    const id = `${Date.now()}-${Math.random()}`;
    activeKeys.current.set(key, id);
    setItems((current) => [...current, { id, type, message: text, leaving: false }]);
    timers.current.set(id, setTimeout(() => dismiss(id), 2000));
  }, [dismiss]);
  const toast = useMemo(() => ({
    success: (message) => add('success', message),
    error: (message) => add('error', message),
    warning: (message) => add('warning', message),
    info: (message) => add('info', message),
  }), [add]);
  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-region" aria-live="polite" aria-relevant="additions removals">
        {items.map(({ id, type, message, leaving }) => {
          const Icon = ICONS[type];
          return <div key={id} className={`toast toast-${type}${leaving ? ' toast-leaving' : ''}`} role={type === 'error' ? 'alert' : 'status'}>
            <Icon className="toast-icon" size={21} aria-hidden="true" />
            <span className="toast-message">{message}</span>
            <button className="toast-close" type="button" aria-label="Dismiss notification" onClick={() => dismiss(id)}><X size={18} /></button>
          </div>;
        })}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
}
