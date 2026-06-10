import { useEffect, useState } from 'react';
import { useBrowserPerformanceMetrics } from 'goflow-core';
import '../styles/telemetry.css';

// Dev-only overlay backed by goflow-core's real browser telemetry hook
// (web-vitals + PerformanceObserver). Plumbing only — styled in Arcane Vellum,
// no Liquid Glass. Toggle with Shift+D. Hidden by default.
export default function DevTelemetry() {
  const [open, setOpen] = useState(false);
  const metrics = useBrowserPerformanceMetrics();

  useEffect(() => {
    function onKey(e) {
      if (e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!open) return null;

  const signals = metrics?.signals ?? {};
  const entries = Object.entries(signals);

  return (
    <aside className="telemetry" role="status" aria-label="Telemetria (dev)">
      <div className="telemetry__head">
        <span>Telemetria · goflow</span>
        <button type="button" className="telemetry__close" onClick={() => setOpen(false)} aria-label="Fechar">×</button>
      </div>
      {entries.length === 0 ? (
        <div className="telemetry__row"><span>coletando…</span></div>
      ) : (
        entries.map(([key, sig]) => (
          <div className="telemetry__row" key={key}>
            <span className="telemetry__key">{key}</span>
            <span className="telemetry__val">
              {sig?.value ?? '—'}{sig?.unit ? ` ${sig.unit}` : ''}
            </span>
            <span className={`telemetry__status telemetry__status--${sig?.rating || sig?.status || 'na'}`}>
              {sig?.rating || sig?.status || ''}
            </span>
          </div>
        ))
      )}
      <div className="telemetry__hint">Shift+D para alternar</div>
    </aside>
  );
}
