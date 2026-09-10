const { obtenerCatalogo } = require('../shared/blobCatalogo');

/**
 * GET /api/getAgentes
 *
 * Devuelve el catálogo de agentes leído del blob agentes.json.
 * Este es el único punto de contacto del frontend con el origen de datos:
 * si mañana el catálogo se migra a Table Storage (con formulario de alta),
 * solo cambia la implementación interna de obtenerCatalogo(), no este contrato.
 */
module.exports = async function (context, req) {
  try {
    const agentes = await obtenerCatalogo(context);
    context.res = {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
      body: agentes,
    };
  } catch (err) {
    context.res = {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
      body: { error: 'No se pudo cargar el catálogo de agentes.' },
    };
  }
};
