const { obtenerCatalogo } = require('../shared/blobCatalogo');
const foundryAdapter = require('../adapters/foundryAdapter');
const copilotStudioAdapter = require('../adapters/copilotStudioAdapter');

const ADAPTERS = {
  foundry: foundryAdapter,
  copilot_studio: copilotStudioAdapter,
};

/**
 * POST /api/sendMessage
 * body: { agentId, message, sessionId }
 *
 * Backend fino: esta es la ÚNICA función que el frontend conoce para
 * conversar con cualquier agente. Internamente busca el agente en el
 * catálogo, identifica su backend (foundry | copilot_studio) y delega
 * en el adaptador correspondiente. El frontend nunca sabe ni le importa
 * cuál de los dos es.
 */
module.exports = async function (context, req) {
  const { agentId, message, sessionId } = req.body || {};

  if (!agentId || !message || !sessionId) {
    context.res = {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
      body: { error: 'Faltan campos obligatorios: agentId, message, sessionId.' },
    };
    return;
  }

  let catalogo;
  try {
    catalogo = await obtenerCatalogo(context);
  } catch (err) {
    context.res = {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
      body: { error: 'No se pudo cargar el catálogo de agentes para resolver este mensaje.' },
    };
    return;
  }

  const agente = catalogo.find((a) => a.id === agentId);
  if (!agente) {
    context.res = {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
      body: { error: `No existe ningún agente con id "${agentId}" en el catálogo.` },
    };
    return;
  }

  const adapter = ADAPTERS[agente.backend];
  if (!adapter) {
    context.res = {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
      body: { error: `Backend desconocido "${agente.backend}" para el agente "${agentId}".` },
    };
    return;
  }

  try {
    const respuesta = await adapter.enviarMensaje({
      agenteConfig: agente.config,
      message,
      sessionId,
    });

    context.res = {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: respuesta, // { text, raw }
    };
  } catch (err) {
    context.log.error(`Error llamando al backend de "${agentId}":`, err.message);
    context.res = {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
      body: { error: 'El agente no respondió correctamente. Inténtalo de nuevo.' },
    };
  }
};
