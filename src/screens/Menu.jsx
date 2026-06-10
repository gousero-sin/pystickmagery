export default function Menu({ onStart }) {
  return (
    <div className="screen menu-screen">
      <div className="menu-vignette" aria-hidden="true" />
      <main className="menu-card">
        <img className="menu-logo" src="/assets/logo-mark.svg" alt="StickMageryBattle" width={120} height={120} />
        <h1 className="menu-title">StickMagery</h1>
        <p className="menu-sub">— Battle —</p>
        <p className="menu-flavor">
          O grimório está selado. Escolha sua escola, abra o sigilo e enfrente o que nascer do pergaminho.
        </p>
        <button type="button" className="vellum-btn vellum-btn--arcane" onClick={onStart}>
          <span className="vellum-btn__rune">✦</span>
          <span>Entrar no Grimório</span>
        </button>
      </main>
      <footer className="menu-foot">— SIGILO DE ENTRADA · PRESSIONE PARA ABRIR —</footer>
    </div>
  );
}
