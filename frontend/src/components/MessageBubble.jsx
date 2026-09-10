export default function MessageBubble({ role, text, timestamp, streaming }) {
  const esUsuario = role === 'user';

  return (
    <div className={`msg ${esUsuario ? 'user' : 'agent'}`}>
      <div className="avatar">{esUsuario ? 'TÚ' : 'AI'}</div>
      <div>
        <div className="bubble">
          {text}
          {streaming && <span className="cursor" />}
        </div>
        {!streaming && timestamp && <div className="timestamp">{timestamp}</div>}
      </div>
    </div>
  );
}
