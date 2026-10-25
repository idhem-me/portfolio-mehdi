/** Visual identity. Settled texture IDs start at 8, followed by the piece color index. */
export const lavaMaterial = {
  settledId: 8,
  cycleSeconds: 32,
  cyanAmount: 0.3,
  pinkAmount: 0.2,
  innerEmission: 0.48,
  innerWhite: 0.11,
  glassSpecular: 0.85,
  fresnel: 0.5,
  glassRimWidth: 0.035,
  glassRimOpacity: 0.42,
} as const;
