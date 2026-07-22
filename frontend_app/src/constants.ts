import type { Course } from './types';
import horariosRaw from './horarios.CSV?raw';
import fluxogramasRaw from './fluxogramas.csv?raw';

export const normalizeName = (s: string): string => {
  let n = s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9]/g, ''); // alphanumeric only
    
  n = n.replace(/i{1,3}$/i, match => match.length.toString()).replace(/iv$/i, '4').replace(/v$/i, '5');

  const ALIAS_MAP: Record<string, string> = {
    'humanidadesecienciassociais': 'hcs',
    'humanidadeseciencsociais': 'hcs',
    'equacoesdiferenciaisordinariasedo': 'edo',
    'equacoesdiferenciaisordinarias': 'edo',
    'equacoesdiferenciaisparciaiseseriesedps': 'edps',
    'equacoesdiferenciaisparciaiseseries': 'edps',
    'fundamentosdeengenhariadeseguranca': 'funddeengdeseg',
    'fundamentodeengenhariadeseguranca': 'funddeengdeseg',
    'resistenciadosmateriais3': 'resistdemat3',
    'resistenciademateriais3': 'resistdemat3',
    'fenomenosdetransporte': 'fenomenosdetransp',
    'fenomenosdetransferencia': 'fenomenosdetransp',
    'eletromagnetismo1': 'eletromag1',
    'eletromagnetismo2': 'eletromag2',
    'controleseservomecanismos1': 'controleeservomec1',
    'controleeservomecanismos1': 'controleeservomec1',
    'controleeservomec1': 'controleeservomec1',
    'controleseservomecanismos2': 'controleeservomec2',
    'controleeservomecanismos2': 'controleeservomec2',
    'controleseservomecanismo2': 'controleeservomec2',
    'controleeservomec2': 'controleeservomec2',
    'planejamentodaproducao': 'planejdaproducao',
    'medidaseletricasemagneticas': 'medeletemagneticas',
    'calculoeletricodelinhasdetransmissao': 'calceletdelinhasdetransm',
    'calculomecanicodelinhasdetransmissao': 'calcmecdelinhasdetransm',
    'analisedesistemasdepotencia1': 'analisedesistdepot1',
    'analisedesistemasdepotencia2': 'analisedesistdepot2',
    'instalacoeseletricasindustriais': 'insteletindustriais',
    'subestacoesindustriaiseequipamentos': 'substindusteequip',
    'protecaodosistemaeletrico': 'protdosistemaelet',
    'estabilidadeemsistemasdepotencias': 'estabdesistdepot1',
    'transitorioseletromagneticos': 'transitorioseletromag',
    'calculoavariasvariaveis': 'calcavariasvariaveis',
    'introducaoaengenharia': 'introducaoaengenharia',
    'introducaoaengenhariaeletrica': 'introducaoaengenharia',
    'materiaisdeconstcivil1': 'matconstcivil1',
    'materiaisdeconstrucaocivil1': 'matconstcivil1',
    'materiaisdeconstcivil2': 'matconstcivil2',
    'materiaisdeconstrucaocivil2': 'matconstcivil2',
    'materiaisdeconstmecanica': 'matconstmecanica',
    'materiaisdeconstrucaomecanica': 'matconstmecanica',
    'insthidraulicasesanitarias': 'insthidraulicas',
    'instalacoeshidraulicasesanitarias': 'insthidraulicas',
    'tecnologiadaconstrucoes2': 'tecconstrucoes2',
    'tecnologiadasconstrucoes2': 'tecconstrucoes2',
    'metalografiaetrattermicos1': 'metalografia1',
    'metalografiaetratamentostermicos1': 'metalografia1',
    'metalografiaetrattermicos2': 'metalografia2',
    'metalografiaetratamentostermicos2': 'metalografia2',
    'processosdefabricacao1': 'procfabricacao1',
    'processosdefabricacao2': 'procfabricacao2',
    'processosdefabricacao': 'procfabricacao',
    'estqualcofiabilidade': 'estqualconfiabilidade',
    'estqualeconfiabilidade': 'estqualconfiabilidade',
    'estatisticaqualidadeeconfiabilidade': 'estqualconfiabilidade',
    'psisocitrab': 'psicologiasocial',
    'psicologiasocialedotrabalho': 'psicologiasocial',
    'projorganizacional': 'projetoorganizacional',
    'projetoorganizacional': 'projetoorganizacional',
    'gestmanutencao': 'gestaodemanutencao',
    'gestaodemanutencao': 'gestaodemanutencao',
    'pcp1': 'pcp1',
    'planejamentoecontroledaproducao1': 'pcp1',
    'pcp2': 'pcp2',
    'planejamentoecontroledaproducao2': 'pcp2',
    'projproduto': 'projetodeproduto',
    'projetodeproduto': 'projetodeproduto',
    'algebralinearl': 'algebralinear1',
    'algebralinear1': 'algebralinear1',
    'algoritomoseprogramacao': 'algoritmos',
    'algoritmoseprogramacao': 'algoritmos',
    'praticasdefisica2': 'praticasdefisica2',
    'praticasdefisicaexperimental2': 'praticasdefisica2',
    'metodosdepesquisa': 'metodologiadepesquisa',
    'metodologiaepesquisa': 'metodologiadepesquisa',
    'legislacaodeinformatica': 'legislacao',
    'direitolegislacao': 'legislacao',
    'expressaooraleescrita': 'expressao',
    'comunicacaoeexpressao': 'expressao',
    'fundamentosdedesenhodeprojeto': 'fundamentosdesenho'
  };

  return ALIAS_MAP[n] || n;
};

