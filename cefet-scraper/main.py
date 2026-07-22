import os
from scrap.login import login
from scrap.get_historico_integralizacao import get_historico_integralizacao
from scrap.get_turmas_matricula_data import get_turmas_matricula_data
from scrap.get_turmas_disponiveis_data import get_turmas_disponiveis_data
from transform.transform_data import run_transformation
from transform.generate_ics import generate_ics

def run_pipeline(user=None, password=None):
    """
    Função principal que orquestra o fluxo completo de raspagem e transformação de dados.
    Recebe user e password opcionais; se não fornecidos, tenta usar variáveis de ambiente.
    """
    print("=== Iniciando CEFET Scraper ===")
    
    try:
        # 1. Login
        user_data, session = login(user, password)
        matricula = user_data["matricula"]
        
        # Garantir que a pasta data existe
        os.makedirs("data", exist_ok=True)
        
        # 2. Raspagem de Histórico
        print("\n[1/3] Raspando histórico e currículo integral...")
        get_historico_integralizacao(session=session, matricula=matricula)
        
        # 3. Raspagem de Turmas Matriculadas
        print("\n[2/3] Raspando turmas matriculadas/solicitadas...")
        turmas_matricula_data = get_turmas_matricula_data(session=session, matricula=matricula)
        
        # 4. Raspagem de Turmas Disponíveis
        print("\n[3/3] Raspando turmas disponíveis (isso pode demorar)...")
        get_turmas_disponiveis_data(session=session, matricula=matricula)
        
        print("\n=== Raspagem finalizada com sucesso! ===")

        # 5. Transformação de Dados
        print("\nIniciando transformação de dados...")
        run_transformation()

        # 6. Geração de ICS
        print("\nSalvando agenda...")
        generate_ics(turmas_data=turmas_matricula_data)
        
        return {"status": "success", "matricula": matricula}
        
    except PermissionError:
        print("\nErro: Usuário ou senha inválidos")
        return {"status": "error", "message": "Usuário ou senha inválidos"}
    except ValueError as e:
        print(f"\nErro de configuração: {e}")
        return {"status": "error", "message": str(e)}
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"\nOcorreu um erro inesperado: {e}")
        return {"status": "error", "message": str(e)}

def main():
    run_pipeline()

if __name__ == "__main__":
    main()
