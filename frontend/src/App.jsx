import { useState } from 'react';
import CatalogoAgentes from './components/CatalogoAgentes';
import ChatView from './components/ChatView';

export default function App() {
  const [agenteActivo, setAgenteActivo] = useState(null);

  if (agenteActivo) {
    return <ChatView agente={agenteActivo} onVolver={() => setAgenteActivo(null)} />;
  }

  return <CatalogoAgentes onSeleccionarAgente={setAgenteActivo} />;
}
