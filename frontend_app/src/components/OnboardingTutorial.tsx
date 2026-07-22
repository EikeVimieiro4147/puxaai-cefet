import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Calendar, BookOpen, Users, ChevronRight, ChevronLeft, Check, HelpCircle } from 'lucide-react';

interface OnboardingTutorialProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OnboardingTutorial({ isOpen, onClose }: OnboardingTutorialProps) {
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  const nextStep = () => {
    if (step < totalSteps) setStep(step + 1);
    else {
      localStorage.setItem('puxaai_onboarded', 'true');
      onClose();
    }
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[92vw] max-w-[440px] max-h-[90vh] p-5 sm:p-6 overflow-y-auto border border-slate-200 bg-white rounded-3xl shadow-2xl z-[200] flex flex-col justify-between">
        {/* CSS Animations */}
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes pulse-ring {
            0% { transform: scale(0.95); opacity: 0.8; }
            50% { transform: scale(1.1); opacity: 0.4; }
            100% { transform: scale(0.95); opacity: 0.8; }
          }
          @keyframes cursor-click {
            0%, 100% { transform: translate(30px, 30px) scale(1); }
            40% { transform: translate(10px, 10px) scale(1); }
            50% { transform: translate(10px, 10px) scale(0.85); }
            60% { transform: translate(10px, 10px) scale(1); }
          }
          @keyframes card-complete {
            0%, 45% { background-color: #ffffff; border-color: #cbd5e1; }
            50%, 100% { background-color: #ecfdf5; border-color: #10b981; }
          }
          @keyframes card-unlock {
            0%, 55% { background-color: #f8fafc; border-color: #e2e8f0; opacity: 0.6; }
            60%, 100% { background-color: #ffffff; border-color: #6366f1; opacity: 1; }
          }
          @keyframes drag-block {
            0% { transform: translate(0, 0); opacity: 1; }
            20% { transform: translate(0, 0); opacity: 1; }
            60% { transform: translate(70px, 35px); opacity: 1; }
            80% { transform: translate(70px, 35px); opacity: 0.5; }
            100% { transform: translate(0, 0); opacity: 0; }
          }
          @keyframes text-type {
            0% { content: ""; }
            20% { content: "M"; }
            30% { content: "Ma"; }
            40% { content: "Mar"; }
            50% { content: "Mari"; }
            60% { content: "Maria"; }
            80%, 100% { content: "Maria"; }
          }
          @keyframes search-result-click {
            0%, 100% { transform: translate(60px, 60px); }
            65% { transform: translate(20px, 20px) scale(1); }
            72% { transform: translate(20px, 20px) scale(0.85); }
            78% { transform: translate(20px, 20px) scale(1); }
          }
          @keyframes ghost-fade {
            0%, 75% { opacity: 0; transform: scale(0.95); }
            80%, 100% { opacity: 0.9; transform: scale(1); }
          }

          .anim-cursor {
            animation: cursor-click 4s infinite ease-in-out;
          }
          .anim-card {
            animation: card-complete 4s infinite ease-in-out;
          }
          .anim-card-dep {
            animation: card-unlock 4s infinite ease-in-out;
          }
          .anim-drag {
            animation: drag-block 3.5s infinite ease-in-out;
          }
          .anim-type::after {
            content: "";
            animation: text-type 4s infinite steps(1);
          }
          .anim-cursor-social {
            animation: search-result-click 4s infinite ease-in-out;
          }
          .anim-ghost {
            animation: ghost-fade 4s infinite ease-in-out;
          }
        `}} />

        <DialogHeader className="space-y-1.5 pr-6">
          <div className="flex items-center justify-between w-full">
            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
              Passo {step} de {totalSteps}
            </span>
            <button 
              onClick={onClose} 
              className="text-slate-400 hover:text-slate-600 text-xs font-bold transition-colors"
            >
              Pular
            </button>
          </div>
          <DialogTitle className="text-lg font-display font-black text-slate-800 text-left flex items-center gap-2 mt-1.5">
            {step === 1 && <><Sparkles className="w-5 h-5 text-indigo-500 shrink-0" /> Bem-vindo ao PuxaAi!</>}
            {step === 2 && <><BookOpen className="w-5 h-5 text-indigo-500 shrink-0" /> Fluxograma Inteligente</>}
            {step === 3 && <><Calendar className="w-5 h-5 text-indigo-500 shrink-0" /> Montando sua Grade</>}
            {step === 4 && <><Users className="w-5 h-5 text-indigo-500 shrink-0" /> Grade Colaborativa</>}
          </DialogTitle>
        </DialogHeader>

        {/* Carousel Content */}
        <div className="py-4 flex flex-col items-center justify-center min-h-[190px]">
          {/* Step 1 Graphic */}
          {step === 1 && (
            <div className="w-full flex flex-col items-center text-center space-y-3">
              <div className="relative w-20 h-20 bg-gradient-to-tr from-indigo-500 to-violet-600 rounded-3xl flex items-center justify-center shadow-md shadow-indigo-200">
                <Sparkles className="w-10 h-10 text-white animate-pulse" />
                <span className="absolute -bottom-2 bg-white text-indigo-600 border border-indigo-100 px-2.5 py-0.5 rounded-full text-[9px] font-black shadow-2xs uppercase tracking-widest font-sans">
                  CEFET
                </span>
              </div>
              <p className="text-xs sm:text-sm leading-relaxed text-slate-600 max-w-xs">
                O <strong>PuxaAi</strong> é a ferramenta ideal para você planejar sua matrícula! Visualize sua matriz curricular, controle o fluxo de matérias e monte sua grade de horários perfeita.
              </p>
            </div>
          )}

          {/* Step 2 Graphic: Fluxograma Click */}
          {step === 2 && (
            <div className="w-full space-y-3">
              <div className="w-full h-28 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-around p-3 relative overflow-hidden">
                {/* Course Card 1 */}
                <div className="anim-card w-28 sm:w-32 p-2 rounded-xl border flex flex-col justify-between h-16 shadow-2xs transition-all relative">
                  <div className="flex items-start justify-between">
                    <span className="text-[9px] font-bold text-slate-700 leading-tight truncate">Cálculo I</span>
                    <span className="w-3.5 h-3.5 rounded-full border border-slate-200 flex items-center justify-center bg-white shrink-0">
                      <Check className="w-2.5 h-2.5 text-emerald-500" />
                    </span>
                  </div>
                  <span className="text-[8px] text-slate-400 font-mono">1º Período</span>
                </div>

                {/* Arrow */}
                <div className="text-slate-300 font-bold text-xs">➔</div>

                {/* Course Card 2 (Dependent) */}
                <div className="anim-card-dep w-28 sm:w-32 p-2 rounded-xl border flex flex-col justify-between h-16 shadow-2xs transition-all">
                  <div className="flex items-start justify-between">
                    <span className="text-[9px] font-bold text-slate-700 leading-tight truncate">Cálculo II</span>
                    <span className="text-[9px] text-slate-400 shrink-0">🔒</span>
                  </div>
                  <span className="text-[8px] text-slate-400 font-mono">2º Período</span>
                </div>

                {/* Mouse Cursor Icon */}
                <svg className="anim-cursor absolute w-5 h-5 text-slate-800 drop-shadow-md" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4 3 L20 11 L13 13 L21 21 L19 22 L11 14 L7 18 Z" />
                </svg>
              </div>
              <p className="text-xs sm:text-sm leading-relaxed text-slate-600 text-center">
                Clique nas disciplinas no **Fluxograma** para marcá-las como vencidas. O sistema atualiza os pré-requisitos imediatamente, destrancando (🔓) as próximas matérias.
              </p>
            </div>
          )}

          {/* Step 3 Graphic: Dragging to Grid */}
          {step === 3 && (
            <div className="w-full space-y-3">
              <div className="w-full h-28 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-around p-3 relative overflow-hidden">
                {/* List Item */}
                <div className="w-24 bg-white border border-slate-200 p-1.5 rounded-lg text-[9px] font-bold flex justify-between items-center shadow-2xs relative">
                  <span className="truncate">Física II</span>
                  <span className="bg-indigo-500 text-white rounded px-1 py-0.5 text-[8px] shrink-0">+</span>
                  
                  {/* Sliding Drag Block */}
                  <div className="anim-drag absolute inset-0 bg-indigo-500 text-white p-1.5 rounded-lg text-[9px] font-bold flex justify-between items-center pointer-events-none">
                    <span className="truncate">Física II</span>
                    <span>✓</span>
                  </div>
                </div>

                {/* Mini Calendar Grid */}
                <div className="w-28 bg-white border border-slate-200 rounded-lg p-1 grid grid-cols-2 gap-1 h-20">
                  <div className="border border-dashed border-slate-100 rounded text-[7px] p-0.5 text-slate-300">SEG</div>
                  <div className="border border-dashed border-slate-100 rounded text-[7px] p-0.5 text-slate-300">TER</div>
                  <div className="border border-dashed border-slate-100 rounded text-[7px] p-0.5 text-slate-300">QUA</div>
                  
                  {/* Target slot */}
                  <div className="border border-indigo-200 bg-indigo-50 rounded text-[7px] p-0.5 text-indigo-700 flex items-center justify-center font-bold">
                    Física II
                  </div>
                </div>
              </div>
              <p className="text-xs sm:text-sm leading-relaxed text-slate-600 text-center">
                Na aba **Grade**, selecione as turmas desejadas na barra lateral. O sistema avisa na hora se houver conflito de horários ou se as turmas estiverem cheias.
              </p>
            </div>
          )}

          {/* Step 4 Graphic: Collaborative search */}
          {step === 4 && (
            <div className="w-full space-y-3">
              <div className="w-full h-28 bg-slate-50 border border-slate-100 rounded-2xl flex p-3 relative overflow-hidden justify-around items-center">
                {/* Left panel: search input */}
                <div className="w-32 bg-white border border-slate-200 rounded-lg p-1.5 flex flex-col gap-1 shadow-2xs relative">
                  <div className="text-[7px] font-bold text-slate-400 uppercase">Buscar Colega</div>
                  <div className="border border-slate-200 rounded p-1 text-[8px] text-slate-700 bg-slate-50 flex items-center h-5 overflow-hidden">
                    <span className="anim-type"></span>
                    <span className="w-0.5 h-2.5 bg-indigo-600 animate-ping ml-0.5"></span>
                  </div>

                  {/* Search Result */}
                  <div className="bg-indigo-50 border border-indigo-100 rounded p-1 text-[8px] text-indigo-700 font-bold flex justify-between items-center">
                    <span className="truncate">Maria</span>
                    <span className="text-[6px] text-indigo-400 shrink-0">GEL</span>
                  </div>

                  {/* Cursor */}
                  <svg className="anim-cursor-social absolute w-3.5 h-3.5 text-slate-800 drop-shadow-2xs" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M4 3 L20 11 L13 13 L21 21 L19 22 L11 14 L7 18 Z" />
                  </svg>
                </div>

                {/* Right panel: Grid projection */}
                <div className="w-24 bg-white border border-slate-200 rounded-lg p-1.5 h-20 flex items-center justify-center relative">
                  <div className="text-[7px] font-bold text-slate-400 absolute top-1 left-1.5">AGENDA</div>
                  {/* Ghost Course */}
                  <div className="anim-ghost border-2 border-dashed border-indigo-400 bg-indigo-50/50 rounded p-1 text-[7px] text-indigo-600 font-black text-center w-full mt-2">
                    Turma Maria
                    <div className="text-[5px] text-indigo-400 font-normal">Copia grade</div>
                  </div>
                </div>
              </div>
              <p className="text-xs sm:text-sm leading-relaxed text-slate-600 text-center">
                Deixe seu perfil **Público** no topo da tela. Busque por amigos na aba Grade para visualizar a projeção deles e copiar a mesma grade horária!
              </p>
            </div>
          )}
        </div>

        {/* Dialog Footer with Action buttons */}
        <DialogFooter className="flex flex-row items-center justify-between w-full pt-3 border-t border-slate-100 gap-2 sm:space-x-0">
          <div className="flex gap-1.5">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <span 
                key={i} 
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  step === i + 1 ? 'w-4 bg-indigo-600' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            {step > 1 && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={prevStep}
                className="gap-1 rounded-full px-3 py-1 text-xs font-bold border-slate-200 text-slate-600 hover:bg-slate-50 h-8"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Voltar
              </Button>
            )}
            <Button 
              size="sm" 
              onClick={nextStep}
              className="gap-1 rounded-full px-4 py-1 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white h-8"
            >
              {step === totalSteps ? 'Concluir!' : 'Avançar'} <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
