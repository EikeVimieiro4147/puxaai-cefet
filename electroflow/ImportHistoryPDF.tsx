import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { CURRICULA } from './constants';

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

interface ImportHistoryPDFProps {
  onImportComplete: (completedIds: string[]) => void;
  userMajor: string;
}

export function ImportHistoryPDF({ onImportComplete, userMajor }: ImportHistoryPDFProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Por favor, selecione um arquivo PDF válido.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessCount(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/processar-historico', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `Erro na comunicação com o servidor: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.materias_vencidas || !Array.isArray(data.materias_vencidas)) {
        throw new Error('Formato de resposta inválido do servidor.');
      }

      // Processar os nomes das disciplinas para IDs no formato do frontend
      let count = 0;
      const idsToMark: string[] = [];
      const currentCurriculum = CURRICULA[userMajor] || [];

      data.materias_vencidas.forEach((materia: any) => {
        if (!materia.disciplina) return;
        const normalizedInput = normalizeName(materia.disciplina);
        
        // Find best match in curriculum
        const match = currentCurriculum.find(c => normalizeName(c.id) === normalizedInput || normalizeName(c.name) === normalizedInput);
        
        if (match) {
          idsToMark.push(match.id);
          count++;
        } else {
          // If no exact match, try partial match or just push the ID normalized (some might fall back to exact match)
          const partialMatch = currentCurriculum.find(c => normalizeName(c.id).includes(normalizedInput) || normalizeName(c.name).includes(normalizedInput) || normalizedInput.includes(normalizeName(c.name)));
          if (partialMatch) {
            idsToMark.push(partialMatch.id);
            count++;
          }
        }
      });

      onImportComplete(idsToMark);
      setSuccessCount(count);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao processar o histórico. Verifique o arquivo e tente novamente.');
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          Importar Histórico (PDF)
        </h4>
        <p className="text-xs text-slate-500">
          Faça o upload do seu "IntegralizacaoCurricular.pdf" para preencher automaticamente as matérias já cursadas.
        </p>
      </div>
      
      <input 
        type="file" 
        accept="application/pdf"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />
      
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isLoading || !userMajor}
        className="w-full sm:w-auto px-6 py-3 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Analisando histórico...
          </>
        ) : (
          <>
            <Upload className="w-4 h-4" />
            Selecionar PDF
          </>
        )}
      </button>

      {error && (
        <div className="p-3 bg-red-50 text-red-600 rounded-lg text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {successCount !== null && (
        <div className="p-3 bg-green-50 text-green-700 rounded-lg text-xs font-medium flex items-center gap-2">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          Sucesso! {successCount} disciplina(s) encontradas e marcadas como concluídas.
        </div>
      )}
    </div>
  );
}
