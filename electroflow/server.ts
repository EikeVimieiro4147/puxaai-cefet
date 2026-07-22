import express from 'express';
import path from 'path';
import multer from 'multer';
import { GoogleGenAI } from '@google/genai';

const app = express();
const PORT = 3000;

app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });
let aiClient: GoogleGenAI | null = null;

function getAiClient() {
  if (!aiClient) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

async function startServer() {
  // Rota POST para processar o histórico via PDF
  app.post('/api/processar-historico', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
      }

      const ai = getAiClient();
      const base64Data = req.file.buffer.toString('base64');
      
      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { text: "Analise o histórico curricular do CEFET-RJ em anexo. Identifique todas as disciplinas nas tabelas. Retorne um JSON contendo uma chave 'materias_vencidas'. O valor deve ser um array de objetos (com as chaves: codigo, disciplina, periodo, carga_horaria) contendo APENAS as matérias onde a coluna 'Situação' é igual a 'Vencido'." },
              { inlineData: { mimeType: 'application/pdf', data: base64Data } }
            ]
          }
        ],
        config: {
          responseMimeType: 'application/json'
        }
      });

      const text = response.text;
      if (!text) {
        throw new Error('Sem resposta do Gemini');
      }
      
      res.json(JSON.parse(text));
    } catch (error: any) {
      console.error('Erro ao processar PDF:', error);
      
      const errMsg = error?.message || '';
      if (errMsg.includes('API key not valid') || errMsg.includes('API_KEY_INVALID')) {
        return res.status(401).json({ error: 'A chave da API do Google Gemini é inválida ou não foi configurada. Configure a variável GEMINI_API_KEY.', details: errMsg });
      }
      res.status(500).json({ error: 'Erro ao analisar histórico. Tente novamente mais tarde.', details: error.message });

    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('/(.*)', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Global error handler to prevent HTML responses
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Erro interno no servidor' });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
