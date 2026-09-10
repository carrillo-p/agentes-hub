export default function DebugPanel({ visible, ultimoPayload }) {
  if (!visible) return null;

  return (
    <div className="debug-panel visible">
      <div className="debug-label">DEBUG · payload crudo del último intercambio</div>
      <pre>
        {ultimoPayload
          ? JSON.stringify(ultimoPayload, null, 2)
          : 'Aún no hay intercambios en esta sesión.'}
      </pre>
    </div>
  );
}
