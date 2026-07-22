import { useState } from "react";
import { User, Lock, ArrowRight, ServerCrash } from "lucide-react";
import axios from "axios";
import { cn } from "../lib/utils";
import { API_BASE_URL } from '../lib/apiConfig';

export default function LoginPage({ onLogin }: { onLogin: (matricula: string) => void }) {
  const [matricula, setMatricula] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matricula || !senha) {
      setError("Preencha todos os campos.");
      return;
    }
    
    setLoading(true);
    setError("");

    try {
      const matriculaUpper = matricula.toUpperCase();
      const res = await axios.post(`${API_BASE_URL}/api/sync_bg`, { matricula: matriculaUpper, senha });
      if (res.data.status === "error") {
        setError(res.data.message);
      } else {
        localStorage.setItem("user_matricula", matriculaUpper);
        onLogin(matriculaUpper);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Erro de conexão com o banco de dados local.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute w-[500px] h-[500px] bg-primary/20 blur-[120px] rounded-full top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute w-[400px] h-[400px] bg-blue-500/20 blur-[100px] rounded-full bottom-0 right-0 translate-x-1/3 translate-y-1/3" />
      
      <div className="w-full max-w-sm bg-white p-8 rounded-[32px] shadow-lg text-center my-auto z-10 transition-all duration-300">
        <div className="w-16 h-16 bg-blue-100 text-primary rounded-2xl flex items-center justify-center mb-6 mx-auto">
          <ServerCrash className="w-8 h-8" />
        </div>
        
        <h1 className="font-display font-bold text-2xl text-primary mb-2">PuxaAi</h1>
        <p className="text-xs text-slate-400 mb-8 font-medium">
          Insira seus dados do portal para sincronizar
        </p>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3 text-red-500 text-sm font-medium text-left">
            <User className="w-5 h-5 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Matrícula</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="text" 
                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 pl-12 text-sm outline-none focus:ring-2 focus:ring-primary text-slate-800"
                placeholder="Ex: 161115"
                value={matricula}
                onChange={(e) => setMatricula(e.target.value)}
              />
            </div>
          </div>
          
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Senha do Portal</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="password" 
                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 pl-12 text-sm outline-none focus:ring-2 focus:ring-primary text-slate-800"
                placeholder="••••••••"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
            </div>
          </div>

          <button 
            disabled={loading}
            className={cn(
              "w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-xl shadow-md transition-all mt-4 flex items-center justify-center gap-2",
              loading ? "opacity-70 cursor-not-allowed" : "active:scale-95"
            )}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <ArrowRight className="w-5 h-5" />
                Iniciar Sincronização
              </>
            )}
          </button>
        </form>
      </div>
      
      <div className="absolute bottom-6 text-zinc-600 text-xs font-mono">
        Status: Disconnected &bull; Version 2.0 (Terminal Edition)
      </div>
    </div>
  );
}
