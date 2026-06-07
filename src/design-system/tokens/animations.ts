export const duration = {
  instant: 100,
  fast: 180,
  base: 280,
  slow: 420,
  xslow: 600,
} as const;

export const easing = {
  spring: { damping: 20, stiffness: 200, mass: 0.8 },
  springGentle: { damping: 30, stiffness: 150, mass: 1 },
  springBouncy: { damping: 12, stiffness: 200, mass: 0.8 },
} as const;
