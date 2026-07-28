import { useState, useEffect } from "react";
import LoginPage from "./components/LoginPage";
import TerminalView from "./components/TerminalView";
import DashboardView from "./components/DashboardView";
import GradeView from "./components/GradeView";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { OnboardingTutorial } from "./components/OnboardingTutorial";

function App() {
  const [session, setSession] = useState<{ matricula: string, isScraping: boolean, isDashboardReady: boolean } | null>(() => {
    const saved = localStorage.getItem("user_matricula");
    if (saved) return { matricula: saved, isScraping: false, isDashboardReady: true };
    return null;
  });

  const handleLogin = (matricula: string) => {
    // Instant fast login
    setSession({ matricula, isScraping: false, isDashboardReady: true });
  };

  const handleStartManualSync = () => {
    if (!session) return;
    setSession({ ...session, isScraping: true });
  };

  const handleScrapeFinish = () => {
    setSession((prev) => prev ? { ...prev, isScraping: false, isDashboardReady: true } : null);
  };
  
  const [currentTab, setCurrentTab] = useState<'fluxograma' | 'grade'>('fluxograma');
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    if (session?.isDashboardReady && !localStorage.getItem('puxaai_onboarded')) {
      const timer = setTimeout(() => {
        setShowTutorial(true);
      }, 850);
      return () => clearTimeout(timer);
    }
  }, [session]);
  
  if (!session) {
    return <LoginPage onLogin={handleLogin} />;
  }
  
  if (session.isScraping) {
    return <TerminalView matricula={session.matricula} onFinish={handleScrapeFinish} />;
  }
  
  if (session.isDashboardReady) {
    return (
      <div className="relative min-h-screen bg-slate-50 pb-16">
        <ErrorBoundary name="MainContent">
          {currentTab === 'fluxograma' ? (
            <DashboardView 
               matricula={session.matricula} 
               onLogout={() => {
                 localStorage.removeItem("user_matricula");
                 setSession(null);
               }} 
               onOpenTutorial={() => setShowTutorial(true)}
               onStartSync={handleStartManualSync}
            />
          ) : (
            <GradeView
               matricula={session.matricula}
               onLogout={() => {
                 localStorage.removeItem("user_matricula");
                 setSession(null);
               }}
               onOpenTutorial={() => setShowTutorial(true)}
               onStartSync={handleStartManualSync}
            />
          )}
        </ErrorBoundary>

        <OnboardingTutorial isOpen={showTutorial} onClose={() => setShowTutorial(false)} />

        {/* BOTTOM NAVIGATION BAR */}
        <div className="fixed bottom-0 inset-x-0 h-16 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)] flex items-center justify-around z-[100] px-4 md:px-0 mx-auto max-w-lg rounded-t-2xl">
           <button 
             onClick={() => setCurrentTab('fluxograma')}
             className={`flex flex-col items-center justify-center w-24 h-full gap-1 transition-colors ${currentTab === 'fluxograma' ? 'text-primary' : 'text-slate-400 hover:text-slate-600'}`}
           >
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M7 12h10"/><path d="M10 18h4"/></svg>
              <span className="text-[10px] font-bold uppercase tracking-wider">Fluxograma</span>
           </button>
           <button 
             onClick={() => setCurrentTab('grade')}
             className={`flex flex-col items-center justify-center w-24 h-full gap-1 transition-colors ${currentTab === 'grade' ? 'text-primary' : 'text-slate-400 hover:text-slate-600'}`}
           >
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="m9 16 2 2 4-4"/></svg>
              <span className="text-[10px] font-bold uppercase tracking-wider">Grade</span>
           </button>
        </div>
      </div>
    );
  }

  return null;
}

export default App;
