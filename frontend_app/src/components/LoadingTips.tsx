import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';

const TIPS = [
  "Você pode clicar nas matérias no Fluxograma para marcá-las como concluídas e liberar os pré-requisitos!",
  "Na aba Grade, deixe seu perfil 'Público' no topo para compartilhar seus horários com colegas.",
  "Busque o nome do seu colega na aba 'Colegas' da barra lateral para espelhar a grade dele na sua tela!",
  "Filtre turmas por professor, período ou turno na aba 'Filtros' dentro da barra lateral.",
  "Ative o botão 'Sem Conflitos' para ocultar automaticamente matérias com choque de horário.",
  "Cursos de Engenharia contam com 10 semestres nos filtros, enquanto BCC e ADM têm 8 semestres.",
  "As disciplinas optativas ficam organizadas em um bloco sanfona no final da barra lateral."
];

export function LoadingTips() {
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % TIPS.length);
    }, 3800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div key={tipIndex} className="w-full max-w-sm mt-6 p-4 bg-indigo-50/80 border border-indigo-100/80 rounded-2xl flex items-start gap-3 text-left transition-all animate-in fade-in zoom-in-95 duration-300 shadow-2xs">
      <div className="p-2 bg-indigo-600 text-white rounded-xl shrink-0 mt-0.5 shadow-2xs">
        <Sparkles className="w-4 h-4 animate-spin" style={{ animationDuration: '6s' }} />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-[10px] font-black text-indigo-700 uppercase tracking-wider block mb-0.5">
          Dica PuxaAi #{tipIndex + 1}
        </span>
        <p className="text-xs text-slate-700 font-medium leading-relaxed transition-all duration-300 font-sans">
          {TIPS[tipIndex]}
        </p>
      </div>
    </div>
  );
}
