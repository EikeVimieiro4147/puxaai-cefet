import requests
import os
from bs4 import BeautifulSoup
from dotenv import load_dotenv

def login(user_arg=None, password_arg=None) -> tuple[dict[str, str], requests.Session]:
    """
    Cria uma nova sessão autenticada utilizando as credenciais.

    Realiza o login no portal do aluno do CEFET-RJ, obtendo os cookies de autenticação
    e extraindo os dados básicos do usuário logado.

    :return: Tupla contendo:
        - user_data: Dicionário com as chaves "nome" e "matricula"
        - session: Instância de requests.Session autenticada
    :rtype: tuple[dict[str, str], requests.Session]
    """
    print("Logando")
    
    user = user_arg
    password = password_arg
    
    # Strip spaces from inputs to deal with possible terminal copy-paste issues
    if user: user = user.strip().upper()
    if password: password = password.strip()
    
    if not user or not password:
        load_dotenv()
        user = os.getenv('user')
        password = os.getenv('password')
        if user: user = user.upper()

    if not user or not password:
        raise ValueError("Usuário e senha não foram passados e não estão no .env")

    session = requests.session()
    session.headers.update({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:141.0) Gecko/20100101 Firefox/141.0",
        "Accept": "text/html",
        "Accept-Language": "pt-BR",
        "Referer": "https://cpa.cefet-rj.br/", # Evita Avaliação CPA 
    })

    # Pega o cookie de acesso - JSESSIONID
    main_page_url = "https://alunos.cefet-rj.br/aluno/"
    session.get(main_page_url)

    # Pega cookie de autentificação - JSESSIONIDSSO
    login_url = "https://alunos.cefet-rj.br/aluno/j_security_check"
    login_data = {"j_username": user, "j_password": password}
    login_response = session.post(login_url, data=login_data)

    if login_response.status_code == 403:
        raise PermissionError("Usuário ou senha inválidos")
    elif login_response.status_code != 200:
        raise RuntimeError(
            f"Erro HTTP no login: {login_response.status_code}"
        )

    login_soup = BeautifulSoup(login_response.text, 'html.parser')
    menu_el = login_soup.find(id="menu")
    if not menu_el:
        raise PermissionError("Usuário ou senha inválidos. (Acesso negado no portal)")
        
    nome = menu_el.find('button').text
    matricula = login_soup.find(id='matricula')['value']

    print(f"Logado: {nome} | {matricula}")

    user_data = {"nome": nome, "matricula": matricula}

    return (user_data, session)