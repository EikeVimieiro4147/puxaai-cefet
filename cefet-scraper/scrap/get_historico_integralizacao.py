import os
import re
import json
import requests
import pdfplumber

SAVE_PDF_PATH = "data/integralizacao.pdf"
SAVE_JSON_PATH = "data/curriculo_integralizacao.json"

def get_historico_integralizacao(session: requests.Session, matricula: str):
    """
    Baixa o PDF do 'Histórico de Integralização' do portal, extrai as 
    tabelas de matérias e converte em um JSON contendo as informações de status.
    """
    print("Baixando Histórico de Integralização...")
    
    url = f"https://alunos.cefet-rj.br/aluno/aluno/relatorio/integralizacaoCurricular.action?matricula={matricula}"
    response = session.get(url)
    
    if response.status_code != 200:
        raise RuntimeError(f"Erro ao baixar PDF: HTTP {response.status_code}")
        
    os.makedirs(os.path.dirname(SAVE_PDF_PATH), exist_ok=True)
    with open(SAVE_PDF_PATH, "wb") as f:
        f.write(response.content)

    print("Extraindo dados do PDF do currículo...")
    
    resultado = {
        "aluno": {
            "nome": "",
            "matricula": "",
            "curso": "",
            "periodo_atual": None
        },
        "carga_horaria": {
            "obrigatorias": {"realizada": 0, "exigida": 0},
            "optativas": {"realizada": 0, "exigida": 0},
            "total": {"realizada": 0, "exigida": 0}
        },
        "disciplinas": []
    }
    
    # Regex compiladas
    pat_disc = re.compile(r"^([A-Z0-9]+)\s+(.+?)\s+(\d+)\s+(\d+)\s+(Vencido|Não Vencido)\s+(\d+)$")
    pat_aluno = re.compile(r"^Aluno:\s+(.+?)\s+Matrícula:\s+(\w+)$")
    pat_curso = re.compile(r"^Curso:\s+(.+?)\s+Período:\s+(\d+)$")
    pat_obr = re.compile(r"^OBRIGATÓRIAS\s+(\d+)\s+(\d+)$")
    pat_opt = re.compile(r"^OPTATIVAS\s+(\d+)\s+(\d+)$")
    pat_tot = re.compile(r"^Total Carga Horária:\s+(\d+)\s+(\d+)$")
    
    try:
        with pdfplumber.open(SAVE_PDF_PATH) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if not text:
                    continue
                for line in text.split("\n"):
                    line = line.strip()
                    
                    m_disc = pat_disc.match(line)
                    if m_disc:
                        codigo, nome, carga, creditos, situacao, periodo = m_disc.groups()
                        resultado["disciplinas"].append({
                            "codigo": codigo,
                            "disciplina": nome,
                            "carga": int(carga),
                            "creditos": int(creditos),
                            "situacao": situacao,
                            "periodo": int(periodo)
                        })
                        continue
                        
                    m_aluno = pat_aluno.match(line)
                    if m_aluno:
                        resultado["aluno"]["nome"] = m_aluno.group(1).strip()
                        resultado["aluno"]["matricula"] = m_aluno.group(2).strip()
                        continue
                        
                    m_curso = pat_curso.match(line)
                    if m_curso:
                        resultado["aluno"]["curso"] = m_curso.group(1).strip()
                        resultado["aluno"]["periodo_atual"] = int(m_curso.group(2))
                        continue
                        
                    m_obr = pat_obr.match(line)
                    if m_obr:
                        resultado["carga_horaria"]["obrigatorias"]["realizada"] = int(m_obr.group(1))
                        resultado["carga_horaria"]["obrigatorias"]["exigida"] = int(m_obr.group(2))
                        continue
                        
                    m_opt = pat_opt.match(line)
                    if m_opt:
                        resultado["carga_horaria"]["optativas"]["realizada"] = int(m_opt.group(1))
                        resultado["carga_horaria"]["optativas"]["exigida"] = int(m_opt.group(2))
                        continue
                        
                    m_tot = pat_tot.match(line)
                    if m_tot:
                        resultado["carga_horaria"]["total"]["realizada"] = int(m_tot.group(1))
                        resultado["carga_horaria"]["total"]["exigida"] = int(m_tot.group(2))
                        continue

    except Exception as e:
        print("Erro ao processar PDF com pdfplumber:", e)
        return []

    with open(SAVE_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(resultado, f, indent=4, ensure_ascii=False)
        
    print(f"Dados do currículo salvos em {SAVE_JSON_PATH}")
    return resultado

if __name__ == "__main__":
    from scrap.login import login
    user_data, session = login()
    get_historico_integralizacao(session=session, matricula=user_data["matricula"])
