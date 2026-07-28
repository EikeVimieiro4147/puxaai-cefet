from flask import Flask, request, jsonify
from flask_cors import CORS
from main import run_pipeline
from transform.export_to_firebase import main as export_firebase_main, init_firebase
import threading
import sys
import os
import json

LOG_FILE = os.path.join(os.path.dirname(__file__), 'scraper_log.txt')

class LoggerWriter:
    def __init__(self, filename):
        self.filename = filename
        with open(self.filename, 'w', encoding='utf-8') as f:
            f.write('')
    def write(self, message):
        if message:
            with open(self.filename, 'a', encoding='utf-8') as f:
                f.write(message)
        sys.__stdout__.write(message)
    def flush(self):
        sys.__stdout__.flush()

status_dict = {"status": "idle", "message": ""}

def bg_task(matricula, senha):
    global status_dict
    status_dict = {"status": "running", "message": "Iniciando raspagem..."}
    sys.stdout = LoggerWriter(LOG_FILE)
    sys.stderr = sys.stdout
    
    try:
        result = run_pipeline(user=matricula, password=senha)
        if result["status"] == "success":
            print("\nIniciando upload para o Firebase...")
            try:
                export_firebase_main()
                print("\n=== CONCLUIDO COM SUCESSO ===")
            except Exception as fe:
                print(f"\nAviso Firebase: {fe}")
                print("Os dados foram raspados e salvos localmente com sucesso!")
                print("\n=== CONCLUIDO COM SUCESSO ===")
            status_dict = {"status": "success", "message": "Concluído com sucesso!"}
        else:
            status_dict = {"status": "error", "message": result.get("message", "Erro desconhecido")}
            print(f"\n=== ERRO NA RASPAGEM: {result.get('message')} ===")
    except Exception as e:
        status_dict = {"status": "error", "message": str(e)}
        print(f"\n=== FALHA GERAL: {e} ===")
    finally:
        # restore stdout
        sys.stdout = sys.__stdout__
        sys.stderr = sys.__stderr__

app = Flask(__name__)
# Enable CORS for all routes and origins to allow cross-origin requests from Vercel
CORS(app, resources={r"/*": {"origins": "*"}})

@app.route('/', methods=['GET'])
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "online", "message": "PuxaAi API Backend is running!"}), 200

@app.route('/api/sync', methods=['POST'])
def sync_data():
    data = request.json
    matricula = data.get('matricula')
    senha = data.get('senha')
    
    if not matricula or not senha:
        return jsonify({"status": "error", "message": "Matrícula e senha são obrigatórias"}), 400
        
    print(f"Recebida requisição de sync para: {matricula}")
    
    # Run the main pipeline (Scraping)
    result = run_pipeline(user=matricula, password=senha)
    
    if result["status"] == "success":
        try:
            # Upload the extracted files to Firebase Firestore
            print("\nIniciando upload para o Firebase...")
            export_firebase_main()
            return jsonify({
                "status": "success", 
                "message": "Dados processados e sincronizados com o banco com sucesso!",
                "matricula": matricula
            }), 200
        except Exception as e:
            return jsonify({
                "status": "error",
                "message": f"Scraping concluído, mas falha ao exportar para o banco: {e}"
            }), 500
    else:
        return jsonify(result), 400

@app.route('/api/sync_bg', methods=['POST'])
def sync_data_bg():
    global status_dict
    data = request.json
    matricula = data.get('matricula')
    senha = data.get('senha')
    
    if not matricula or not senha:
        return jsonify({"status": "error", "message": "Matrícula e senha obrigatórias"}), 400
        
    if status_dict["status"] == "running":
        return jsonify({"status": "started", "message": "Já existe um processo em andamento."})
        
    thread = threading.Thread(target=bg_task, args=(matricula, senha))
    thread.start()
    return jsonify({"status": "started", "message": "Background job started"})

@app.route('/api/sync_status', methods=['GET'])
def get_sync_status():
    return jsonify(status_dict)

@app.route('/api/stream_logs', methods=['GET'])
def stream_logs():
    if not os.path.exists(LOG_FILE):
        return jsonify({"logs": []})
    with open(LOG_FILE, 'r', encoding='utf-8') as f:
        # Pega as últimas 300 linhas ativas
        lines = f.readlines()
    return jsonify({"logs": [l.strip() for l in lines[-300:] if l.strip()]})