const HORARIOS_TO_FLUX_MAP: Record<string, string> = {
  'GADM': 'ADM',
  'BCC': 'BCC',
  'GAMB': 'GAMB',
  'GAUT': 'GAUT',
  'GCIV': 'GCIV',
  'GEL': 'GEL',
  'GELT': 'GELT',
  'GFIS': 'GFIS',
  'GMEC': 'GMEC',
  'GPROD': 'GPRO',
  'GTEL': 'GTEL',
  'GLEA': 'LEANI'
};

export const parseCSV = (hRaw: string, fRaw: string) => {
  // 1. Parse schedules from horarios.CSV
  const hLines = hRaw.split('\n');
  const scheduleResult = [];
  const horariosNamesByMajor = new Map<string, Set<string>>();

  for (let i = 1; i < hLines.length; i++) {
    const line = hLines[i].trim();
    if (!line) continue;
    const cols = line.split(';');
    
    if (cols.length < 10) continue;

    const codCurso = cols[0];
    const codTurma = cols[2];
    const nome = cols[4];
    const dia = cols[6];
    const inicio = cols[7];
    const fim = cols[8];
    const sala = cols[9];
    const docente = cols[10] || 'A Definir';

    const uniqueCode = codCurso + ' ' + codTurma;

    scheduleResult.push({
      code: uniqueCode,
      classCode: codTurma,
      courseCode: codCurso,
      name: nome,
      day: dia,
      start: inicio,
      end: fim,
      room: sala,
      teacher: docente,
      type: 'Teórica'
    });

    if (!horariosNamesByMajor.has(codCurso)) {
      horariosNamesByMajor.set(codCurso, new Set());
    }
    horariosNamesByMajor.get(codCurso)!.add(nome);
  }

  // 2. Parse curriculum courses from fluxogramas.csv
  const fLines = fRaw.split('\n');
  const fCoursesByMajor: Record<string, { name: string; sem: number; prereqs: string[] }[]> = {};

  for (let i = 1; i < fLines.length; i++) {
    const line = fLines[i].trim();
    if (!line) continue;
    
    // Remove surrounding quotes if any
    const cleanedLine = line.replace(/^"|"$/g, '');
    const cols = cleanedLine.split(';');
    if (cols.length < 2) continue;

    const major = cols[0].trim();
    const name = cols[1].trim();
    const sem = parseInt(cols[2], 10) || 0;
    const prereqs = cols[3] ? cols[3].split(',').map(p => p.trim()).filter(Boolean) : [];

    if (!fCoursesByMajor[major]) {
      fCoursesByMajor[major] = [];
    }
    fCoursesByMajor[major].push({ name, sem, prereqs });
  }

  // 3. Construct curricula, aligning names with schedules where possible
  const curricula: Record<string, Course[]> = {};

  for (const [hMajor, fMajor] of Object.entries(HORARIOS_TO_FLUX_MAP)) {
    const hSet = horariosNamesByMajor.get(hMajor) || new Set<string>();
    const fList = fCoursesByMajor[fMajor] || [];

    // Map from normalized name to exact schedules name (uppercase with accents)
    const normToHName: Record<string, string> = {};
    for (const hName of hSet) {
      normToHName[normalizeName(hName)] = hName;
    }

    // Map from fluxograma name to matched schedule name or fallback uppercase
    const fNameToMappedName: Record<string, string> = {};
    fList.forEach(c => {
      const norm = normalizeName(c.name);
      const hName = normToHName[norm];
      fNameToMappedName[c.name] = hName || c.name.toUpperCase();
    });

    curricula[hMajor] = fList.map(c => {
      const mappedName = fNameToMappedName[c.name];
      const mappedPrereqs = c.prereqs.map(p => {
        const normP = normalizeName(p);
        // Find matching course in the same curriculum first to align names
        const match = fList.find(fc => normalizeName(fc.name) === normP);
        if (match) {
          return fNameToMappedName[match.name];
        }
        return p.toUpperCase();
      });

      return {
        id: mappedName,
        name: mappedName,
        semester: c.sem,
        prereqs: mappedPrereqs
      };
    }).sort((a, b) => a.semester - b.semester);

    // Add missing courses from horarios.CSV as electives (semestre 0)
    const includedNames = new Set(curricula[hMajor].map(c => normalizeName(c.id)));
    for (const hName of hSet) {
      if (!includedNames.has(normalizeName(hName))) {
        curricula[hMajor].push({
          id: hName,
          name: hName,
          semester: 0,
          prereqs: []
        });
      }
    }
  }

  return { schedule: scheduleResult, curricula };
};

const parsedData = parseCSV(horariosRaw, fluxogramasRaw);

export const SCHEDULE_RAW_DATA = parsedData.schedule;
export const CURRICULA = parsedData.curricula;

export const COURSES_LIST = [
  { code: 'GCIV', name: 'Engenharia Civil' },
  { code: 'GEL', name: 'Engenharia Elétrica' },
  { code: 'GAMB', name: 'Engenharia Ambiental' },
  { code: 'GAUT', name: 'Engenharia de Controle e Automação' },
  { code: 'GELT', name: 'Engenharia Eletrônica' },
  { code: 'GMEC', name: 'Engenharia Mecânica' },
  { code: 'GTEL', name: 'Engenharia de Telecomunicações' },
  { code: 'GADM', name: 'Administração' },
  { code: 'BCC', name: 'Ciência da Computação' },
  { code: 'GFIS', name: 'Física' },
  { code: 'GPROD', name: 'Engenharia de Produção' },
  { code: 'GLEA', name: 'Línguas Estrangeiras Aplicadas' }
];
