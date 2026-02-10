import React from 'react';
import { GameScene } from './components/World';
import { UIOverlay } from './components/UIOverlay';
import { Loader } from '@react-three/drei';

function App() {
  return (
    <div className="w-screen h-screen relative overflow-hidden select-none">
      <GameScene />
      <UIOverlay />
      <Loader containerStyles={{ background: '#FDF6E3', zIndex: 1000 }} innerStyles={{ background: '#8D6E63', width: '200px', height: '10px' }} barStyles={{ background: '#AED581', height: '10px' }} dataInterpolation={(p) => `Loading... ${p.toFixed(0)}%`} />
    </div>
  );
}

export default App;