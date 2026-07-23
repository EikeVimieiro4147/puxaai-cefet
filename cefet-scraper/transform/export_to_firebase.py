import os
import json
import pandas as pd
import firebase_admin
from firebase_admin import credentials, firestore

def init_firebase():
    if not firebase_admin._apps:
        # Try reading from environment variable first (for production deployment)
        cred_env = os.environ.get('FIREBASE_CREDENTIALS')
        if cred_env:
            try:
                cred_dict = json.loads(cred_env)
                cred = credentials.Certificate(cred_dict)
                firebase_admin.initialize_app(cred)
                return firestore.client()
            except Exception as e:
                print(f"Erro ao carregar FIREBASE_CREDENTIALS do env: {e}")
                
        # Fallback to local json file
        possible_paths = [
            os.path.abspath(os.path.join(os.getcwd(), "firebase-credentials.json")),
            os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "firebase-credentials.json")),
            os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "firebase-credentials.json")),
            os.path.abspath(os.path.join(os.path.dirname(__file__), "firebase-credentials.json")),
        ]
        
        found_path = None
        for p in possible_paths:
            if os.path.exists(p):
                found_path = p
                break
                
        if found_path:
            cred = credentials.Certificate(found_path)
            firebase_admin.initialize_app(cred)
        else:
            print("Aviso: Nenhuma credencial do Firebase encontrada.")
            return None
            
    return firestore.client()

def export_horarios(db):
    if not db:
        raise RuntimeError("Firebase DB não foi inicializado. Verifique firebase-credentials.json.")
        
    print("Iniciando exportacao de Horarios...")
    json_path = os.path.join(os.path.dirname(__file__), "..", "output", "matricula_data.json")
    
    if not os.path.exists(json_path):
        raise FileNotFoundError("Arquivo matricula_data.json nao encontrado. Execute o scraper primeiro.")
        
    with open(json_path, "r", encoding="utf-8") as f:
        data_json = json.load(f)
        
    courses = data_json.get("courses", [])
    disciplinas_dict = {}
    
    for course in courses:
        cod_disc = course.get("code")
        if not cod_disc: continue
        
        if cod_disc not in disciplinas_dict:
            disciplinas_dict[cod_disc] = {
                "nome_disciplina": cod_disc,
                "id_interno": course.get("name", ""),
                "periodo_ideal": str(course.get("period", "")),
                "turmas": []
            }
            
        turma = {
            "codigo_turma": course.get("id", ""),
            "nome_docente": ", ".join(course.get("professors", [])),
            "vagas_oferecidas": str(course.get("occupancy", {}).get("total", "--"))
        }
        
        # Converte os slots de volta para o formato esperado pelo frontend legacy/CLI
        slots = course.get("slots", [])
        if not slots:
            # Caso EAD / TCC que não tem slots definidos mas tem turma aberta
            turma_slot = turma.copy()
            turma_slot["dia_semana"] = "-"
            turma_slot["hr_inicio"] = "-"
            turma_slot["hr_fim"] = "-"
            turma_slot["sala"] = "-"
            disciplinas_dict[cod_disc]["turmas"].append(turma_slot)
        else:
            for slot in slots:
                turma_slot = turma.copy()
                turma_slot["dia_semana"] = slot.get("day", "")
                turma_slot["hr_inicio"] = slot.get("start", "")
                turma_slot["hr_fim"] = slot.get("end", "")
                turma_slot["sala"] = "" # Sala não mapeada no JSON unificado
                disciplinas_dict[cod_disc]["turmas"].append(turma_slot)

    print(f"Total de {len(disciplinas_dict)} disciplinas unicas formatadas para o Firebase.")
    
    batch = db.batch()
    count = 0
    total = 0
    
    for cod_disc, data in disciplinas_dict.items():
        doc_ref = db.collection("horarios").document(cod_disc)
        batch.set(doc_ref, data)
        count += 1
        total += 1
        
        if count == 400:
            batch.commit()
            print(f"  Batch commited: {total} registros de horarios")
            batch = db.batch()
            count = 0
            
    if count > 0:
        batch.commit()
    print("-> Exportacao de horarios finalizada.")

def export_curriculo(db):
    if not db:
        raise RuntimeError("Firebase DB não foi inicializado. Verifique firebase-credentials.json.")

    print("Iniciando exportacao do Curriculo do usuario...")
    json_path = os.path.join(os.path.dirname(__file__), "..", "data", "curriculo_integralizacao.json")
    if not os.path.exists(json_path):
        raise FileNotFoundError("Arquivo curriculo_integralizacao.json inexistente. Execute a raspagem do histórico primeiro.")
        
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    aluno_info = data.get("aluno", {})
    matricula = aluno_info.get("matricula")
    if not matricula:
        raise ValueError("Sem matricula encontrada no JSON do currículo.")
        
    doc_ref = db.collection("users").document(matricula)
    
    user_data = {
        "nome": aluno_info.get("nome", ""),
        "curso": aluno_info.get("curso", ""),
        "periodo_atual": aluno_info.get("periodo_atual", 0),
        "carga_horaria": data.get("carga_horaria", {}),
        "isPublic": True,
        "plannedIds": []
    }
    
    # Save the root user document
    doc_ref.set(user_data, merge=True)
    
    # Save subcollections
    batch = db.batch()
    disciplinas = data.get("disciplinas", [])
    count = 0
    total = 0
    
    for disc in disciplinas:
        codigo = disc.get("codigo")
        if not codigo:
            continue
            
        sub_ref = doc_ref.collection("curriculo").document(codigo)
        batch.set(sub_ref, {
            "disciplina": disc.get("disciplina", ""),
            "carga": disc.get("carga", 0),
            "creditos": disc.get("creditos", 0),
            "situacao": disc.get("situacao", ""),
            "periodo": disc.get("periodo", 0)
        })
        count += 1
        total += 1
        if count == 400:
            batch.commit()
            batch = db.batch()
            count = 0
            
    if count > 0:
        batch.commit()
        
    print(f"-> Curriculo transferido para o usuario {matricula} com {total} materias.")

def main():
    try:
        db = init_firebase()
        if not db:
            raise RuntimeError("Falha ao conectar com o Firebase.")
        export_horarios(db)
        export_curriculo(db)
        print("=== Migracao Firebase Completada com Sucesso ===")
    except Exception as e:
        print(f"=== ERRO NA EXPORTAÇÃO FIREBASE: {e} ===")
        raise e
        
if __name__ == "__main__":
    main()
