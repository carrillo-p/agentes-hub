/**
 * agentService.js
 *
 * Única puerta de entrada del frontend hacia el backend.
 * El frontend nunca sabe si un agente vive en Foundry o en Copilot Studio;
 * esa diferencia la resuelve el backend fino (ver /api/sendMessage).
 */

const API_BASE = '/api';

/**
 * Obtiene el catálogo de agentes.
 * Hoy lee de un blob JSON vía la Function getAgentes; el día que se
 * migre a Table Storage + formulario, este contrato no cambia.
 */
export async function getAgentes() {
  const res = await fetch(`${API_BASE}/getAgentes`);
  if (!res.ok) {
    throw new Error(`No se pudo cargar el catálogo (HTTP ${res.status})`);
  }
  return res.json();
}

/**
 * Envía un mensaje a un agente concreto y devuelve la respuesta completa.
 * El streaming "máquina de escribir" se simula en el componente de chat
 * a partir de esta respuesta ya completa (no hay streaming real de red).
 *
 * @param {string} agentId - id del agente tal como aparece en el catálogo
 * @param {string} message - texto escrito por el usuario
 * @param {string} sessionId - id de la conversación actual (se genera al abrir el chat)
 * @returns {Promise<{ text: string, raw: object }>} texto de respuesta + payload crudo (para modo debug)
 */
export async function sendMessage(agentId, message, sessionId) {
  const res = await fetch(`${API_BASE}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId, message, sessionId }),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || `Error del agente (HTTP ${res.status})`);
  }

  return res.json(); // { text, raw }
}

/**
 * Genera un identificador de sesión simple para una nueva conversación.
 * Suficiente para uso interno de demo; no pretende ser un UUID criptográfico.
 */
export function nuevaSessionId() {
  return `demo-${Math.random().toString(36).slice(2, 8)}`;
}
