/**
 * Mini-gráfica de tendencia en SVG puro (sin recharts) — las tarjetas
 * KPI son pequeñas y hay varias en pantalla a la vez, así que evitar
 * el peso de una librería de gráficas completa por cada una mantiene
 * el Dashboard ligero.
 */
export default function Sparkline({ data = [], color = "#0d9488", height = 32, width = 90 }) {
  if (!data || data.length < 2) {
    return <div style={{ height, width }} />;
  }

  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const step = width / (data.length - 1);

  const points = data.map((v, i) => `${i * step},${height - ((v - min) / range) * height}`).join(" ");
  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <polyline points={areaPoints} fill={color} opacity="0.08" />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
