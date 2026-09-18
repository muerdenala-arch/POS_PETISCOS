// Sombra/glow del logo cuando flota directamente sobre el fondo (sin placa/tarjeta detrás).
// Se define como propiedad `filter` completa (no la utilidad `drop-shadow-*` de Tailwind)
// porque en oscuro son DOS drop-shadows apiladas — la utilidad de Tailwind solo admite una,
// ya que ambas escriben la misma variable CSS y se pisarían entre sí.
export const logoGlowClasses =
  '[filter:drop-shadow(0_6px_14px_rgba(0,0,0,0.15))] dark:[filter:drop-shadow(0_0_18px_rgba(255,255,255,0.18))_drop-shadow(0_8px_16px_rgba(0,0,0,0.6))]';
