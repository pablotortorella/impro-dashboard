const demoCourseModules = [
  "Módulo 1: Cuerpo",
  "Módulo 2: Discurso",
  "Módulo 3: Escenario",
  "Módulo 4: El salto",
  "Foro",
  "Encuesta Saltar al Vacío",
  "Certificado",
];

const demoRawStudents = [
  ["Bombilla Pantalones Cuadrados", "bombilla@cangreburger-labs.test", 6],
  ["Patricio Estrellado", "patricio@medusitas-felices.test", 0],
  ["Arenita Mejillas", "arenita@bellotas-espaciales.test", 5],
  ["Calamardo Tentaculos", "calamardo@clarinetes-del-mar.test", 6],
  ["Don Cangrejo Monedero", "cangrejo@tesoros-crocantes.test", 6],
  ["Burbujita Utonia", "burbujita@superazucar-pop.test", 6],
  ["Bomboncita Utonia", "bomboncita@patadas-arcoiris.test", 6],
  ["Bellota Utonia", "bellota@laboratorio-profesor.test", 6],
  ["Dexter Mandil Rojo", "dexter@cerebritos-unidos.test", 6],
  ["Dee Dee Bailarina", "deedee@botones-prohibidos.test", 6],
  ["Johnny Bravo Copete", "johnny@peines-dorados.test", 6],
  ["Vaca Supermoo", "vaca@granjas-voladoras.test", 6],
  ["Pollito Valiente", "pollito@huevitos-corporativos.test", 6],
  ["Coraje Rosado", "coraje@molino-misterioso.test", 0, 0],
  ["Mandy Sonrisa Cero", "mandy@cejas-afiladas.test", 6],
  ["Billy Cabeza Alegre", "billy@ideas-brillantes.test", 0],
  ["Finn Aventurero", "finn@espadas-de-goma.test", 0],
  ["Jake Elastico", "jake@panqueques-magicos.test", 0],
  ["Marceline Bajista", "marceline@sombras-rockeras.test", 6],
  ["Princesa Chicle", "chicle@dulcelandia-innovacion.test", 7],
  ["Benson Gumball", "benson@parque-ordenado.test", 3, 3],
  ["Mordecai Azulon", "mordecai@papitas-del-parque.test", 4, 4],
  ["Rigby Saltarin", "rigby@retos-imposibles.test", 6],
  ["Gumball Watterson", "gumball@elmore-soluciones.test", 6],
  ["Darwin Watterson", "darwin@pecera-digital.test", 6],
  ["Anais Watterson", "anais@genios-miniatura.test", 6],
  ["Steven Universo", "steven@galletas-estrella.test", 6, 4],
  ["Perla Brillante", "perla@gemas-organizadas.test", 6],
  ["Amatista Rebelde", "amatista@cuarzos-divertidos.test", 0],
  ["Garnet Fusion", "garnet@vision-futura.test", 6],
  ["Mabel Pines", "mabel@sueteres-brillantes.test", 7],
  ["Dipper Pines", "dipper@misterios-del-bosque.test", 6],
];

const demoCompletionDate = (studentIndex, moduleIndex) => {
  const day = 3 + ((studentIndex + moduleIndex) % 6);
  const hour = 9 + ((studentIndex + moduleIndex * 2) % 8);
  const minute = (studentIndex * 7 + moduleIndex * 11) % 60;
  return `${day} jul 2026, ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};

const demoStudents = demoRawStudents.map(([name, email, completed, currentModule], index) => {
  const modules = demoCourseModules.map((module, moduleIndex) => {
    let status = moduleIndex < completed ? "Finalizado" : "No finalizado";
    if (moduleIndex === currentModule) status = "En progreso";
    return {
      name: module,
      status,
      completedAt: status === "Finalizado" ? demoCompletionDate(index, moduleIndex) : "",
    };
  });

  const progress = Math.round((completed / demoCourseModules.length) * 100);
  let status = "En progreso";
  if (completed === demoCourseModules.length) status = "Finalizado";
  if (completed === 0 && currentModule === undefined) status = "Sin iniciar";

  const recentDates = ["8 jul", "7 jul", "5 jul", "3 jul", "1 jul", "28 jun"];

  return {
    id: index + 1,
    name,
    email,
    completed,
    progress,
    status,
    modules,
    lastActivity: status === "Sin iniciar" ? "Sin actividad" : recentDates[index % recentDates.length],
  };
});

const demoDataset = {
  clientName: "Acme Dibujitos S.A.",
  courseName: "Expresión oral y corporal",
  category: "Comunicación",
  sourceName: "Planilla de ejemplo",
  updatedLabel: "Datos de ejemplo",
  modules: demoCourseModules,
  students: demoStudents,
};
