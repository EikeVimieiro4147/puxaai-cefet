import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Loader2, GraduationCap } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Login() {
  const [matricula, setMatricula] = useState("");
  const [senha, setSenha] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matricula || !senha) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha sua matrícula e senha do Portal do Aluno.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      toast({
        title: "Sincronizando...",
        description: "Buscando seu histórico no Portal do Aluno. Isso pode levar alguns segundos.",
      });

      const response = await axios.post("http://localhost:5000/api/sync", {
        matricula,
        senha,
      });

      if (response.data.status === "success") {
        toast({
          title: "Sucesso!",
          description: "O robô processou e salvou sua grade com sucesso.",
        });
        localStorage.setItem("user_matricula", matricula);
        navigate("/");
      }
    } catch (error: any) {
      toast({
        title: "Erro na Sincronização",
        description: error.response?.data?.message || "Ocorreu um erro ao conectar ao scraper local.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-zinc-950 p-4 font-sans text-zinc-100">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-zinc-950 to-zinc-950"></div>
      
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/50 p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/30">
            <GraduationCap className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">CEFET Planner</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Conecte-se ao Portal do Aluno para sincronizar seu currículo
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="matricula" className="text-sm font-medium text-zinc-300">
              Matrícula
            </Label>
            <Input
              id="matricula"
              placeholder="Ex: 2012391GEL"
              value={matricula}
              onChange={(e) => setMatricula(e.target.value)}
              disabled={isLoading}
              className="border-white/10 bg-zinc-950/50 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-blue-600"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="senha" className="text-sm font-medium text-zinc-300">
              Senha do Portal
            </Label>
            <Input
              id="senha"
              type="password"
              placeholder="••••••••"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              disabled={isLoading}
              className="border-white/10 bg-zinc-950/50 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-blue-600"
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/25 transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Validando Matriz Curricular...
              </>
            ) : (
              "Sincronizar e Entrar"
            )}
          </Button>
        </form>
        
        <div className="mt-6 text-center">
          <p className="text-xs text-zinc-500">
            Seus dados são processados localmente e criptografados antes de serem gravados no seu Firestore.
          </p>
        </div>
      </div>
    </div>
  );
}
