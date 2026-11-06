export function BackgroundFX() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      {/* paper dot-grid */}
      <div className="absolute inset-0 dotgrid" />
      {/* faint paper shading, top-left light source */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(252,250,244,0.9)_0%,transparent_55%)]" />
    </div>
  );
}
