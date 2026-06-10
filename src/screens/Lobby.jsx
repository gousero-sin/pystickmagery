import { useState } from 'react';
import { SCHOOLS, FAMILIES, TOTAL_SCHOOLS, formatCd } from '../data/schools.js';
import '../styles/lobby.css';

export default function Lobby({ onBack, onEnterBattle, initialSchool = 0 }) {
  const [selected, setSelected] = useState(initialSchool);
  const school = SCHOOLS[selected] ?? SCHOOLS[0];

  return (
    <div className="screen">
      <div className="lobby">
        <header className="lobby-header">
          <button type="button" className="lobby-brand" onClick={onBack} title="Voltar ao menu">
            <img src="/assets/logo-mark.svg" alt="StickMageryBattle" />
            <span className="lobby-brand-text">
              <span className="lobby-brand-name">StickMagery</span>
              <span className="lobby-brand-sub">— Battle —</span>
            </span>
          </button>
        </header>

        <div className="lobby-spread">
          {/* ROSTER */}
          <section className="lobby-panel">
            <div className="lobby-panel-header">
              <h2 className="lobby-panel-title">Escolas de Magia</h2>
              <span className="lobby-panel-meta">{TOTAL_SCHOOLS} disponíveis</span>
            </div>
            {FAMILIES.map((family) => (
              <div className="family-section" key={family.label}>
                <div className="family-label">— {family.label} —</div>
                <div className="school-grid">
                  {family.schools.map((s) => (
                    <button
                      type="button"
                      key={s.index}
                      className={`school${s.index === selected ? ' active' : ''}`}
                      style={{ color: s.colorVar }}
                      onClick={() => setSelected(s.index)}
                      title={s.name}
                    >
                      <span className="school-rune">{s.rune}</span>
                      <span className="school-name">{s.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </section>

          {/* DETAIL */}
          <section className="lobby-panel">
            <div className="detail-head">
              <div className="sigil" style={{ borderColor: school.colorVar }}>
                <span className="sigil-corner tl" /><span className="sigil-corner tr" />
                <span className="sigil-corner bl" /><span className="sigil-corner br" />
                <span className="sigil-rune" style={{ color: school.colorVar }}>{school.rune}</span>
              </div>
              <div className="class-meta">
                <div className="class-eyebrow">Escola Selecionada · {school.count} magias</div>
                <h1 className="class-name">{school.name}</h1>
                <p className="class-flavor">{school.flavor}</p>
              </div>
            </div>

            <div className="vitals">
              <div className="vital vital-hp">
                <div className="vital-head"><span className="vital-label">HP</span><span className="vital-value">120 / 120</span></div>
                <div className="sm-bar"><div className="sm-bar__fill" style={{ width: '100%' }} /></div>
              </div>
              <div className="vital vital-mana">
                <div className="vital-head"><span className="vital-label">Mana</span><span className="vital-value">140 / 140</span></div>
                <div className="sm-bar sm-bar--mana"><div className="sm-bar__fill" style={{ width: '100%' }} /></div>
              </div>
            </div>

            <div className="book-header">
              <h3 className="book-title">Spellbook</h3>
              <span className="book-hint">{school.count} MAGIAS REAIS</span>
            </div>
            <div className="spellbook">
              {school.spells.map((sp, i) => (
                <div className="spell" key={`${sp.name}-${i}`}>
                  <div className="spell-icon" style={{ color: school.colorVar }}>{school.rune}</div>
                  <div className="spell-body">
                    <div className="spell-name" title={sp.name}>{sp.name}</div>
                    <div className="spell-stats">
                      {sp.category ? <span className="spell-cat">{sp.category}</span> : null}
                      {sp.dmg > 0 ? <span>DMG {sp.dmg}</span> : null}
                      <span>MP {sp.mana ?? '—'}</span>
                      <span>CD {formatCd(sp.cd)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="lobby-actions">
              <button type="button" className="vellum-btn" onClick={onBack}>Voltar</button>
              <button type="button" className="vellum-btn vellum-btn--arcane" onClick={() => onEnterBattle(school.index)}>
                <span className="vellum-btn__rune">⚔</span>
                <span>Iniciar Duelo · {school.name}</span>
              </button>
            </div>
          </section>
        </div>

        <div className="lobby-foot">— ESCOLA SELADA · SIGILO DE {school.name.toUpperCase()} LACRADO —</div>
      </div>
    </div>
  );
}
