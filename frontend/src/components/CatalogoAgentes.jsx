import { useEffect, useState } from 'react';
import AgentCard from './AgentCard';
import { getAgentes } from '../services/agentService';

export default function CatalogoAgentes({ onSeleccionarAgente }) {
  const [agentes, setAgentes] = useState([]);
  const [filtro, setFiltro] = useState('todos');
  const [estado, setEstado] = useState('cargando'); // cargando | listo | error

  useEffect(() => {
    getAgentes()
      .then((data) => {
        setAgentes(data);
        setEstado('listo');
      })
      .catch(() => setEstado('error'));
  }, []);

  const agentesFiltrados = agentes.filter((a) => {
    if (filtro === 'todos') return true;
    return a.backend === filtro;
  });

  return (
    <>
      <header>
        <div className="brand">
          <div className="brand-mark" />
          <div className="brand-name">
            hub<span>agentes</span>
          </div>
        </div>
        <div className="env-tag">Uso interno · Preventa</div>
      </header>

      <div className="intro">
        <h1>Agentes disponibles para demo</h1>
        <p>
          Catálogo interno de agentes de IA listos para mostrar en reuniones comerciales.
          Elige un agente y pulsa Probar para abrir una conversación en vivo.
        </p>
      </div>

      <div className="toolbar">
        <button className={filtro === 'todos' ? 'filtro activo' : 'filtro'} onClick={() => setFiltro('todos')}>
          Todos
        </button>
        <button className={filtro === 'foundry' ? 'filtro activo' : 'filtro'} onClick={() => setFiltro('foundry')}>
          Foundry
        </button>
        <button
          className={filtro === 'copilot_studio' ? 'filtro activo' : 'filtro'}
          onClick={() => setFiltro('copilot_studio')}
        >
          Copilot Studio
        </button>
        <span className="contador">
          {estado === 'listo' ? `${agentesFiltrados.length} agentes` : ''}
        </span>
      </div>

      {estado === 'cargando' && <div className="mensaje-estado">Cargando catálogo…</div>}

      {estado === 'error' && (
        <div className="mensaje-estado error">
          No se pudo cargar el catálogo de agentes. Comprueba la conexión o inténtalo de nuevo.
        </div>
      )}

      {estado === 'listo' && (
        <div className="grid">
          {agentesFiltrados.map((agente) => (
            <AgentCard key={agente.id} agente={agente} onProbar={onSeleccionarAgente} />
          ))}

          <div className="card card-add" role="button" tabIndex={0}>
            <div className="plus">+</div>
            <span className="label">Añadir nuevo agente</span>
          </div>
        </div>
      )}
    </>
  );
}
