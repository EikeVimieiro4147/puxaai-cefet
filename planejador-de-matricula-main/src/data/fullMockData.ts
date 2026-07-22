
export const fullMockData = {
    "version": "1.0",
    "metadata": {
        "semester": "2024/1",
        "last_update": "2024-02-18T10:00:00Z"
    },
    "courses": [
        {
            "id": "1",
            "code": "MAT101",
            "name": "Cálculo I",
            "degree": "Engenharia de Software",
            "professors": ["Dr. Carlos Silva"],
            "period": "1",
            "credits": 4,
            "occupancy": {
                "total": "60",
                "occupied": "60",
                "requested": "9"
            },
            "slots": [
                { "day": "SEG", "start": "08:10", "end": "10:50" },
                { "day": "QUA", "start": "08:10", "end": "10:50" }
            ],
            "pre_requisits": []
        },
        {
            "id": "2",
            "code": "FIS101",
            "name": "Física I",
            "degree": "Engenharia de Software",
            "professors": ["Dra. Ana Martins"],
            "period": "1",
            "credits": 4,
            "occupancy": {
                "total": "50",
                "occupied": "30",
                "requested": "12"
            },
            "slots": [
                { "day": "TER", "start": "10:00", "end": "12:00" },
                { "day": "QUI", "start": "10:00", "end": "12:00" }
            ],
            "pre_requisits": []
        },
        {
            "id": "3",
            "code": "COMP101",
            "name": "Introdução à Programação",
            "degree": "Engenharia de Software",
            "professors": ["Dr. Pedro Oliveira"],
            "period": "1",
            "credits": 4,
            "occupancy": {
                "total": "45",
                "occupied": "40",
                "requested": "3"
            },
            "slots": [
                { "day": "SEG", "start": "14:00", "end": "16:00" },
                { "day": "QUA", "start": "14:00", "end": "16:00" }
            ],
            "pre_requisits": []
        },
        {
            "id": "4",
            "code": "MAT201",
            "name": "Cálculo II",
            "degree": "Engenharia de Software",
            "professors": ["Dra. Maria Santos"],
            "period": "2",
            "credits": 4,
            "occupancy": {
                "total": "55",
                "occupied": "20",
                "requested": "5"
            },
            "slots": [
                { "day": "SEG", "start": "08:00", "end": "10:00" },
                { "day": "QUA", "start": "10:00", "end": "12:00" }
            ],
            "pre_requisits": ["MAT101"]
        },
        {
            "id": "5",
            "code": "COMP201",
            "name": "Estrutura de Dados",
            "degree": "Engenharia de Software",
            "professors": ["Dr. João Lima"],
            "period": "3",
            "credits": 4,
            "occupancy": {
                "total": "40",
                "occupied": "25",
                "requested": "10"
            },
            "slots": [
                { "day": "TER", "start": "14:00", "end": "16:00" },
                { "day": "QUI", "start": "14:00", "end": "16:00" }
            ],
            "pre_requisits": ["COMP101"]
        },
        {
            "id": "6",
            "code": "CC101",
            "name": "Teoria da Computação",
            "degree": "Ciência da Computação",
            "professors": ["Dr. Alan Turing"],
            "period": "4",
            "credits": 4,
            "occupancy": {
                "total": "40",
                "occupied": "38",
                "requested": "5"
            },
            "slots": [
                { "day": "SEG", "start": "10:10", "end": "11:50" },
                { "day": "QUA", "start": "10:10", "end": "11:50" }
            ],
            "pre_requisits": ["MAT101"]
        },
        {
            "id": "7",
            "code": "CC102",
            "name": "Análise de Algoritmos",
            "degree": "Ciência da Computação",
            "professors": ["Dr. Donald Knuth"],
            "period": "5",
            "credits": 4,
            "occupancy": {
                "total": "30",
                "occupied": "15",
                "requested": "2"
            },
            "slots": [
                { "day": "TER", "start": "08:10", "end": "09:50" },
                { "day": "QUI", "start": "08:10", "end": "09:50" }
            ],
            "pre_requisits": ["COMP201"]
        },
        {
            "id": "8",
            "code": "SI101",
            "name": "Banco de Dados I",
            "degree": "Sistemas de Informação",
            "professors": ["Dra. Grace Hopper"],
            "period": "3",
            "credits": 4,
            "occupancy": {
                "total": "50",
                "occupied": "50",
                "requested": "20"
            },
            "slots": [
                { "day": "SEX", "start": "19:00", "end": "22:00" }
            ],
            "pre_requisits": ["COMP101"]
        },
        {
            "id": "9",
            "code": "SI102",
            "name": "Gestão de Projetos",
            "degree": "Sistemas de Informação",
            "professors": ["Dr. Frederick Brooks"],
            "period": "6",
            "credits": 2,
            "occupancy": {
                "total": "40",
                "occupied": "10",
                "requested": "0"
            },
            "slots": [
                { "day": "SEG", "start": "19:00", "end": "20:40" }
            ],
            "pre_requisits": []
        },
        {
            "id": "10",
            "code": "MAT102",
            "name": "Álgebra Linear",
            "degree": "Engenharia de Software",
            "professors": ["Dr. Gilbert Strang"],
            "period": "2",
            "credits": 4,
            "occupancy": {
                "total": "80",
                "occupied": "45",
                "requested": "2"
            },
            "slots": [
                { "day": "TER", "start": "14:00", "end": "16:00" },
                { "day": "QUI", "start": "14:00", "end": "16:00" }
            ],
            "pre_requisits": []
        },
        {
            "id": "11",
            "code": "CC201",
            "name": "Compiladores",
            "degree": "Ciência da Computação",
            "professors": ["Dra. Grace Hopper"],
            "period": "6",
            "credits": 4,
            "occupancy": {
                "total": "30",
                "occupied": "20",
                "requested": "1"
            },
            "slots": [
                { "day": "TER", "start": "10:10", "end": "11:50" },
                { "day": "QUI", "start": "10:10", "end": "11:50" }
            ],
            "pre_requisits": ["CC101"]
        },
        {
            "id": "12",
            "code": "SI201",
            "name": "IHC",
            "degree": "Sistemas de Informação",
            "professors": ["Dr. Don Norman"],
            "period": "4",
            "credits": 4,
            "occupancy": {
                "total": "45",
                "occupied": "42",
                "requested": "8"
            },
            "slots": [
                { "day": "QUA", "start": "14:00", "end": "15:40" },
                { "day": "SEX", "start": "14:00", "end": "15:40" }
            ],
            "pre_requisits": []
        }
    ],
    "user": {
        "confirmed_course_ids": ["1", "2", "3"],
        "planned_course_ids": [],
        "completed_courses_codes": ["MAT101", "COMP101"]
    }
};


