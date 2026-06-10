import { useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import Menu from './screens/Menu.jsx';
import Lobby from './screens/Lobby.jsx';
import Battle from './screens/Battle.jsx';
import OneiricTransition from './components/OneiricTransition.jsx';
import DevTelemetry from './components/DevTelemetry.jsx';
import { SCHOOLS } from './data/schools.js';

export default function App() {
  const [screen, setScreen] = useState('menu');
  const [schoolIndex, setSchoolIndex] = useState(0);
  const [transitioning, setTransitioning] = useState(false);

  const goLobby = useCallback(() => setScreen('lobby'), []);
  const goMenu = useCallback(() => setScreen('menu'), []);
  const goBattle = useCallback((index) => {
    setSchoolIndex(index);
    setScreen('battle');
    setTransitioning(true);
  }, []);
  const endTransition = useCallback(() => setTransitioning(false), []);

  const battleSchool = SCHOOLS[schoolIndex] ?? SCHOOLS[0];

  let screenEl;
  if (screen === 'lobby') {
    screenEl = <Lobby onBack={goMenu} onEnterBattle={goBattle} initialSchool={schoolIndex} />;
  } else if (screen === 'battle') {
    screenEl = <Battle schoolIndex={schoolIndex} onExit={goLobby} />;
  } else {
    screenEl = <Menu onStart={goLobby} />;
  }

  return (
    <>
      {screenEl}
      <AnimatePresence>
        {transitioning && (
          <OneiricTransition
            key="oneiric"
            color={battleSchool.colorVar}
            rune={battleSchool.rune}
            schoolName={battleSchool.name}
            onComplete={endTransition}
          />
        )}
      </AnimatePresence>
      {import.meta.env.DEV && <DevTelemetry />}
    </>
  );
}
