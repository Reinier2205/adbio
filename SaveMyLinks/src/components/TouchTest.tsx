import React, { useRef } from 'react';

export default function TouchTest() {
  const boxRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = () => {
    console.log('touchstart');
  };
  const handleTouchMove = () => {
    console.log('touchmove');
  };
  const handleTouchEnd = () => {
    console.log('touchend');
  };

  return (
    <div
      ref={boxRef}
      style={{
        width: 200,
        height: 100,
        background: 'orange',
        margin: 40,
        borderRadius: 16,
        touchAction: 'pan-y',
        WebkitUserSelect: 'none',
        userSelect: 'none',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      Touch me!
    </div>
  );
} 