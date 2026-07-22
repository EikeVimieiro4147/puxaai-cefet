import json
import os
import re

def convert_day(day_str):
    # Map "3 - Terça-feira" to "TER"
    mapping = {
        '2': 'SEG',
        '3': 'TER',
        '4': 'QUA',
        '5': 'QUI',
        '6': 'SEX',
        '7': 'SAB'
    }
    match = re.match(r'^(\d)', day_str)
    if match:
        return mapping.get(match.group(1), 'SEG')
    return 'SEG'

def build_slots(horarios):
    slots = []
    for h in horarios:
        slots.append({
            "day": convert_day(h.get("Dia da Semana", "")),
            "start": h.get("Hora In\u00edcio", "00:00"),
            "end": h.get("Hora Fim", "00:00")
        })
    return slots

def parse_credits(carga):
    try:
        # standardizing calculation assuming 1 credit = 18 hours
        return int(int(carga) / 18)
    except:
        return 4

def convert():
    current_dir = os.path.dirname(__file__)
    data_dir = os.path.join(current_dir, 'data')
    input_file = os.path.join(data_dir, 'turmas_disponiveis_data.json')
    output_file = os.path.join(data_dir, 'clean_data.json')

    if not os.path.exists(input_file):
        print(f"Error: {input_file} not found.")
        return

    with open(input_file, 'r', encoding='utf-8') as f:
        raw_turmas = json.load(f)

    # Convert mapping of objects to array of courses
    # "135775": { ... }
    courses = []
    for turma_id, turma_data in raw_turmas.items():
        docentes = [d.get("Nome do Docente", "") for d in (turma_data.get("Docentes") or [])]
        
        prereqs = []
        # if the scraper adds prerequisites later, put them here
        
        course = {
            "id": str(turma_id),
            "code": turma_data.get("Nome", turma_id),
            "name": turma_data.get("Disciplina", "Unknown"),
            "degree": turma_data.get("Curso", ""),
            "professors": docentes,
            "period": turma_data.get("Per\u00edodo", "1"),
            "credits": parse_credits(turma_data.get("Carga Hor\u00e1ria Realizada", "72")),
            "occupancy": {
                "total": turma_data.get("Vagas Totais", "40"),
                "occupied": turma_data.get("Vagas Ocupadas", "0"),
                "requested": turma_data.get("Total de Solicita\u00e7\u00f5es", "0")
            },
            "slots": build_slots(turma_data.get("Hor\u00e1rios") or []),
            "pre_requisits": prereqs
        }
        courses.append(course)

    final_json = {
        "version": "1.0",
        "metadata": {
            "semester": "2026/1",
            "last_update": "2026-07-20T00:00:00Z"
        },
        "courses": courses,
        "user": {
            "confirmed_course_ids": [],
            "planned_course_ids": [],
            "completed_courses_codes": []  # Let GradeView handle this dynamically!
        }
    }

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(final_json, f, ensure_ascii=False, indent=4)
        
    print(f"Successfully converted {len(courses)} courses to {output_file}")

if __name__ == '__main__':
    convert()
