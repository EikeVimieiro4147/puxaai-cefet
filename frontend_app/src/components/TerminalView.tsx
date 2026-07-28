import { useEffect, useState } from "react";
import axios from "axios";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "../lib/utils";
import { LoadingTips } from "./LoadingTips";

import { API_BASE_URL } from '../lib/apiConfig';

export default function TerminalView({ matricula, onFinish }: { matricula: string, onFinish: () => void }) {
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState<"running" | "success" | "error">("running");
  const [progress, setProgress] = useState(15);

  // Poll status & stream logs to detect completion
  useEffect(() => {
    let statusInterval: ReturnType<typeof setInterval>;
    let isFinished = false;

    const checkStatus = async () => {
      if (isFinished) return;
      try {
        const [statusRes, logsRes] = await Promise.allSettled([
          axios.get(`${API_BASE_URL}/api/sync_status`),
          axios.get(`${API_BASE_URL}/api/stream_logs`)
        ]);

        let isDone = false;
        let isErr = false;

        if (statusRes.status === 'fulfilled') {
          if (statusRes.value.data.status === 'success') isDone = true;
          if (statusRes.value.data.status === 'error') isErr = true;
        }

        if (logsRes.status === 'fulfilled') {
          const currentLogs: string[] = logsRes.value.data.logs || [];
          setLogs(currentLogs);
          
          // Check if log contains success marker
          if (currentLogs.some(l => l.includes('CONCLUIDO COM SUCESSO') || l.includes('CONCLUIDO') || l.includes('Concluído'))) {
            isDone = true;
          }
          if (currentLogs.some(l => l.includes('ERRO NA RASPAGEM') || l.includes('FALHA GERAL'))) {
            isErr = true;
          }
        }

        if (isDone) {
          isFinished = true;
          setStatus('success');
          setProgress(100);
          clearInterval(statusInterval);
          setTimeout(onFinish, 1200);
        } else if (isErr) {
          isFinished = true;
          setStatus('error');
          clearInterval(statusInterval);
        } else {
          setProgress(prev => Math.min(prev + Math.random() * 8, 90));
        }
      } catch (err) {
        console.error("Erro ao sincronizar status:", err);
      }
    };

    statusInterval = setInterval(checkStatus, 1000);
    checkStatus();

    return () => clearInterval(statusInterval);
  }, [onFinish]);

  const latestLog = logs[logs.length - 1] || "Estabelecendo conexão com o sistema acadêmico...";

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl shadow-primary/5 p-8 flex flex-col items-center text-center border border-slate-100 relative overflow-hidden">
        
        {/* Animated Background Ring */}
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-primary/5 rounded-full blur-3xl opacity-50" />
        
        {/* Icon Zone */}
        <div className="relative mb-6">
           {status === "running" && (
             <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-primary shadow-sm">
                <Loader2 className="w-8 h-8 animate-spin" />
             </div>
           )}
           {status === "success" && (
             <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500 shadow-sm shadow-emerald-500/20">
                <CheckCircle2 className="w-8 h-8" />
             </div>
           )}
           {status === "error" && (
             <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-500 shadow-sm shadow-red-500/20">
                <AlertCircle className="w-8 h-8" />
             </div>
           )}
        </div>

        {/* Text Zone */}
        <h2 className="text-xl font-display font-black tracking-tight text-slate-800 mb-2">
           {status === "running" ? "Sincronizando Dados" : status === "success" ? "Concluído!" : "Falha na Sincronização"}
        </h2>
        
        <p className="text-sm text-slate-500 min-h-[40px] font-medium leading-relaxed">
           {status === "success" ? "Seu currículo foi importado com sucesso." : latestLog}
        </p>

        {/* Minimal Progress Bar */}
        <div className="w-full mt-8 flex flex-col gap-2">
           <div className="flex justify-between items-center px-1">
              <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Progresso</span>
              <span className="text-[10px] font-bold text-primary">{Math.round(progress)}%</span>
           </div>
           <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
               <div 
                 className={cn("h-full transition-all duration-700 ease-out", status === "error" ? "bg-red-500" : status === "success" ? "bg-emerald-500" : "bg-primary")} 
                 style={{ width: `${progress}%` }} 
               />
           </div>
        </div>

        {/* ROTATING TIPS FOR THE USER */}
        {status === "running" && <LoadingTips />}

        {status === "error" && (
          <button 
             onClick={() => window.location.reload()} 
             className="mt-8 w-full bg-slate-900 text-white hover:bg-slate-800 transition-colors py-3 rounded-xl font-bold text-sm"
          >
             Tentar Novamente
          </button>
        )}
      </div>
    </div>
  );
}
