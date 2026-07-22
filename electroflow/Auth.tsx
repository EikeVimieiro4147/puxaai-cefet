import React, { useState, useMemo } from 'react';
import { Mail, Lock, User, Calendar, Hash, AlertCircle, CheckCircle } from 'lucide-react';
import { COURSES_LIST } from './constants';

interface AuthProps {
  onLogin: (user: any) => void;
}

export function Auth({ onLogin }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  
  // Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regAge, setRegAge] = useState('');
  const [regMatricula, setRegMatricula] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  
  const [error, setError] = useState('');

  const validCourseCodes = useMemo(() => COURSES_LIST.map(c => c.code.toLowerCase()), []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!loginEmail || !loginPassword) {
      setError('Por favor, preencha todos os campos.');
      return;
    }
    
    // Auto-detect major from stored email if possible (mock logic for demo)
    onLogin({ email: loginEmail, name: loginEmail.split('.')[0] });
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!regName || !regEmail || !regAge || !regMatricula || !regPassword || !regConfirmPassword) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    const emailRegex = /^[a-z0-9]+\.[a-z0-9]+@aluno\.cefet-rj\.br$/i;
    if (!emailRegex.test(regEmail)) {
      setError('Email inválido. Use o formato: nome.sobrenome@aluno.cefet-rj.br');
      return;
    }

    const matriculaRegex = /^(\d{7})([a-zA-Z]+)$/;
    const match = regMatricula.match(matriculaRegex);
    if (!match) {
      setError('Matrícula inválida. Formato: 7 números seguidos do código do curso (ex: 2012391gel)');
      return;
    }
    
    const [, numbers, courseCode] = match;
    if (!validCourseCodes.includes(courseCode.toLowerCase())) {
      setError(`Código de curso inválido na matrícula. Cursos válidos: ${validCourseCodes.join(', ')}`);
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    if (regPassword.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    onLogin({ name: regName, email: regEmail, matricula: regMatricula, age: regAge });
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-blue-50 h-full overflow-y-auto">
      <div className="w-full max-w-sm bg-white p-8 rounded-[32px] shadow-lg text-center my-auto">
        <div className="w-16 h-16 bg-blue-100 text-primary rounded-2xl flex items-center justify-center mb-6 mx-auto">
          <Lock className="w-8 h-8" />
        </div>
        
        <h1 className="font-display font-bold text-2xl text-primary mb-2">CEFET Planner</h1>
        <p className="text-xs text-gray-400 mb-8 font-medium">
          {isLogin ? 'Insira seus dados para acessar' : 'Crie sua conta para começar'}
        </p>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3 text-red-500 text-sm font-medium text-left">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <div className="space-y-4 text-left">
          {isLogin ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Email do CEFET</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 pl-12 text-sm outline-none focus:ring-2 focus:ring-primary text-gray-800"
                    placeholder="nome.sobrenome@aluno.cefet-rj.br"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 pl-12 text-sm outline-none focus:ring-2 focus:ring-primary text-gray-800"
                    placeholder="••••••••"
                  />
                </div>
              </div>
              
              <button type="submit" className="w-full bg-primary text-white font-bold py-4 rounded-xl shadow-md active:scale-95 transition-all mt-4">
                Entrar
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Nome Completo</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 pl-12 text-sm outline-none focus:ring-2 focus:ring-primary text-gray-800"
                    placeholder="João da Silva"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Email do CEFET</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 pl-12 text-sm outline-none focus:ring-2 focus:ring-primary text-gray-800"
                    placeholder="nome.sobrenome@aluno.cefet-rj.br"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Idade</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      min="15"
                      max="100"
                      value={regAge}
                      onChange={(e) => setRegAge(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 pl-9 text-sm outline-none focus:ring-2 focus:ring-primary text-gray-800"
                      placeholder="18"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Matrícula</label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={regMatricula}
                      onChange={(e) => setRegMatricula(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 pl-9 text-sm outline-none focus:ring-2 focus:ring-primary text-gray-800"
                      placeholder="2012391gel"
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 pl-12 text-sm outline-none focus:ring-2 focus:ring-primary text-gray-800"
                    placeholder="••••••••"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Confirmar Senha</label>
                <div className="relative">
                  <CheckCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 pl-12 text-sm outline-none focus:ring-2 focus:ring-primary text-gray-800"
                    placeholder="••••••••"
                  />
                </div>
              </div>
              <button type="submit" className="w-full bg-primary text-white font-bold py-4 rounded-xl shadow-md active:scale-95 transition-all mt-4">
                Criar Conta
              </button>
            </form>
          )}

          <button 
            onClick={() => { setIsLogin(!isLogin); setError(''); }} 
            className="w-full text-gray-400 text-xs font-bold py-4 hover:text-primary transition-colors"
          >
            {isLogin ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Entre'}
          </button>

        </div>
      </div>
    </div>
  );
}
