import { useEffect, useRef, useState } from 'react';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import DebugPanel from './DebugPanel';
import AgentDashboard from './AgentDashboard';
import { sendMessage, nuevaSessionId } from '../services/agentService';

const VELOCIDAD_TYPEWRITER_MS = 18; // ms entre caracteres al "escribir" la respuesta

const BACKEND_LABEL = {
  foundry: 'Foundry',
  copilot_studio: 'Copilot Studio',
};

function horaActual() {
  return new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatView({ agente, onVolver }) {
  const [sessionId, setSessionId] = useState(nuevaSessionId());
  const [mensajes, setMensajes] = useState([]);
  const [input, setInput] = useState('');
  const [escribiendo, setEscribiendo] = useState(false); // esperando respuesta del backend
  const [streamingTexto, setStreamingTexto] = useState(null); // texto que se está "tecleando"
  const [debugVisible, setDebugVisible] = useState(false);
  const [ultimoPayload, setUltimoPayload] = useState(null);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);

  const scrollRef = useRef(null);
  const typewriterRef = useRef(null);
  const bienvenidaEnviadaRef = useRef(false);

  useEffect(() => {
    return () => clearInterval(typewriterRef.current);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [mensajes, streamingTexto, escribiendo]);

  // Mensaje de bienvenida automático: al abrir el chat, se pide al agente
  // datos estructurados de resumen (para pintar un mini-dashboard) además
  // de una breve presentación. Si el agente no devuelve el bloque de datos
  // esperado, se cae automáticamente a mostrar solo el texto normal.
  //
  // La ref bienvenidaEnviadaRef evita que se dispare dos veces: en
  // desarrollo, React.StrictMode ejecuta los efectos de montaje dos veces
  // a propósito (para detectar efectos no idempotentes), lo que sin esta
  // protección generaría dos llamadas reales al agente y dos mensajes de
  // bienvenida duplicados.
  useEffect(() => {
    if (bienvenidaEnviadaRef.current) return;
    bienvenidaEnviadaRef.current = true;
    pedirBienvenida();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function extraerDashboard(texto) {
    // Busca un bloque ```json { ... } ``` en la respuesta y valida que
    // tenga la forma esperada (paneles de tipo "bar" o "kpi"). Si algo
    // falla, devuelve null sin lanzar error — el llamador cae a mostrar
    // solo el texto normal.
    try {
      const match = texto.match(/```json\s*([\s\S]*?)\s*```/);
      if (!match) return null;
      const datos = JSON.parse(match[1]);
      if (!Array.isArray(datos.paneles) || datos.paneles.length === 0) return null;

      const panelesValidos = datos.paneles.filter((p) => {
        if (p.tipo === 'bar') {
          return (
            typeof p.titulo === 'string' &&
            Array.isArray(p.categorias) &&
            p.categorias.length > 0 &&
            p.categorias.every((c) => typeof c.nombre === 'string' && typeof c.cantidad === 'number')
          );
        }
        if (p.tipo === 'kpi') {
          return typeof p.titulo === 'string' && typeof p.valor === 'number';
        }
        return false;
      });

      if (panelesValidos.length === 0) return null;
      return { paneles: panelesValidos.slice(0, 4) };
    } catch {
      return null;
    }
  }

  function quitarBloqueDashboard(texto) {
    // Quita el bloque ```json ... ``` del texto para que no se repita
    // literalmente debajo del gráfico.
    return texto.replace(/```json\s*[\s\S]*?\s*```/, '').trim();
  }

  async function pedirBienvenida(sessionIdParaEstaLlamada = sessionId) {
    if (escribiendo) return; // evita solapar llamadas si ya hay una bienvenida en curso
    setEscribiendo(true);
    setDashboardData(null);
    try {
      const respuesta = await sendMessage(
        agente.id,
        'Preséntate en una frase breve explicando qué puedes hacer. ' +
          'Además, ejecuta las búsquedas necesarias en DevOps para construir un panel de resumen ' +
          'con hasta 4 bloques (usa solo los que tengan sentido según los datos reales, no inventes): ' +
          '1) conteo por tipo de work item (Bug, Issue, GAP, Task...), ' +
          '2) conteo por estado agrupado (Abiertos/En progreso/Cerrados), ' +
          '3) un KPI simple del número de elementos creados o modificados HOY (usa changed_since con la fecha de hoy), ' +
          '4) conteo por prioridad (1-4). ' +
          'Antes de tu presentación en texto, incluye EXACTAMENTE un bloque de código con este formato ' +
          '(usa type "bar" para conteos por categoría y type "kpi" para un número único destacado; ' +
          'incluye solo los paneles para los que tengas datos reales, entre 1 y 4 paneles):\n\n' +
          '```json\n{"paneles": [' +
          '{"tipo": "bar", "titulo": "Por tipo", "categorias": [{"nombre": "Bug", "cantidad": 0}]}, ' +
          '{"tipo": "kpi", "titulo": "Nuevos hoy", "valor": 0}' +
          ']}\n```\n\n' +
          'Después del bloque json y de tu presentación breve, si hay elementos creados o modificados HOY ' +
          'con prioridad alta (prioridad 1 o 2), añade una sección con el título "Prioridad alta de hoy" ' +
          'y una tabla markdown con esos elementos concretos (ID como hipervínculo, tipo, título completo, ' +
          'prioridad, asignado). Si no hay ninguno, indícalo brevemente en una frase, sin inventar datos.',
        sessionIdParaEstaLlamada
      );
      setUltimoPayload(respuesta.raw ?? respuesta);
      setEscribiendo(false);

      const dashboard = extraerDashboard(respuesta.text);
      const textoLimpio = dashboard ? quitarBloqueDashboard(respuesta.text) : respuesta.text;

      if (dashboard) setDashboardData(dashboard);

      reproducirTypewriter(textoLimpio, () => {
        setMensajes((prev) => [...prev, { role: 'agent', text: textoLimpio, timestamp: horaActual() }]);
        setStreamingTexto(null);
      });
    } catch (err) {
      setEscribiendo(false);
      // Si falla la bienvenida (p.ej. backend aún no configurado), no se
      // bloquea el chat: la persona simplemente puede escribir su propio
      // primer mensaje sin que se le muestre error de bienvenida.
    }
  }

  function reiniciarConversacion() {
    clearInterval(typewriterRef.current);
    setMensajes([]);
    setStreamingTexto(null);
    setEscribiendo(false);
    setError(null);
    setUltimoPayload(null);
    setDashboardData(null);
    const nuevaSesion = nuevaSessionId();
    setSessionId(nuevaSesion);
    pedirBienvenida(nuevaSesion);
  }

  function reproducirTypewriter(textoCompleto, onFin) {
    let i = 0;
    setStreamingTexto('');
    typewriterRef.current = setInterval(() => {
      i += 1;
      setStreamingTexto(textoCompleto.slice(0, i));
      if (i >= textoCompleto.length) {
        clearInterval(typewriterRef.current);
        onFin();
      }
    }, VELOCIDAD_TYPEWRITER_MS);
  }

  async function handleEnviar() {
    const texto = input.trim();
    if (!texto || escribiendo || streamingTexto !== null) return;

    setError(null);
    setInput('');
    setMensajes((prev) => [...prev, { role: 'user', text: texto, timestamp: horaActual() }]);
    setEscribiendo(true);

    try {
      const respuesta = await sendMessage(agente.id, texto, sessionId);
      setUltimoPayload(respuesta.raw ?? respuesta);
      setEscribiendo(false);

      reproducirTypewriter(respuesta.text, () => {
        setMensajes((prev) => [...prev, { role: 'agent', text: respuesta.text, timestamp: horaActual() }]);
        setStreamingTexto(null);
      });
    } catch (err) {
      setEscribiendo(false);
      setError(err.message || 'No se pudo obtener respuesta del agente.');
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleEnviar();
  }

  const esCopilot = agente.backend === 'copilot_studio';

  return (
    <div className="app">
      <div className="chat-header">
        <button className="back-link" onClick={onVolver}>
          ← Catálogo
        </button>
        <div className="agent-id">
          {agente.nombre
            .split(' ')
            .slice(0, 2)
            .map((p) => p[0])
            .join('')
            .toUpperCase()}
        </div>
        <div className="agent-meta">
          <div className="name">
            {agente.nombre}
            <span
              className="badge-mini"
              style={{ background: esCopilot ? 'var(--magenta)' : 'var(--azul)' }}
            >
              {BACKEND_LABEL[agente.backend] ?? agente.backend}
            </span>
          </div>
          <div className="sub">
            Sector: {agente.sector} · sesión {sessionId}
          </div>
        </div>
        <div className="header-actions">
          <button
            className={`icon-btn ${debugVisible ? 'debug-on' : ''}`}
            onClick={() => setDebugVisible((v) => !v)}
          >
            ⎇ Debug
          </button>
          <button className="icon-btn" onClick={reiniciarConversacion}>
            ↺ Reiniciar
          </button>
        </div>
      </div>

      <div className="messages" ref={scrollRef}>
        {dashboardData && <AgentDashboard data={dashboardData} />}

        {mensajes.map((m, idx) => (
          <MessageBubble key={idx} role={m.role} text={m.text} timestamp={m.timestamp} />
        ))}

        {streamingTexto !== null && <MessageBubble role="agent" text={streamingTexto} streaming />}

        {escribiendo && <TypingIndicator />}

        {error && <div className="mensaje-estado error">{error}</div>}
      </div>

      <DebugPanel visible={debugVisible} ultimoPayload={ultimoPayload} />

      <div className="input-bar">
        <input
          type="text"
          placeholder="Escribe un mensaje…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={escribiendo || streamingTexto !== null}
        />
        <button
          className="send-btn"
          onClick={handleEnviar}
          disabled={escribiendo || streamingTexto !== null || !input.trim()}
        >
          Enviar
        </button>
      </div>
    </div>
  );
}
