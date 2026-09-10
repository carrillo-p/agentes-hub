export default function TypingIndicator() {
  return (
    <div className="typing-row">
      <div className="avatar" style={{ background: 'var(--azul)' }}>
        AI
      </div>
      <div className="typing-bubble">
        <div className="dot" />
        <div className="dot" />
        <div className="dot" />
      </div>
    </div>
  );
}
