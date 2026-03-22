/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Smartphone, 
  Wifi, 
  WifiOff, 
  Send, 
  User, 
  QrCode, 
  Settings, 
  MessageSquare,
  ArrowLeft,
  Share2,
  Zap
} from 'lucide-react';

type Message = {
  id: string;
  text: string;
  sender: 'me' | 'other';
  timestamp: number;
};

export default function App() {
  const [roomCode, setRoomCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [peerCount, setPeerCount] = useState(0);
  
  const socketRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const connectToRoom = (code: string) => {
    setIsConnecting(true);
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}`);
    socketRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'join', roomCode: code }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      switch (data.type) {
        case 'joined':
          setIsConnected(true);
          setIsConnecting(false);
          setRoomCode(code);
          setPeerCount(data.count);
          break;
        case 'peer_joined':
          setPeerCount(data.count);
          addSystemMessage('Outro dispositivo conectado');
          break;
        case 'peer_left':
          setPeerCount(data.count);
          addSystemMessage('Dispositivo desconectado');
          break;
        case 'chat':
          setMessages(prev => [...prev, {
            id: Math.random().toString(36).substr(2, 9),
            text: data.text,
            sender: 'other',
            timestamp: Date.now()
          }]);
          break;
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      setIsConnecting(false);
      setPeerCount(0);
    };
  };

  const sendMessage = () => {
    if (!inputText.trim() || !socketRef.current) return;

    socketRef.current.send(JSON.stringify({
      type: 'chat',
      text: inputText,
      sender: 'me'
    }));

    setMessages(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      text: inputText,
      sender: 'me',
      timestamp: Date.now()
    }]);

    setInputText('');
  };

  const addSystemMessage = (text: string) => {
    // Optional: Add system messages to the chat
  };

  const generateCode = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    connectToRoom(code);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputCode.length === 6) {
      connectToRoom(inputCode);
    }
  };

  const disconnect = () => {
    if (socketRef.current) {
      socketRef.current.close();
    }
    setIsConnected(false);
    setRoomCode('');
    setMessages([]);
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-zinc-950">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md space-y-8"
        >
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-emerald-500/10 text-emerald-500 mb-4 android-shadow">
              <Smartphone size={40} />
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-white">DroidConnect</h1>
            <p className="text-zinc-400">Conecte dispositivos instantaneamente</p>
          </div>

          <div className="glass-panel p-8 space-y-6 android-shadow">
            <div className="space-y-4">
              <button
                onClick={generateCode}
                disabled={isConnecting}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Zap size={20} />
                {isConnecting ? 'Conectando...' : 'Criar Nova Conexão'}
              </button>

              <div className="relative flex items-center gap-4">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-zinc-500 text-sm font-medium uppercase tracking-widest">ou</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              <form onSubmit={handleJoin} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">
                    Código de Acesso
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="000000"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-center text-2xl font-mono tracking-[0.5em] focus:outline-none focus:border-emerald-500/50 transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  disabled={inputCode.length !== 6 || isConnecting}
                  className="w-full py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl border border-white/10 transition-all disabled:opacity-30"
                >
                  Entrar na Conexão
                </button>
              </form>
            </div>
          </div>

          <div className="flex justify-center gap-8 text-zinc-500">
            <div className="flex flex-col items-center gap-1">
              <QrCode size={20} />
              <span className="text-[10px] uppercase font-bold tracking-tighter">QR Scan</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Settings size={20} />
              <span className="text-[10px] uppercase font-bold tracking-tighter">Ajustes</span>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 max-w-2xl mx-auto border-x border-white/5">
      {/* Header */}
      <header className="p-4 flex items-center justify-between border-bottom border-white/5 sticky top-0 bg-zinc-950/80 backdrop-blur-xl z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={disconnect}
            className="p-2 hover:bg-white/5 rounded-full transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 className="font-bold text-lg leading-none">Conectado</h2>
            <div className="flex items-center gap-1.5 mt-1">
              <div className={`w-2 h-2 rounded-full ${peerCount > 1 ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'}`} />
              <span className="text-xs text-zinc-500 font-medium">
                {peerCount > 1 ? 'Dispositivo Remoto Ativo' : 'Aguardando outro dispositivo...'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-white/5 px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
            <span className="text-xs font-mono text-emerald-500 font-bold">{roomCode}</span>
            <Share2 size={14} className="text-zinc-500" />
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-30">
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-zinc-500 flex items-center justify-center">
              <MessageSquare size={32} />
            </div>
            <p className="text-sm font-medium max-w-[200px]">
              Envie uma mensagem para começar a interação
            </p>
          </div>
        )}
        
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] p-4 rounded-2xl ${
                msg.sender === 'me' 
                  ? 'bg-emerald-500 text-zinc-950 rounded-tr-none' 
                  : 'bg-white/5 text-white border border-white/10 rounded-tl-none'
              }`}>
                <p className="text-sm leading-relaxed font-medium">{msg.text}</p>
                <span className={`text-[10px] mt-2 block opacity-50 font-bold ${
                  msg.sender === 'me' ? 'text-zinc-950' : 'text-zinc-500'
                }`}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </main>

      {/* Input Area */}
      <footer className="p-4 bg-zinc-950 border-t border-white/5">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Digite uma mensagem..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 focus:outline-none focus:border-emerald-500/50 transition-colors"
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={!inputText.trim()}
            className="w-14 h-14 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-2xl flex items-center justify-center transition-all disabled:opacity-50 disabled:grayscale"
          >
            <Send size={24} />
          </button>
        </div>
      </footer>
    </div>
  );
}
