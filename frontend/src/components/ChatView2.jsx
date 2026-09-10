import { useEffect, useRef, useState } from 'react';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import DebugPanel from './DebugPanel';
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

  const scrollRef = useRef(null);
  const typewriterRef = useRef(null);

  useEffect(() => {
    return () => clearInterval(typewriterRef.current);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [mensajes, streamingTexto, escribiendo]);

  function reiniciarConversacion() {
    clearInterval(typewriterRef.current);
    setMensajes([]);
    setStreamingTexto(null);
    setEscribiendo(false);
    setError(null);
    setUltimoPayload(null);
    setSessionId(nuevaSessionId());
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
        {mensajes.length === 0 && !escribiendo && streamingTexto === null && (
          <div className="mensaje-estado sutil">
            Escribe un mensaje para empezar la conversación con {agente.nombre}.
          </div>
        )}

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
