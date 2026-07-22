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
            export_firebase_main()
            status_dict = {"status": "success", "message": "Concluído com sucesso!"}
            print("\n=== CONCLUIDO COM SUCESSO ===")
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
# Enable CORS so the React frontend running on another port can communicate with this API
CORS(app)

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
    print(f"Buscando dados locais para a matricula: {matricula}")
    data_path = os.path.join(os.path.dirname(__file__), 'data', 'clean_data.json')
    
    if not os.path.exists(data_path):
        return jsonify({"status": "error", "message": "Dados não encontrados. Você precisa sincronizar primeiro!"}), 404
        
    try:
        with open(data_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return jsonify({"status": "success", "data": data}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": f"Erro ao ler os dados locais: {e}"}), 500

@app.route('/api/curriculo/<matricula>', methods=['GET'])
def get_curriculo(matricula):
    try:
        matricula_upper = matricula.upper()
        db = init_firebase()
        
        # Get user root document for metadata
        user_doc = db.collection('users').document(matricula_upper).get()
        user_info = user_doc.to_dict() if user_doc.exists else {}

        # Get curriculum subcollection
        docs = db.collection('users').document(matricula_upper).collection('curriculo').stream()
        data = [doc.to_dict() for doc in docs]
        
        return jsonify({
            "status": "success", 
            "user_info": user_info,
            "curriculo": data
        }), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/social/privacy', methods=['POST'])
def toggle_privacy():
    try:
        data = request.json
        matricula = data.get('matricula', '').upper()
        is_public = data.get('isPublic', False)
        
        db = init_firebase()
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
        db.collection('users').document(matricula).set({'plannedIds': planned_ids}, merge=True)
        return jsonify({"status": "success"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/social/search', methods=['GET'])
def search_colleagues():
    try:
        q = request.args.get('q', '').lower()
        if not q or len(q) < 3:
            return jsonify({"status": "success", "results": []})
            
        db = init_firebase()
        # In Firestore, partial text search is tricky, but since we have a relatively small dataset
        # or we just fetch all public users and filter in python for now.
        users_ref = db.collection('users').where('isPublic', '==', True).stream()
        results = []
        for doc in users_ref:
            user_data = doc.to_dict()
            name = user_data.get('nome', '')
            if q in name.lower():
                results.append({
                    "matricula": doc.id,
                    "nome": name,
                    "plannedIds": user_data.get('plannedIds', [])
                })
                
        return jsonify({"status": "success", "results": results}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/social/schedule/<matricula>', methods=['GET'])
def get_guest_schedule(matricula):
    try:
        db = init_firebase()
        doc = db.collection('users').document(matricula.upper()).get()
        if not doc.exists:
            return jsonify({"status": "error", "message": "Usuário não encontrado"}), 404
            
        user_data = doc.to_dict()
        if not user_data.get('isPublic', False):
            return jsonify({"status": "error", "message": "Grade deste usuário é privada"}), 403
            
        return jsonify({
            "status": "success",
            "matricula": doc.id,
            "nome": user_data.get('nome', ''),
            "plannedIds": user_data.get('plannedIds', [])
        }), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
