// ═══════════════════════════════════════════════════════
// sounds.js — SoundFX utility (Web Audio API)
// ═══════════════════════════════════════════════════════

const _ac = new (window.AudioContext || window.webkitAudioContext)();

// Navegadores suspendem o AudioContext até o primeiro gesto do usuário.
// Retoma no primeiro clique/tecla para o áudio funcionar no jogo desktop.
// (Guardas opcionais mantêm os testes em Node, que stubbam `window`, funcionando.)
const _resumeAudio = () => { try { if (_ac.state === 'suspended') _ac.resume(); } catch (e) {} };
window.addEventListener?.('pointerdown', _resumeAudio);
window.addEventListener?.('keydown', _resumeAudio);

export const SoundFX = {
  playTone(freq, type = 'sine', vol = 0.2, dur = 0.1) {
    try {
      const o = _ac.createOscillator(), g = _ac.createGain();
      o.connect(g); g.connect(_ac.destination);
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(vol, _ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, _ac.currentTime + dur);
      o.start(); o.stop(_ac.currentTime + dur);
    } catch (e) {}
  },

  playSweep(f1, f2, type = 'sine', vol = 0.2, dur = 0.2) {
    try {
      const o = _ac.createOscillator(), g = _ac.createGain();
      o.connect(g); g.connect(_ac.destination);
      o.type = type;
      o.frequency.setValueAtTime(f1, _ac.currentTime);
      o.frequency.exponentialRampToValueAtTime(f2, _ac.currentTime + dur);
      g.gain.setValueAtTime(vol, _ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, _ac.currentTime + dur);
      o.start(); o.stop(_ac.currentTime + dur);
    } catch (e) {}
  },

  playNoise(vol = 0.2, dur = 0.1, freq = 400, filter = 'bandpass', Q = 1) {
    try {
      const buf = _ac.createBuffer(1, _ac.sampleRate * dur, _ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const src = _ac.createBufferSource();
      src.buffer = buf;
      const f = _ac.createBiquadFilter(), g = _ac.createGain();
      f.type = filter; f.frequency.value = freq; f.Q.value = Q;
      src.connect(f); f.connect(g); g.connect(_ac.destination);
      g.gain.setValueAtTime(vol, _ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, _ac.currentTime + dur);
      src.start(); src.stop(_ac.currentTime + dur);
    } catch (e) {}
  },
};
