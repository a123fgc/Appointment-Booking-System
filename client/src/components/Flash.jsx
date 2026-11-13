
import { useEffect } from 'react';

export default function Flash({ ok, error, duration = 2000, onClear }) {
    useEffect(() => {
        if (!ok && !error) return;

        const timer = setTimeout(() => {
            onClear?.();
        }, duration);

        return () => clearTimeout(timer);
    }, [ok, error, duration, onClear]);

    if (!ok && !error) return null;

    return (
        <div className={`flash ${error ? 'err' : 'ok'}`}>
            {error || ok}
        </div>
    );
}
