import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { MessageSquare, Send, X, Sparkles, Loader2, Bot } from 'lucide-react';
import { Course, ClassGroup } from './types';
import { COURSES_LIST } from './constants';

interface Message {
  role: 'user' | 'model';
  text: string;
}

interface GeminiAssistantProps {
  completedIds: string[];
  schedulableCourses: Course[];
  scheduleData: Record<string, ClassGroup[]>;
  selectedClasses: Record<string, string>;
  userMajor: string | null;
}

export function GeminiAssistant({ 
  completedIds, 
  schedulableCourses, 
  scheduleData, 
  selectedClasses,
  userMajor
}: GeminiAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Olá! Sou seu assistente do CEFET Planner. Posso ajudar você a montar sua grade, verificar conflitos ou sugerir o melhor caminho para o próximo semestre. Como posso ajudar?' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkKey();
  }, []);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const checkKey = async () => {
    const win = window as any;
    if (win.aistudio) {
      const selected = await win.aistudio.hasSelectedApiKey();
      setHasKey(selected);
    }
  };

  const handleConnect = async () => {
    const win = window as any;
    if (win.aistudio) {
      await win.aistudio.openSelectKey();
      // Assume success as per guidelines to prevent race condition and void return check
      setHasKey(true);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const buildContext = () => {
    // Simplificar os dados para o prompt não ficar gigante
    const availableInfo = schedulableCourses.map(c => {
      const groups = scheduleData[c.name] || [];
      const times = groups.map(g => {
        const sessions = g.sessions.map(s => `${s.day} ${s.startTime.slice(0,5)}-${s.endTime.slice(0,5)}`).join(', ');
        return `  - Turma ${g.classCode} (${g.courseOrigin}): ${sessions} (Cód: ${g.code})`;
      }).join('\n');
      return `Matéria: ${c.name}\n${times}`;
    }).join('\n\n');

    const selectedInfo = Object.entries(selectedClasses).map(([name, code]) => {
      return `${name} (Código selecionado: ${code})`;
    }).join(', ');

    return `
      DADOS DO ALUNO:
      - Curso: ${COURSES_LIST.find(c => c.code === userMajor)?.name || 'Não especificado'} (${userMajor})
      - Matérias já concluídas (IDs): ${completedIds.join(', ')}.
      - Matérias selecionadas atualmente na grade: ${selectedInfo || 'Nenhuma'}.
      
      MATÉRIAS DISPONÍVEIS E HORÁRIOS:
      ${availableInfo}
    `;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const context = buildContext();
      
      const courseName = COURSES_LIST.find(c => c.code === userMajor)?.name || 'Universitário';
      const systemInstruction = `
        Você é o "ElectroBot", um consultor acadêmico experiente para estudantes de ${courseName}.
        
        Seu objetivo: Ajudar o aluno a montar a grade horária ideal, resolver conflitos e priorizar matérias importantes (pré-requisitos).
        
        Regras:
        1. Seja conciso e direto. Use formatação Markdown (negrito, listas) para facilitar a leitura.
        2. Analise os horários fornecidos no contexto para sugerir combinações que não conflitem.
        3. Se o aluno pedir uma sugestão, priorize matérias que travam o curso (Cálculos, Físicas, Circuitos).
        4. O tom deve ser futurista mas profissional, alinhado com o tema "Cyberpunk/Sci-fi" do app.
        
        Contexto Atual:
        ${context}
      `;

      // Enviar histórico recente para manter contexto da conversa
      const history = messages.slice(-4).map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const chat = ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: { systemInstruction },
        history: history
      });
      
      const result = await chat.sendMessage({ message: userMsg });
      const text = result.text;

      setMessages(prev => [...prev, { role: 'model', text: text }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: 'Erro de conexão com os subsistemas neurais. Tente novamente.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 p-4 rounded-full bg-primary text-white shadow-lg hover:scale-110 transition-all border border-primary/20"
      >
        <Sparkles className="w-6 h-6 animate-pulse" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[90vw] sm:w-[400px] h-[600px] max-h-[80vh] flex flex-col bg-white border border-primary/30 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl animate-in fade-in slide-in-from-bottom-10 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/20 to-transparent border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          <h3 className="font-display font-bold text-slate-900">CEFET Assistant</h3>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* API Key Gate */}
      {!hasKey ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
          <Sparkles className="w-12 h-12 text-slate-600" />
          <p className="text-sm text-slate-500">Conecte sua chave de API para ativar a inteligência neural.</p>
          <button 
            onClick={handleConnect}
            className="px-6 py-2 bg-primary text-white rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-primary/80 transition-all"
          >
            Conectar Gemini
          </button>
          <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-[10px] text-primary hover:underline">
            Obter chave
          </a>
        </div>
      ) : (
        <>
          {/* Chat Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-black/20">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div 
                  className={`
                    max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed
                    ${msg.role === 'user' 
                      ? 'bg-primary text-white rounded-br-none shadow-[0_0_15px_rgba(188,19,254,0.2)]' 
                      : 'bg-slate-800 text-slate-800 rounded-bl-none border border-slate-200'}
                  `}
                >
                  {msg.role === 'model' ? (
                    <div className="prose prose-invert prose-p:my-1 prose-ul:my-1 prose-li:my-0 text-xs sm:text-sm" dangerouslySetInnerHTML={{ 
                      __html: msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br />') 
                    }} />
                  ) : (
                    msg.text
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-800 rounded-2xl rounded-bl-none px-4 py-3 border border-slate-200 flex gap-2 items-center text-slate-500 text-xs">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Processando dados...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-slate-50 border-t border-slate-200">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ex: Sugira uma grade para quarta-feira livre..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-neon-purple transition-colors placeholder:text-slate-600"
              />
              <button 
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="p-2 bg-primary text-white rounded-xl hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}