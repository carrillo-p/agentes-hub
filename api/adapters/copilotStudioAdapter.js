/**
 * copilotStudioAdapter.js
 *
 * Traduce la interfaz única sendMessage(agentId, message, sessionId) a
 * llamadas concretas contra el canal Direct Line de un bot de Copilot Studio.
 *
 * STUB: la integración real (obtención de token de Direct Line, apertura
 * de conversación, polling o websocket de actividades) se resuelve en la
 * fase de conexión técnica. Por ahora devuelve una respuesta simulada.
 *
 * `agenteConfig` es el objeto "config" de ese agente tal como viene del
 * catálogo — nunca hardcodear aquí el secret de un bot concreto.
 */

async function enviarMensaje({ agenteConfig, message, sessionId }) {
  // TODO (fase de integración): sustituir por llamada real a Direct Line API
  // (POST /conversations, POST /conversations/{id}/activities) usando el
  // secret referenciado en agenteConfig.agentKeyRef.

  const textoSimulado =
    `[Copilot Studio · stub] He recibido: "${message}". ` +
    `Aquí respondería el bot real a través del canal Direct Line configurado.`;

  return {
    text: textoSimulado,
    raw: {
      backend: 'copilot_studio',
      endpoint: agenteConfig?.endpoint || '(sin configurar)',
      sessionId,
      simulado: true,
    },
  };
}

module.exports = { enviarMensaje };
