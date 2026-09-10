import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function MessageBubble({ role, text, timestamp, streaming }) {
  const esUsuario = role === 'user';

  return (
    <div className={`msg ${esUsuario ? 'user' : 'agent'}`}>
      <div className="avatar">{esUsuario ? 'TÚ' : 'AI'}</div>
      <div>
        <div className="bubble">
          {esUsuario || streaming ? (
            // Texto plano para mensajes del usuario, y también mientras el
            // agente está "escribiendo" (streaming): renderizar Markdown a
            // medio construir puede mostrar tablas rotas o ** sin cerrar.
            text
          ) : (
            <div className="markdown-content">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // Los enlaces del agente (URLs de DevOps, etc.) se abren
                  // en una pestaña nueva para no perder el hub de vista.
                  a: ({ node, ...props }) => (
                    <a {...props} target="_blank" rel="noopener noreferrer" />
                  ),
                }}
              >
                {text}
              </ReactMarkdown>
            </div>
          )}
          {streaming && <span className="cursor" />}
        </div>
        {!streaming && timestamp && <div className="timestamp">{timestamp}</div>}
      </div>
    </div>
  );
}
