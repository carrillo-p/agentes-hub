# Hub de Agentes IA — uso interno

Plataforma visual interna para que el equipo comercial/preventa muestre en
vivo, durante reuniones, las capacidades de agentes construidos sobre
Microsoft Copilot Studio y Azure AI Foundry (Foundry Agent Service).

## Estructura del proyecto

```
agentes-hub/
├── frontend/              React + Vite — catálogo y vista de chat
├── api/                   Azure Functions — backend fino
│   ├── getAgentes/        lee el catálogo desde Blob Storage
│   ├── sendMessage/       interfaz única sendMessage(agentId, message, sessionId)
│   ├── adapters/          foundryAdapter.js y copilotStudioAdapter.js (stubs)
│   └── shared/            cliente de Blob Storage con fallback a caché
├── catalogo-ejemplo/      agentes.json de plantilla para subir al blob
├── staticwebapp.config.json
└── azure-pipelines.yml    build + deploy automático desde Azure DevOps
```

## Estado actual

- ✅ Diseño visual con identidad de marca (catálogo + chat)
- ✅ Estructura de componentes React funcionando end-to-end con datos simulados
- ✅ Streaming simulado (efecto máquina de escribir), indicador "escribiendo…",
  botón de reset, modo debug con panel JSON
- ✅ Catálogo leído dinámicamente desde un JSON en Blob Storage (sin tocar código
  para añadir/editar agentes)
- ⏳ Pendiente (fase de integración técnica): conectar `foundryAdapter.js` y
  `copilotStudioAdapter.js` a los backends reales. Hoy devuelven una respuesta
  simulada para poder probar todo el flujo de UI.

## Puesta en marcha en tu suscripción de Azure

### 1. Crear el Storage Account (catálogo)

1. En Azure Portal, crea un **Storage Account** (el tier más económico, Standard/LRS, es suficiente).
2. Dentro, crea un **contenedor Blob** llamado `catalogo` (o el nombre que prefieras, ajustando `AGENTES_CONTAINER_NAME`).
3. Sube el archivo `catalogo-ejemplo/agentes.json` a ese contenedor con el nombre `agentes.json`.
4. Copia la **connection string** del Storage Account (Access keys → Connection string): la necesitarás en el paso 3.

### 2. Crear el recurso Static Web App

1. En Azure Portal, crea un recurso **Static Web App**.
2. Al crearlo, conéctalo directamente a tu repo de **Azure DevOps** (Repos) — el asistente de creación puede generar el pipeline por ti, o puedes usar el `azure-pipelines.yml` incluido en este repo.
3. Configura:
   - **App location**: `frontend`
   - **Output location**: `dist`
   - **Api location**: `api`

### 3. Configurar la variable de entorno del Storage

En el recurso Static Web App → **Configuración** (Application settings), añade:

| Nombre | Valor |
|---|---|
| `AZURE_STORAGE_CONNECTION_STRING` | la connection string copiada en el paso 1 |
| `AGENTES_CONTAINER_NAME` | `catalogo` (o el nombre que hayas usado) |
| `AGENTES_BLOB_NAME` | `agentes.json` |

Esto aplica tanto al entorno de producción como a cada *deployment slot* si usas preview environments.

### 4. Conectar el pipeline

1. En Azure DevOps → tu proyecto → Pipelines, crea un pipeline nuevo apuntando a `azure-pipelines.yml`.
2. Añade la variable secreta `AZURE_STATIC_WEB_APPS_API_TOKEN` (Pipelines → Edit → Variables), con el valor del **deployment token** que encuentras en el recurso Static Web App (Overview → Manage deployment token).
3. Cada push a `main` construirá el frontend y desplegará frontend + api automáticamente.

## Desarrollo local

```bash
# Backend (Azure Functions Core Tools necesario: npm i -g azure-functions-core-tools@4)
cd api
cp local.settings.json.example local.settings.json
# edita local.settings.json con tu connection string real
npm install
npm start          # arranca en http://localhost:7071

# Frontend (en otra terminal)
cd frontend
npm install
npm run dev         # arranca en http://localhost:5173, con proxy a /api
```

## Cómo añadir un agente al catálogo (hoy)

1. Abre el Storage Account en Azure Portal (o Azure Storage Explorer).
2. Edita `agentes.json` dentro del contenedor `catalogo`, añadiendo un bloque con la misma forma que los existentes (ver `catalogo-ejemplo/agentes.json` como referencia).
3. Guarda. El catálogo se actualiza en el hub sin necesidad de deploy — solo recargar la página.

**Importante**: el JSON es de texto libre. Una coma de más o una comilla sin
cerrar rompe el archivo. Si el catálogo deja de cargar tras una edición,
revisa la sintaxis del blob (un validador de JSON online es suficiente) o
restaura la última versión buena.

> Cuando el número de personas que añaden agentes crezca, este mismo
> catálogo puede migrarse a Table Storage con un formulario de alta dentro
> del propio hub — el contrato `GET /api/getAgentes` no cambia, así que la
> migración no afecta al resto de la aplicación (ver `api/shared/blobCatalogo.js`).

## Conectar los backends reales (siguiente fase)

Cuando llegue el momento de conectar con Foundry y Copilot Studio de verdad:

- **`api/adapters/foundryAdapter.js`**: sustituir el stub por la llamada real al SDK/REST de Azure AI Foundry Agent Service, usando `agenteConfig.endpoint` y la credencial referenciada en `agenteConfig.agentKeyRef` (léela de Key Vault o de Application Settings — nunca del propio JSON del catálogo).
- **`api/adapters/copilotStudioAdapter.js`**: sustituir el stub por la integración real con el canal Direct Line del bot correspondiente.

Ninguno de los dos cambios requiere tocar el frontend, `sendMessage/index.js`,
ni el catálogo — esa es la razón de ser de la capa de adaptadores.
