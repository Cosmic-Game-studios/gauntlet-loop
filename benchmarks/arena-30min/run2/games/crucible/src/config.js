// Shared constants and palette (Director-owned). Import what you need; do not edit - request changes in your return.
export const PALETTE = {
  sky: 0x2a3446, fog: 0x3a4052, keyLight: 0xffc38a, fillLight: 0x6fb7c9,
  floor: 0x4a4d55, wall: 0x6b6f7a, trim: 0xd98c3a, accent: 0x38e0d0,
  rusher: 0xff4a2a, shooter: 0xb84aff, projectile: 0xff5cf0, playerFx: 0xffe08a,
};
export const TICK = 1 / 60;
export const PLAYER = { height: 1.7, radius: 0.35, walk: 6, sprint: 9.5, jump: 6.5, gravity: 20, maxHealth: 100 };
export const WEAPONS = {
  rifle: { mag: 30, reserve: 90, rpm: 600, damage: 22, reload: 1.8, spread: 0.012, recoil: 0.018 },
  shotgun: { mag: 6, reserve: 24, pellets: 8, pump: 0.8, damage: 14, reload: 2.4, spread: 0.07, recoil: 0.06 },
};
export const WAVES = [
  { rushers: 3, shooters: 1, hpMul: 1.0, speedMul: 1.0, dmgMul: 1.0 },
  { rushers: 5, shooters: 2, hpMul: 1.1, speedMul: 1.05, dmgMul: 1.1 },
  { rushers: 6, shooters: 3, hpMul: 1.2, speedMul: 1.1, dmgMul: 1.2 },
  { rushers: 8, shooters: 4, hpMul: 1.35, speedMul: 1.15, dmgMul: 1.3 },
  { rushers: 10, shooters: 5, hpMul: 1.5, speedMul: 1.2, dmgMul: 1.4 },
];
export const WAVE_BREAK = 5;
export const ENEMY = { rusher: { hp: 60, speed: 6.5, dmg: 12 }, shooter: { hp: 90, speed: 3.5, dmg: 10, projSpeed: 14, range: [10, 18] } };
