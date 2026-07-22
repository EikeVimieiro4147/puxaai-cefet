import sys
import os
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.prompt import Prompt, Confirm

# Adiciona o diretório cefet-scraper ao path para conseguir importar dependencias internas sem problemas de ref
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from transform.export_to_firebase import init_firebase
from main import run_pipeline
from transform.export_to_firebase import main as export_firebase_main

console = Console()

def print_header():
    console.clear()
    console.print(Panel.fit("[bold cyan]CEFET Planner - Firestore Database Manager[/bold cyan] ☁️\n[dim]Acesso Administrativo Local via Terminal[/dim]", border_style="cyan"))

def read_user(db):
    matricula = Prompt.ask("[bold yellow]Digite a matrícula do aluno[/bold yellow]")
    console.print("[dim]Consultando banco de dados...[/dim]")
    user_ref = db.collection("users").document(matricula)
    doc = user_ref.get()
    
    if not doc.exists:
        console.print(f"[red]Erro:[/red] Matrícula {matricula} não encontrada no banco.")
        return
        
    user_data = doc.to_dict()
    console.print(f"\n[bold green]Aluno:[/bold green] {user_data.get('nome')}")
    console.print(f"[bold green]Curso:[/bold green] {user_data.get('curso')} (Período Atual: {user_data.get('periodo_atual')})")
    
    curriculo_ref = user_ref.collection("curriculo").stream()
    
    table = Table(title="Grade Curricular do Aluno", show_lines=True)
    table.add_column("Código", justify="left", style="cyan", no_wrap=True)
    table.add_column("Disciplina", style="magenta")
    table.add_column("Situação", style="bold")
    
    count = 0
    # Guardar dados para iterar e printar em massa
    for disc_doc in curriculo_ref:
        data = disc_doc.to_dict()
        status = data.get("situacao", "N/A").title()
        
        # Colorindo de acordo com o status
        if status == "Vencido" or status == "Aprovado":
             color = "green"
        elif status == "Pendente" or status == "A Cursar" or status == "":
             color = "yellow"
             status = "Pendente"
        else:
             color = "dim"
             
        table.add_row(disc_doc.id, data.get("disciplina", "N/A")[:45], f"[{color}]{status}[/{color}]")
        count +=1
        
    if count > 0:
        console.print(table)
    else:
        console.print("[dim]O aluno não possui matérias salvas na subcoleção de currículo. Rode a raspagem.[/dim]")


def read_horario(db):
    cod_disc = Prompt.ask("[bold yellow]Digite o Código da Disciplina (ex: GEL 123)[/bold yellow]").strip().upper()
    console.print(f"[dim]Buscando turmas de {cod_disc}...[/dim]")
    doc = db.collection("horarios").document(cod_disc).get()
    
    if not doc.exists:
         console.print(f"[red]Erro:[/red] Disciplina {cod_disc} não consta na oferta global do FIREBASE.")
         return
         
    data = doc.to_dict()
    console.print(f"\n[bold green]{cod_disc} - {data.get('nome_disciplina')}[/bold green] (Período Ideal: {data.get('periodo_ideal')})")
    
    turmas = data.get("turmas", [])
    if not turmas:
        console.print("[dim]Nenhuma turma foi oferecida para essa matéria neste semestre.[/dim]")
        return
        
    table = Table(title="Ofertas de Turmas")
    table.add_column("Turma")
    table.add_column("Horário")
    table.add_column("Dia", style="cyan")
    table.add_column("Sala", style="dim")
    table.add_column("Professor")
    table.add_column("Vagas")
    
    for t in turmas:
        table.add_row(
            t.get("codigo_turma"),
            f"{t.get('hr_inicio')}h - {t.get('hr_fim')}h",
            t.get("dia_semana")[:3],
            t.get("sala"),
            t.get("nome_docente")[:20],
            str(t.get("vagas_oferecidas", "--"))
        )
    console.print(table)


