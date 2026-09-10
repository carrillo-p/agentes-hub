/**
 * foundryAdapter.js
 *
 * Traduce la interfaz única sendMessage(agentId, message, sessionId) a
 * llamadas concretas contra Azure AI Foundry Agent Service.
 *
 * STUB: la integración real (autenticación, endpoint del proyecto Foundry,
 * creación/reutilización de threads) se resuelve en la fase de conexión
 * técnica. Por ahora devuelve una respuesta simulada para poder probar
 * el flujo completo de UI end-to-end.
 *
 * `agenteConfig` es el objeto "config" de ese agente tal como viene del
 * catálogo (endpoint, referencia a la credencial, etc.) — nunca hardcodear
 * aquí valores de un agente concreto, para que el traspaso a un tenant de
 * cliente sea solo cambiar esa config.
 */

async function enviarMensaje({ agenteConfig, message, sessionId }) {
  // TODO (fase de integración): sustituir por llamada real al SDK/REST de
  // Azure AI Foundry Agent Service usando agenteConfig.endpoint y la
  // credencial referenciada en agenteConfig.agentKeyRef (leída de Key Vault
  // o de App Settings, nunca del propio JSON del catálogo).

  const textoSimulado =
    `[Foundry · stub] He recibido: "${message}". ` +
    `Aquí respondería el agente real usando el endpoint configurado en Foundry Agent Service.`;

  return {
    text: textoSimulado,
    raw: {
      backend: 'foundry',
      endpoint: agenteConfig?.endpoint || '(sin configurar)',
      sessionId,
      simulado: true,
    },
  };
}

module.exports = { enviarMensaje };
