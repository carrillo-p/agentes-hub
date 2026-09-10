const { BlobServiceClient } = require('@azure/storage-blob');

/**
 * Lee agentes.json del contenedor de Blob Storage.
 *
 * Resiliencia deliberada: como el archivo se edita a mano en el portal,
 * un error de sintaxis JSON no debe tumbar el catálogo entero. Si la
 * lectura o el parseo fallan, se devuelve la última copia válida que se
 * guardó en memoria (caché de proceso) y se registra el error.
 *
 * Esta caché vive solo mientras la Function esté "caliente"; en frío
 * simplemente vuelve a intentar leer el blob.
 */

let ultimoCatalogoValido = null;

const CONTAINER_NAME = process.env.AGENTES_CONTAINER_NAME || 'catalogo';
const BLOB_NAME = process.env.AGENTES_BLOB_NAME || 'agentes.json';
const CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;

async function leerCatalogoDesdeBlob(context) {
  if (!CONNECTION_STRING) {
    throw new Error(
      'Falta la variable de entorno AZURE_STORAGE_CONNECTION_STRING en la configuración de la Function App.'
    );
  }

  const serviceClient = BlobServiceClient.fromConnectionString(CONNECTION_STRING);
  const containerClient = serviceClient.getContainerClient(CONTAINER_NAME);
  const blobClient = containerClient.getBlobClient(BLOB_NAME);

  const descarga = await blobClient.download();
  const contenido = await streamToString(descarga.readableStreamBody);

  let catalogo;
  try {
    catalogo = JSON.parse(contenido);
  } catch (err) {
    throw new Error(`El blob ${BLOB_NAME} no contiene JSON válido: ${err.message}`);
  }

  if (!Array.isArray(catalogo)) {
    throw new Error(`El blob ${BLOB_NAME} debe contener un array de agentes.`);
  }

  ultimoCatalogoValido = catalogo;
  return catalogo;
}

async function obtenerCatalogo(context) {
  try {
    return await leerCatalogoDesdeBlob(context);
  } catch (err) {
    context.log.error('Error leyendo el catálogo desde Blob Storage:', err.message);

    if (ultimoCatalogoValido) {
      context.log.warn('Sirviendo el último catálogo válido conocido en caché.');
      return ultimoCatalogoValido;
    }

    // No hay caché previa (primer arranque en frío con blob corrupto o
    // sin configurar): se propaga el error para que el frontend lo muestre.
    throw err;
  }
}

function streamToString(readableStream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readableStream.on('data', (data) => chunks.push(Buffer.from(data)));
    readableStream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    readableStream.on('error', reject);
  });
}

module.exports = { obtenerCatalogo };