@app.route('/api/data/<matricula>', methods=['GET'])
def get_data(matricula):
    matricula_upper = matricula.upper()
    planned_ids = []
    
    # Check local saved plan
    local_plans_dir = os.path.join(os.path.dirname(__file__), 'data', 'user_plans')
    local_plan_file = os.path.join(local_plans_dir, f"{matricula_upper}.json")
    if os.path.exists(local_plan_file):
        try:
            with open(local_plan_file, 'r', encoding='utf-8') as f:
                pdata = json.load(f)
                planned_ids = pdata.get('plannedIds', [])
        except Exception:
            pass

    try:
        db = init_firebase()
        if db:
            user_doc = db.collection('users').document(matricula_upper).get()
            if user_doc.exists:
                udata = user_doc.to_dict() or {}
                if 'plannedIds' in udata and udata['plannedIds']:
                    planned_ids = udata['plannedIds']
    except Exception as e:
        print(f"Aviso Firebase em get_data: {e}")

    data_path = os.path.join(os.path.dirname(__file__), 'data', 'clean_data.json')
    if not os.path.exists(data_path):
        data_path = os.path.join(os.path.dirname(__file__), 'output', 'matricula_data.json')
    
    if not os.path.exists(data_path):
        return jsonify({"status": "success", "data": {"courses": [], "user": {"planned_course_ids": planned_ids}}}), 200
        
    try:
        with open(data_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        if "user" not in data or not isinstance(data["user"], dict):
            data["user"] = {}
        data["user"]["planned_course_ids"] = planned_ids
        return jsonify({"status": "success", "data": data}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": f"Erro ao ler os dados locais: {e}"}), 500

@app.route('/api/curriculo/<matricula>', methods=['GET'])
def get_curriculo(matricula):
    matricula_upper = matricula.upper()
    try:
        db = init_firebase()
        if db:
            user_doc = db.collection('users').document(matricula_upper).get()
            if user_doc.exists:
                user_info = user_doc.to_dict() or {}
                docs = db.collection('users').document(matricula_upper).collection('curriculo').stream()
                data = [doc.to_dict() for doc in docs]
                return jsonify({
                    "status": "success", 
                    "user_info": user_info,
                    "curriculo": data
                }), 200
    except Exception as e:
        print(f"Aviso Firebase em get_curriculo: {e}. Usando fallback local.")

    # Fallback to local scraped JSON
    local_path = os.path.join(os.path.dirname(__file__), "data", "curriculo_integralizacao.json")
    if os.path.exists(local_path):
        try:
            with open(local_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            aluno_info = data.get("aluno", {})
            return jsonify({
                "status": "success",
                "user_info": aluno_info,
                "curriculo": data.get("disciplinas", [])
            }), 200
        except Exception as err:
            return jsonify({"status": "error", "message": f"Erro ao ler os dados locais: {err}"}), 500
            
    return jsonify({"status": "error", "message": "Dados não encontrados no banco nem localmente. Faça a sincronização primeiro!"}), 404

@app.route('/api/social/privacy', methods=['POST'])
def toggle_privacy():
    try:
        data = request.json
        matricula = data.get('matricula', '').upper()
        is_public = data.get('isPublic', False)
        
        db = init_firebase()
        if db:
            db.collection('users').document(matricula).set({'isPublic': is_public}, merge=True)
        return jsonify({"status": "success", "isPublic": is_public}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/social/sync_schedule', methods=['POST'])
def sync_schedule():
    try:
        data = request.json
        matricula = data.get('matricula', '').upper()
        planned_ids = data.get('plannedIds', [])
        
        db = init_firebase()
        if db:
            db.collection('users').document(matricula).set({'plannedIds': planned_ids}, merge=True)
            
        # Store in local plans directory as fallback
        local_plans_dir = os.path.join(os.path.dirname(__file__), 'data', 'user_plans')
        os.makedirs(local_plans_dir, exist_ok=True)
        local_plan_file = os.path.join(local_plans_dir, f"{matricula}.json")
        with open(local_plan_file, 'w', encoding='utf-8') as f:
            json.dump({"plannedIds": planned_ids}, f)

        return jsonify({"status": "success", "plannedIds": planned_ids}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/social/search', methods=['GET'])
def search_colleagues():
    try:
        q = request.args.get('q', '').lower().strip()
        if not q or len(q) < 2:
            return jsonify({"status": "success", "results": []})
            
        results = []
        user_ids = set()

        # 1. Search in Firebase
        try:
            db = init_firebase()
            if db:
                users_ref = db.collection('users').stream()
                for doc in users_ref:
                    user_data = doc.to_dict() or {}
                    name = user_data.get('nome', '')
                    mat = doc.id
                    if q in name.lower() or q in mat.lower():
                        results.append({
                            "matricula": mat,
                            "nome": name or mat,
                            "plannedIds": user_data.get('plannedIds', [])
                        })
                        user_ids.add(mat.upper())
        except Exception as fe:
            print(f"Aviso Firebase em search_colleagues: {fe}")

        # 2. Search local user plans directory as fallback
        local_plans_dir = os.path.join(os.path.dirname(__file__), 'data', 'user_plans')
        if os.path.exists(local_plans_dir):
            for fname in os.listdir(local_plans_dir):
                if fname.endswith('.json'):
                    mat = fname[:-5].upper()
                    if mat not in user_ids and (q in mat.lower()):
                        try:
                            with open(os.path.join(local_plans_dir, fname), 'r', encoding='utf-8') as f:
                                pdata = json.load(f)
                                results.append({
                                    "matricula": mat,
                                    "nome": mat,
                                    "plannedIds": pdata.get('plannedIds', [])
                                })
                        except Exception:
                            pass

        return jsonify({"status": "success", "results": results}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/social/schedule/<matricula>', methods=['GET'])
def get_guest_schedule(matricula):
    mat_upper = matricula.upper()
    planned_ids = []
    nome = mat_upper

    # Check local fallback first
    local_plan_file = os.path.join(os.path.dirname(__file__), 'data', 'user_plans', f"{mat_upper}.json")
    if os.path.exists(local_plan_file):
        try:
            with open(local_plan_file, 'r', encoding='utf-8') as f:
                pdata = json.load(f)
                planned_ids = pdata.get('plannedIds', [])
        except Exception:
            pass

    try:
        db = init_firebase()
        if db:
            doc = db.collection('users').document(mat_upper).get()
            if doc.exists:
                user_data = doc.to_dict() or {}
                nome = user_data.get('nome', mat_upper)
                if 'plannedIds' in user_data:
                    planned_ids = user_data['plannedIds']
    except Exception as e:
        print(f"Aviso Firebase em get_guest_schedule: {e}")

    return jsonify({
        "status": "success",
        "matricula": mat_upper,
        "nome": nome,
        "plannedIds": planned_ids
    }), 200

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
