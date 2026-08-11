import React from 'react';

export default function Logo({ height = 42 }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', userSelect: 'none' }}>
      <img
        src="/logo.png"
        alt="Brasil Trade Agro"
        style={{
          height: `${height}px`,
          width: 'auto',
          display: 'block',
          objectFit: 'contain'
        }}
      />
    </div>
  );
}
