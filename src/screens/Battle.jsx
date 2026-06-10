import { useEffect, useRef, useState } from 'react';
import { SCHOOLS } from '../data/schools.js';
import '../styles/battle.css';

export default function Battle({ schoolIndex = 0, onExit }) {
  const [loading, setLoading] = useState(true);
  const frameRef = useRef(null);
  const school = SCHOOLS[schoolIndex] ?? SCHOOLS[0];
  const src = `/arcane-modular.html?school=${schoolIndex}&autostart=1`;

  useEffect(() => {
    function onMessage(event) {
      const data = event.data;
      if (!data || typeof data !== 'object') return;
      if (data.type === 'sm:battle-started') setLoading(false);
      if (data.type === 'sm:battle-ended') onExit?.();
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [onExit]);

  // Fallback: if the game doesn't post a start message, clear the loader on iframe load.
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 4000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="battle-screen">
      <div className="battle-topbar">
        <span className="battle-tag" style={{ color: school.colorVar }}>
          <span className="battle-tag__rune">{school.rune}</span>
          {school.name}
        </span>
        <button type="button" className="vellum-btn battle-exit" onClick={() => onExit?.()}>
          ◄ Voltar ao Lobby
        </button>
      </div>

      <iframe
        ref={frameRef}
        className="battle-frame"
        src={src}
        title={`Batalha · ${school.name}`}
        onLoad={() => { /* game posts sm:battle-started; timeout is the fallback */ }}
      />

      {loading && (
        <div className="battle-loading">
          <div className="battle-loading__rune" style={{ color: school.colorVar }}>{school.rune}</div>
          <div className="battle-loading__text">Abrindo o sigilo de {school.name}…</div>
        </div>
      )}
    </div>
  );
}
