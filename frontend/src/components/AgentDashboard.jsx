import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const COLORES = ['#0000D0', '#FF3184', '#6B6E85', '#16B364', '#E8A317'];

function PanelBarras({ titulo, categorias }) {
  return (
    <div className="dashboard-panel">
      <div className="dashboard-panel-title">{titulo}</div>
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={categorias} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="nombre"
            tick={{ fontSize: 10.5, fill: 'var(--texto-secundario)' }}
            axisLine={{ stroke: 'var(--borde)' }}
            tickLine={false}
            interval={0}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 10.5, fill: 'var(--texto-secundario)' }}
            axisLine={false}
            tickLine={false}
            width={24}
          />
          <Tooltip
            cursor={{ fill: 'var(--fondo)' }}
            contentStyle={{
              fontSize: 12,
              border: '1px solid var(--borde)',
              borderRadius: 3,
              fontFamily: 'Arial, sans-serif',
            }}
          />
          <Bar dataKey="cantidad" radius={[3, 3, 0, 0]} maxBarSize={40}>
            {categorias.map((_, idx) => (
              <Cell key={idx} fill={COLORES[idx % COLORES.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function PanelKPI({ titulo, valor }) {
  return (
    <div className="dashboard-panel dashboard-panel-kpi">
      <div className="dashboard-panel-title">{titulo}</div>
      <div className="dashboard-kpi-valor">{valor}</div>
    </div>
  );
}

export default function AgentDashboard({ data }) {
  if (!data || !Array.isArray(data.paneles) || data.paneles.length === 0) return null;

  return (
    <div className="agent-dashboard">
      <div className={`agent-dashboard-grid paneles-${data.paneles.length}`}>
        {data.paneles.map((panel, idx) =>
          panel.tipo === 'kpi' ? (
            <PanelKPI key={idx} titulo={panel.titulo} valor={panel.valor} />
          ) : (
            <PanelBarras key={idx} titulo={panel.titulo} categorias={panel.categorias} />
          )
        )}
      </div>
    </div>
  );
}
