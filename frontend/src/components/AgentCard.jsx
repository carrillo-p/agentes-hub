const BACKEND_LABEL = {
  foundry: 'Foundry',
  copilot_studio: 'Copilot Studio',
};

const ESTADO_LABEL = {
  operativo: 'Operativo',
  mantenimiento: 'Mantenimiento',
};

export default function AgentCard({ agente, onProbar }) {
  const esCopilot = agente.backend === 'copilot_studio';

  return (
    <div className={`card ${esCopilot ? 'copilot' : ''}`}>
      <div className="card-top">
        <span className={`badge ${esCopilot ? 'copilot' : ''}`}>
          <span className="badge-dot" />
          {BACKEND_LABEL[agente.backend] ?? agente.backend}
        </span>
        <span className="sector">{agente.sector}</span>
      </div>

      <h3>{agente.nombre}</h3>
      <p>{agente.descripcion}</p>

      <div className="card-footer">
        <span className="estado-op">
          <span className={`estado-dot ${agente.estado === 'mantenimiento' ? 'mantenimiento' : ''}`} />
          {ESTADO_LABEL[agente.estado] ?? agente.estado}
        </span>
        <button
          className="btn-probar"
          onClick={() => onProbar(agente)}
          disabled={agente.estado === 'mantenimiento'}
        >
          Probar →
        </button>
      </div>
    </div>
  );
}