def edit_user_course(db):
    matricula = Prompt.ask("[bold yellow]Digite a matrícula do aluno[/bold yellow]")
    cod_disc = Prompt.ask("[bold yellow]Digite o Código da Matéria (ex: FISC2)[/bold yellow]").strip()
    
    console.print("[dim]Conectando subcoleção no Firestore...[/dim]")
    doc_ref = db.collection("users").document(matricula).collection("curriculo").document(cod_disc)
    doc = doc_ref.get()
    
    if not doc.exists:
        console.print(f"[red]Erro:[/red] A matéria {cod_disc} não existe na grade desse aluno.")
        return
        
    data = doc.to_dict()
    console.print(f"\nMatéria Selecionada: [bold magenta]{data.get('disciplina')}[/bold magenta]")
    console.print(f"Status Atual: [bold grey]{data.get('situacao')}[/bold grey]")
    
    novo_status = Prompt.ask("Digite o NOVO status", choices=["Vencido", "Pendente", "Eliminado", "Cancelado", "Aprovado"])
    
    if Confirm.ask("Tem certeza que deseja sobrescrever essa informação na nuvem da Google?"):
        doc_ref.update({"situacao": novo_status})
        console.print(f"[bold green]✔ Status de {cod_disc} alterado para {novo_status} com sucesso no banco de dados![/bold green]")
        

def sync_all(db):
    console.print("\n[bold cyan]=== Modo Robô: Iniciando o Pipeline completo de Raspagem ===[/bold cyan]")
    matricula = Prompt.ask("Sua Matricula (login no terminal)")
    senha = Prompt.ask("Sua Senha do Portal", password=True)
    
    console.print("\n[dim]Acordando o robô de raspagem (Selenium/Requests)... Aguarde...[/dim]")
    
    try:
        # Puxa dados do portal
        resultado = run_pipeline(user=matricula, password=senha)
        if resultado["status"] == "success":
            console.print("[bold green]✔ Extratores locais concluídos.[/bold green]")
            console.print("[bold cyan]Subindo estrutura consolidada para o Firebase...[/bold cyan]")
            
            # Exporta pro firestore usando a logica ja criada
            export_firebase_main()
            console.print("[bold green]✨ Tudo sincronizado com sucesso no Firestore Database![/bold green]")
        else:
            console.print(f"[red]A raspagem falhou:[/red] {resultado.get('message')}")
    except Exception as e:
        console.print(f"[red]Falha Crítica do Sistema de Raspagem:[/red] {e}")


def main():
    try:
        db = init_firebase()
    except Exception as e:
        console.print(f"[red]Erro Crítico:[/red] Não foi possível autenticar a Service Account. Verifique se firebase-credentials.json está presente na raiz. Erro: {e}")
        return

    while True:
        print_header()
        console.print("[1] 👤  [cyan]LER:[/cyan] Visualizar Status e Extrato Acadêmico de um Aluno")
        console.print("[2] 📅  [cyan]LER:[/cyan] Consultar Quadro de Ofertas e Turmas")
        console.print("[3] ✏️  [yellow]EDITAR:[/yellow] Forçar mudança de Status de uma Matéria de um Usuário")
        console.print("[4] 🤖  [magenta]EXTRAIR:[/magenta] Comandar Scraper Web & Fazer Upload pro BD")
        console.print("[0] 🚪  Sair do Modo Terminal")
        
        escolha = Prompt.ask("\n[bold yellow]Selecione uma Ferramenta (Digite o número)[/bold yellow]", choices=["0", "1", "2", "3", "4"])
        
        if escolha == "0":
             console.print("\n[dim]✨ Sessão Administrativa Encerrada. Desconectando do Firestore...[/dim]")
             break
        elif escolha == "1":
             read_user(db)
        elif escolha == "2":
             read_horario(db)
        elif escolha == "3":
             edit_user_course(db)
        elif escolha == "4":
             sync_all(db)
             
        # Pausa visual antes de voltar ao loop infinito
        Prompt.ask("\n[dim]Pressione ENTER para limpar a tela e voltar ao Menu...[/dim]", default="")

if __name__ == '__main__':
    main()
