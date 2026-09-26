"use client";
import { useEffect, useRef, useState } from "react";

// Real die layout: opposite faces sum to 7 (front=1, back=6, right=3, left=4, top=2, bottom=5).
const FACE_ANGLE = {
  1: { x: 0, y: 0 },
  2: { x: -90, y: 0 },
  3: { x: 0, y: -90 },
  4: { x: 0, y: 90 },
  5: { x: 90, y: 0 },
  6: { x: 0, y: 180 },
};

const PIP_LAYOUTS = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]],
};

function Face({ n, style }) {
  return (
    <div className="die-face" style={style}>
      {PIP_LAYOUTS[n].map(([x, y], i) => (
        <span key={i} className="die-pip" style={{ left: `${x}%`, top: `${y}%` }} />
      ))}
    </div>
  );
}

export default function Dice3D({ value, rollToken, size = 54 }) {
  const [angle, setAngle] = useState({ x: 0, y: 0 });
  const spins = useRef(0);
  const prevToken = useRef(rollToken);

  useEffect(() => {
    if (rollToken === prevToken.current) return;
    prevToken.current = rollToken;
    spins.current += 1;
    const target = FACE_ANGLE[value] || FACE_ANGLE[1];
    const extraX = 360 * (2 + (spins.current % 3));
    const extraY = 360 * (2 + ((spins.current + 1) % 3));
    setAngle({ x: extraX + target.x, y: extraY + target.y });
  }, [rollToken, value]);

  useEffect(() => {
    // Keep first paint showing the correct face without a spin.
    const target = FACE_ANGLE[value] || FACE_ANGLE[1];
    setAngle((a) => (a.x === 0 && a.y === 0 ? { x: target.x, y: target.y } : a));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const half = size / 2;
  const faceStyleBase = { width: size, height: size };

  return (
    <div className="die-scene" style={{ width: size, height: size }}>
      <div
        className="die-cube"
        style={{
          width: size,
          height: size,
          transform: `rotateX(${angle.x}deg) rotateY(${angle.y}deg)`,
        }}
      >
        <Face n={1} style={{ ...faceStyleBase, transform: `translateZ(${half}px)` }} />
        <Face n={6} style={{ ...faceStyleBase, transform: `rotateY(180deg) translateZ(${half}px)` }} />
        <Face n={3} style={{ ...faceStyleBase, transform: `rotateY(90deg) translateZ(${half}px)` }} />
        <Face n={4} style={{ ...faceStyleBase, transform: `rotateY(-90deg) translateZ(${half}px)` }} />
        <Face n={2} style={{ ...faceStyleBase, transform: `rotateX(90deg) translateZ(${half}px)` }} />
        <Face n={5} style={{ ...faceStyleBase, transform: `rotateX(-90deg) translateZ(${half}px)` }} />
      </div>
    </div>
  );
}
