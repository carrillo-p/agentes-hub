/**
 * foundryAdapter.js
 *
 * Traduce la interfaz única sendMessage(agentId, message, sessionId) a
 * llamadas REST directas contra Azure AI Foundry Agent Service — "New
 * Foundry" (agentes identificados por NOMBRE + VERSIÓN vía agent_reference).
 *
 * Se usa fetch directo en vez del SDK @azure/ai-projects porque, en la
 * versión actual del SDK, getOpenAIClient() fuerza autenticación por
 * token (Entra ID) internamente y no admite API key de forma fiable
 * (confirmado probando en este proyecto). El patrón REST de abajo SÍ
 * está verificado y funcionando contra el proyecto y agente reales.
 *
 * El agente ya tiene sus instrucciones y tools (search_work_items,
 * get_work_item_detail, text_search vía OpenAPI) configuradas del lado
 * del servidor en Foundry; aquí solo lo invocamos por nombre+versión.
 *
 * Variables de entorno necesarias (Static Web App → Environment variables):
 *   FOUNDRY_PROJECT_ENDPOINT   → https://recurso.services.ai.azure.com/api/projects/proyecto
 *   FOUNDRY_API_KEY            → API key del proyecto (Keys and Endpoint)
 *   FOUNDRY_AGENT_NAME         → nombre exacto del agente (ej. "devops-calaf")
 *   FOUNDRY_AGENT_VERSION      → versión del agente (ej. "2")
 *
 * NOTA DE DEUDA TÉCNICA (documentada a propósito):
 * Esta autenticación usa API key en texto plano vía variable de entorno,
 * igual que ya se hace con Blob Storage y con la function key de DevOps.
 * La vía "más correcta" a futuro es Managed Identity + DefaultAzureCredential
 * (sin secreto que gestionar), pero requiere configurar identidad
 * administrada en el Static Web App y rol RBAC en el proyecto Foundry —
 * trabajo de infraestructura no urgente para uso interno, pendiente para
 * una iteración posterior sin presión de tiempo.
 */

const PROJECT_ENDPOINT = process.env.FOUNDRY_PROJECT_ENDPOINT;
const API_KEY = process.env.FOUNDRY_API_KEY;
const AGENT_NAME = process.env.FOUNDRY_AGENT_NAME;
const AGENT_VERSION = process.env.FOUNDRY_AGENT_VERSION;

// Historial en memoria de proceso, por sesión, para dar contexto multi-turno.
// (Este patrón de responses no usa "conversations" del lado servidor de
// forma confirmada, así que reenviamos el historial como input cada vez.)
const historialPorSesion = new Map();

function validarConfig() {
  const faltantes = [];
  if (!PROJECT_ENDPOINT) faltantes.push('FOUNDRY_PROJECT_ENDPOINT');
  if (!API_KEY) faltantes.push('FOUNDRY_API_KEY');
  if (!AGENT_NAME) faltantes.push('FOUNDRY_AGENT_NAME');
  if (faltantes.length > 0) {
    throw new Error(`Faltan variables de entorno: ${faltantes.join(', ')}`);
  }
}

async function enviarMensaje({ agenteConfig, message, sessionId }) {
  validarConfig();

  const historial = historialPorSesion.get(sessionId) || [];

  // El "input" de la API acepta texto plano para un único turno, pero para
  // mantener contexto multi-turno lo tratamos como una charla: reenviamos
  // el texto acumulado de forma simple y legible para el modelo.
  const turnoActual = { role: 'user', content: message };
  const historialCompleto = [...historial, turnoActual];

  // Construimos el input como texto conversacional simple (la API de este
  // proyecto acepta "input" como string; para dar contexto multi-turno sin
  // depender de "conversations" del lado servidor, componemos el texto
  // completo del intercambio como una única entrada).
  const inputTexto = historialCompleto
    .map((turno) => (turno.role === 'user' ? `Usuario: ${turno.content}` : `Asistente: ${turno.content}`))
    .join('\n\n');

  const url = `${PROJECT_ENDPOINT}/openai/v1/responses`;

  const body = {
    input: inputTexto,
    agent_reference: {
      name: AGENT_NAME,
      type: 'agent_reference',
      ...(AGENT_VERSION ? { version: AGENT_VERSION } : {}),
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const textoError = await res.text().catch(() => '');
    throw new Error(`Foundry respondió ${res.status}: ${textoError}`);
  }

  const data = await res.json();

  // El texto de la respuesta viene en output[0].content[0].text
  // (no en un campo output_text de nivel superior).
  const mensajeAsistente = (data.output || []).find((item) => item.type === 'message' && item.role === 'assistant');
  const bloqueTexto = mensajeAsistente?.content?.find((c) => c.type === 'output_text');
  const textoRespuesta = bloqueTexto?.text || '(El agente no devolvió texto en este turno.)';

  historialPorSesion.set(sessionId, [
    ...historialCompleto,
    { role: 'assistant', content: textoRespuesta },
  ]);

  // IMPORTANTE: el objeto "raw" de aquí abajo es lo único que llega al
  // panel de Debug del frontend (modo visible en preventa técnica). Nunca
  // se debe incluir aquí el objeto `data` completo de Foundry: contiene el
  // prompt/instructions íntegro del agente, el spec OpenAPI de las tools
  // (incluida la referencia interna a la connection de Azure), y detalles
  // de content-filtering — ninguno de esos datos es apto para mostrar en
  // una demo comercial. Solo se exponen campos de resumen, explícitos uno
  // a uno.
  return {
    text: textoRespuesta,
    raw: {
      backend: 'foundry',
      modo: 'rest-directo',
      agentName: AGENT_NAME,
      agentVersion: AGENT_VERSION || null,
      responseId: data.id,
      sessionId,
      turnosEnHistorial: historialCompleto.length,
      tokensUsados: data.usage?.total_tokens ?? null,
    },
  };
}

module.exports = { enviarMensaje };