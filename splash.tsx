import './index.css';

import { context, navigateTo, requestExpandedMode } from '@devvit/web/client';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

const GHOST_COLORS = ['#FF4136', '#FF69B4', '#7FDBFF', '#FF851B'];

export const Splash = () => {
  return (
    <div className="pacman-splash pacman-bg-dots flex relative flex-col justify-center items-center min-h-screen gap-7 overflow-hidden">
      <h1 className="pacman-title">PAC-MAZE DFS</h1>
      <p className="text-[#aaa] text-xs tracking-[3px] -mt-5">LABERINTOS ALEATORIOS · DFS MAZE</p>

      <div className="pacman-chase-track">
        <div className="pacman-chase-runner">
          <div className="pacman-icon" />
          {GHOST_COLORS.map((color) => (
            <div key={color} className="pacman-ghost" style={{ background: color }} />
          ))}
        </div>
      </div>

      <p className="text-white text-base text-center">
        Hola {context.username ?? 'jugador'} 👋
      </p>

      <button
        className="pacman-play-btn"
        onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
      >
        JUGAR
      </button>

      <button
        className="absolute bottom-5 cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => navigateTo('https://www.buymeacoffee.com/bardock')}
      >
        <img src="/coffee-badge.png" alt="Buy Me a Coffee" className="h-[50px] w-auto" />
      </button>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
