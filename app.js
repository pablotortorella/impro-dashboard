const statusOrder = ["Finalizado", "En progreso", "Sin iniciar"];
const statusColors = {
  Finalizado: "#55beb8",
  "En progreso": "#4c1d53",
  "Sin iniciar": "#f5a313",
};

let activeStatus = "all";
let dataset = demoDataset;
let courseModules = dataset.modules;
let students = dataset.students;

const columnToNumber = (column) =>
  column.split("").reduce((result, char) => result * 26 + char.charCodeAt(0) - 64, 0);

const normalizeText = (value) =>
  String(value ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const normalizeClass = (value) =>
  normalizeText(value).replace(/\s+/g, "-");

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const initials = (name) =>
  String(name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

const formatExcelDate = (serial) => {
  const number = Number(serial);
  if (!Number.isFinite(number)) return "";
  const date = new Date(Math.round((number - 25569) * 86400 * 1000));
  return new Intl.DateTimeFormat("es", { day: "numeric", month: "short", timeZone: "UTC" }).format(date);
};

const formatExcelDateTime = (serial) => {
  const number = Number(serial);
  if (!Number.isFinite(number)) return "";
  const date = new Date(Math.round((number - 25569) * 86400 * 1000));
  return new Intl.DateTimeFormat("es", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(date);
};

const titleCaseFirst = (value) => {
  const text = String(value || "").trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
};

const repairTextEncoding = (value) =>
  String(value || "")
    .replaceAll("\u00c3\u00a1", "á")
    .replaceAll("\u00c3\u00a9", "é")
    .replaceAll("\u00c3\u00ad", "í")
    .replaceAll("\u00c3\u00b3", "ó")
    .replaceAll("\u00c3\u00ba", "ú")
    .replaceAll("\u00c3\u00bc", "ü")
    .replaceAll("\u00c3\u00b1", "ñ")
    .replaceAll("\u00c3\u0081", "Á")
    .replaceAll("\u00c3\u0089", "É")
    .replaceAll("\u00c3\u008d", "Í")
    .replaceAll("\u00c3\u0093", "Ó")
    .replaceAll("\u00c3\u009a", "Ú")
    .replaceAll("\u00c3\u009c", "Ü")
    .replaceAll("\u00c3\u0091", "Ñ")
    .replaceAll("\u00c2", "")
    .replace(/\uFFFD/g, " ");

const cleanImportedLabel = (value) =>
  repairTextEncoding(value)
    .replace(/\s*\(\d+\)\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();

const knownCourseNames = [
  {
    aliases: ["expresi n oral y corporal", "expresion oral y corporal"],
    name: "Expresión oral y corporal",
  },
  {
    aliases: ["comunicaci n para la acci n", "comunicacion para la accion"],
    name: "Comunicación para la acción",
  },
];

const cleanCourseName = (value) => {
  const text = cleanImportedLabel(value)
    .replace(/\.(csv|xlsx)$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const normalized = normalizeText(text);
  const knownCourse = knownCourseNames.find((course) => course.aliases.includes(normalized));
  return knownCourse?.name || titleCaseFirst(text);
};

const inferCourseNameFromModules = (modules) => {
  const moduleText = modules
    .map((module) => String(module || "").trim())
    .find((module) => /curso\s+(?:virtual\s+)?(?:en\s+)?[^:]+:/i.test(module));
  const courseMatch = moduleText?.match(/curso\s+(?:virtual\s+)?(?:en\s+)?([^:]+):/i);
  return cleanCourseName(courseMatch?.[1]);
};

const inferCourseName = (fileName, modules = []) => {
  const moduleCourseName = inferCourseNameFromModules(modules);
  if (moduleCourseName) return moduleCourseName;

  const fileBaseName = cleanCourseName(fileName);
  const courseMatch = fileBaseName.match(/curso\s+(?:virtual\s+)?(?:en\s+)?(.+)$/i);
  return cleanCourseName(courseMatch?.[1] || fileBaseName);
};

const isEmailHeader = (value) => {
  const text = normalizeText(value);
  return text.includes("correo") || text.includes("email");
};

const isParticipantHeader = (value) => {
  const text = normalizeText(value);
  return (
    text.includes("participante") ||
    text.includes("estudiante") ||
    text.includes("alumno") ||
    text.includes("nombre")
  );
};

const isDateHeader = (value) => {
  const text = normalizeText(value);
  return text.includes("fecha") || text.includes("finalizacion") || text.includes("completado el");
};

function getCounts() {
  return statusOrder.reduce((result, status) => {
    result[status] = students.filter((student) => student.status === status).length;
    return result;
  }, {});
}

function getAverageProgress() {
  if (!students.length) return 0;
  return Math.round(students.reduce((sum, student) => sum + student.progress, 0) / students.length);
}

function getGroupInsight(counts, averageProgress, total) {
  if (!total) {
    return {
      title: "Sin datos.",
      message: "No hay participantes cargados para calcular el avance del grupo.",
      recommendation: "Carga una planilla con participantes para generar una lectura del progreso.",
    };
  }

  const completed = counts.Finalizado || 0;
  const inProgress = counts["En progreso"] || 0;
  const notStarted = counts["Sin iniciar"] || 0;
  const completedPercent = (completed / total) * 100;
  const notStartedPercent = (notStarted / total) * 100;
  const progressLabel = `${averageProgress}% de avance promedio`;

  if (completed === total || completedPercent >= 70) {
    return {
      title: "Cierre exitoso.",
      message: `${completed} de ${total} participantes finalizaron el curso, con ${progressLabel}.`,
      recommendation:
        completed === total
          ? "Prepara el reporte final y usa los aprendizajes para próximos grupos."
          : "Acompaña los casos pendientes para cerrar el proceso y consolidar el reporte final.",
    };
  }

  if (notStartedPercent >= 80) {
    return {
      title: "Sin activación.",
      message: `${notStarted} de ${total} participantes todavía no han iniciado el curso.`,
      recommendation: "Prioriza recordatorios directos, confirma accesos y revisa barreras para empezar.",
    };
  }

  if (notStartedPercent >= 40) {
    return {
      title: "Activación baja.",
      message: `${notStarted} participantes siguen sin iniciar, aunque ${completed + inProgress} ya registran avance.`,
      recommendation:
        "Enfoca el seguimiento en quienes están en 0% y refuerza la importancia de completar el primer módulo.",
    };
  }

  if (completedPercent < 40 || inProgress >= completed) {
    return {
      title: "En progreso.",
      message: `${inProgress} participantes están avanzando y ${completed} ya finalizaron, con ${progressLabel}.`,
      recommendation: "Acompaña a quienes están en progreso y define una fecha objetivo para completar el curso.",
    };
  }

  return {
    title: "Buen avance.",
    message: `${completed + inProgress} de ${total} participantes ya iniciaron o finalizaron el curso.`,
    recommendation: "Concentra el esfuerzo en los casos pendientes para cerrar brechas y subir la finalización.",
  };
}

function setFileStatus(message, type = "") {
  const status = document.querySelector("#file-status");
  status.textContent = message;
  status.className = `file-status ${type}`.trim();
}

function renderShell() {
  const clientName = dataset.clientName || "Cliente";
  const courseName = dataset.courseName || "Curso cargado";

  document.querySelector("#client-name").textContent = clientName;
  document.querySelector(".client-logo").textContent = clientName.charAt(0).toUpperCase();
  document.querySelector("#report-meta-text").textContent = dataset.updatedLabel || "Datos cargados";
  document.querySelector("#course-title").textContent = courseName;
  document.querySelector("#course-category").textContent = dataset.category || "Curso virtual";
  document.querySelector("#course-description").textContent =
    dataset.description || "Reporte navegable de avance por participante y contenido.";
  document.querySelector("#course-students-count").textContent = students.length;
}

function renderOverview() {
  const counts = getCounts();
  const averageProgress = getAverageProgress();
  const total = students.length;
  const safeTotal = total || 1;

  document.querySelector("#total-students").textContent = students.length;
  document.querySelector("#completed-students").textContent = counts.Finalizado || 0;
  document.querySelector("#progress-students").textContent = counts["En progreso"] || 0;
  document.querySelector("#not-started-students").textContent = counts["Sin iniciar"] || 0;
  document.querySelector("#completed-percent").textContent =
    `${Math.round(((counts.Finalizado || 0) / safeTotal) * 100)}%`;
  document.querySelector("#average-progress").textContent = `${averageProgress}%`;
  document.querySelector("#course-average").textContent = `${averageProgress}%`;
  document.querySelector("#course-progress-bar").style.width = `${averageProgress}%`;

  const insight = getGroupInsight(counts, averageProgress, total);
  document.querySelector("#insight-title").textContent = insight.title;
  document.querySelector("#insight-message").textContent = insight.message;
  document.querySelector("#insight-recommendation").textContent =
    `Recomendación: ${insight.recommendation}`;

  const finalPercent = ((counts.Finalizado || 0) / safeTotal) * 100;
  const progressPercent = ((counts["En progreso"] || 0) / safeTotal) * 100;
  const donut = document.querySelector("#status-donut");
  donut.style.background = `conic-gradient(
    ${statusColors.Finalizado} 0 ${finalPercent}%,
    ${statusColors["En progreso"]} ${finalPercent}% ${finalPercent + progressPercent}%,
    ${statusColors["Sin iniciar"]} ${finalPercent + progressPercent}% 100%
  )`;

  document.querySelector("#status-legend").innerHTML = statusOrder
    .map(
      (status) => `
        <div class="legend-item">
          <span class="legend-dot" style="background:${statusColors[status]}"></span>
          <span>${status}</span>
          <strong>${counts[status] || 0}</strong>
        </div>
      `,
    )
    .join("");

  document.querySelector("#content-chart").innerHTML = courseModules
    .map((module, index) => {
      const completed = students.filter(
        (student) => student.modules[index]?.status === "Finalizado",
      ).length;
      const percent = Math.round((completed / safeTotal) * 100);
      return `
        <div class="bar-row">
          <span class="bar-label" title="${escapeHtml(module)}">${escapeHtml(module)}</span>
          <div class="bar-track"><span class="bar-fill" style="width:${percent}%"></span></div>
          <span class="bar-value">${percent}%</span>
        </div>
      `;
    })
    .join("");

  const notStarted = students
    .filter((student) => student.status === "Sin iniciar")
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
  const inProgress = students
    .filter((student) => student.status === "En progreso")
    .sort((a, b) => a.progress - b.progress || a.name.localeCompare(b.name, "es"));
  const attentionGroups = notStarted.length
    ? [{ title: "No iniciaron aún", students: notStarted }]
    : [{ title: "No han terminado", students: inProgress }];

  const renderAttentionItem = (student) => `
    <div class="attention-item">
      <span class="avatar">${initials(student.name)}</span>
      <span class="attention-info">
        <strong>${escapeHtml(student.name)}</strong>
        <small>${student.status} · ${student.progress}% de avance</small>
      </span>
      <button class="row-action" data-student-id="${student.id}" aria-label="Ver detalle">→</button>
    </div>
  `;

  document.querySelector("#attention-list").innerHTML = attentionGroups.some((group) => group.students.length)
    ? attentionGroups
        .filter((group) => group.students.length)
        .map(
          (group) => `
            <div class="attention-group">
              <h3 class="attention-group-title">${group.title}</h3>
              ${group.students.map(renderAttentionItem).join("")}
            </div>
          `,
        )
        .join("")
    : `<div class="empty-state">No hay participantes pendientes de seguimiento.</div>`;
}

function renderPeople() {
  const query = normalizeText(document.querySelector("#people-search").value);
  const visibleStudents = students.filter((student) => {
    const matchesStatus = activeStatus === "all" || student.status === activeStatus;
    const matchesQuery = normalizeText(`${student.name} ${student.email}`).includes(query);
    return matchesStatus && matchesQuery;
  });
  const progressClass = (student) =>
    student.status === "Sin iniciar" ? "low" : student.status === "En progreso" ? "mid" : "";

  document.querySelector("#people-table").innerHTML = visibleStudents
    .map(
      (student) => `
        <tr>
          <td>
            <div class="person-cell">
              <span class="avatar">${initials(student.name)}</span>
              <span class="person-info">
                <strong>${escapeHtml(student.name)}</strong>
                <small>${escapeHtml(student.email)}</small>
              </span>
            </div>
          </td>
          <td><span class="status-pill ${normalizeClass(student.status)}">${student.status}</span></td>
          <td>
            <div class="progress-cell">
              <div class="mini-progress">
                <span class="${progressClass(student)}" style="width:${student.progress}%"></span>
              </div>
              <span>${student.progress}%</span>
            </div>
          </td>
          <td>${escapeHtml(student.lastActivity)}</td>
          <td><button class="row-action" data-student-id="${student.id}">Ver detalle</button></td>
        </tr>
      `,
    )
    .join("");

  if (!visibleStudents.length) {
    document.querySelector("#people-table").innerHTML = `
      <tr>
        <td colspan="5" class="empty-row">No hay participantes para los filtros actuales.</td>
      </tr>
    `;
  }

  document.querySelector("#people-count").textContent =
    `${visibleStudents.length} de ${students.length} participantes`;
}

function renderAll() {
  courseModules = dataset.modules;
  students = dataset.students;
  activeStatus = "all";
  document.querySelector("#people-search").value = "";
  document.querySelectorAll(".filter").forEach((button) => {
    button.classList.toggle("active", button.dataset.status === "all");
  });
  renderShell();
  renderOverview();
  renderPeople();
  closeDrawer();
}

function openDrawer(studentId) {
  const student = students.find((item) => item.id === Number(studentId));
  if (!student) return;

  document.querySelector("#drawer-content").innerHTML = `
    <div class="drawer-profile">
      <span class="avatar">${initials(student.name)}</span>
      <div>
        <h2>${escapeHtml(student.name)}</h2>
        <p>${escapeHtml(student.email)}</p>
      </div>
    </div>
    <div class="drawer-summary">
      <div class="drawer-stat">
        <span>Progreso</span>
        <strong>${student.progress}%</strong>
      </div>
      <div class="drawer-stat">
        <span>Estado</span>
        <strong>${student.status}</strong>
      </div>
    </div>
    <h3 class="drawer-section-title">${escapeHtml(dataset.courseName || "Curso")}</h3>
    <div class="module-list">
      ${student.modules
        .map((module) => {
          const stateClass =
            module.status === "Finalizado"
              ? "done"
              : module.status === "En progreso"
                ? "current"
                : "pending";
          return `
            <div class="module-item">
              <span>${escapeHtml(module.name)}</span>
              <span class="module-result">
                <span class="module-status ${stateClass}">${module.status}</span>
                ${
                  module.status === "Finalizado" && module.completedAt
                    ? `<small>${escapeHtml(module.completedAt)}</small>`
                    : ""
                }
              </span>
            </div>
          `;
        })
        .join("")}
    </div>
  `;

  document.querySelector("#drawer-overlay").classList.add("open");
  document.querySelector("#detail-drawer").classList.add("open");
  document.querySelector("#detail-drawer").setAttribute("aria-hidden", "false");
}

function closeDrawer() {
  document.querySelector("#drawer-overlay").classList.remove("open");
  document.querySelector("#detail-drawer").classList.remove("open");
  document.querySelector("#detail-drawer").setAttribute("aria-hidden", "true");
}

function switchView(viewName) {
  document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("active"));
  document.querySelector(`#${viewName}-view`).classList.add("active");
  document.querySelector(`.nav-item[data-view="${viewName}"]`).classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function inflateRaw(bytes) {
  if (!("DecompressionStream" in window)) {
    throw new Error("Este navegador no permite descomprimir archivos Excel localmente.");
  }

  try {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  } catch {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
}

async function readZipEntries(arrayBuffer) {
  const data = new Uint8Array(arrayBuffer);
  const view = new DataView(arrayBuffer);
  const decoder = new TextDecoder();
  const entries = new Map();
  let offset = 0;

  while (offset < data.length - 4) {
    const signature = view.getUint32(offset, true);
    if (signature !== 0x04034b50) break;

    const flags = view.getUint16(offset + 6, true);
    const method = view.getUint16(offset + 8, true);
    let compressedSize = view.getUint32(offset + 18, true);
    const fileNameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const nameStart = offset + 30;
    const nameEnd = nameStart + fileNameLength;
    const fileName = decoder.decode(data.slice(nameStart, nameEnd));
    const contentStart = nameEnd + extraLength;

    if (flags & 0x08) {
      const descriptorSignature = new Uint8Array([0x50, 0x4b, 0x07, 0x08]);
      let descriptorStart = -1;
      for (let index = contentStart; index < data.length - 16; index += 1) {
        if (
          data[index] === descriptorSignature[0] &&
          data[index + 1] === descriptorSignature[1] &&
          data[index + 2] === descriptorSignature[2] &&
          data[index + 3] === descriptorSignature[3]
        ) {
          descriptorStart = index;
          break;
        }
      }
      if (descriptorStart === -1) throw new Error("No se pudo leer la estructura ZIP del archivo.");
      compressedSize = descriptorStart - contentStart;
      offset = descriptorStart + 16;
    } else {
      offset = contentStart + compressedSize;
    }

    const compressed = data.slice(contentStart, contentStart + compressedSize);
    if (method === 0) entries.set(fileName, compressed);
    if (method === 8) entries.set(fileName, await inflateRaw(compressed));
  }

  return entries;
}

function textEntry(entries, path) {
  const entry = entries.get(path);
  return entry ? new TextDecoder().decode(entry) : "";
}

function getSharedStrings(xml) {
  if (!xml) return [];
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  return [...doc.querySelectorAll("si")].map((item) =>
    [...item.querySelectorAll("t")].map((textNode) => textNode.textContent || "").join(""),
  );
}

function getWorksheetRows(xml, sharedStrings) {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  return [...doc.querySelectorAll("sheetData row")].map((row) => {
    const values = [];
    row.querySelectorAll("c").forEach((cell) => {
      const ref = cell.getAttribute("r") || "";
      const column = ref.match(/[A-Z]+/)?.[0];
      const index = column ? columnToNumber(column) - 1 : values.length;
      const valueNode = cell.querySelector("v");
      let value = valueNode?.textContent || "";
      if (cell.getAttribute("t") === "s") value = sharedStrings[Number(value)] || "";
      if (cell.getAttribute("t") === "inlineStr") {
        value = [...cell.querySelectorAll("t")].map((item) => item.textContent || "").join("");
      }
      values[index] = value;
    });
    return values;
  });
}

function getWorkbookSheetPath(entries) {
  const workbook = textEntry(entries, "xl/workbook.xml");
  const relationships = textEntry(entries, "xl/_rels/workbook.xml.rels");
  const workbookDoc = new DOMParser().parseFromString(workbook, "application/xml");
  const relsDoc = new DOMParser().parseFromString(relationships, "application/xml");
  const firstSheet = workbookDoc.querySelector("sheet");
  const relationshipId = firstSheet?.getAttribute("r:id");
  const relationship = [...relsDoc.querySelectorAll("Relationship")].find(
    (item) => item.getAttribute("Id") === relationshipId,
  );
  const target = relationship?.getAttribute("Target") || "worksheets/sheet1.xml";
  return target.startsWith("/") ? target.slice(1) : `xl/${target}`;
}

function cellStatus(statusValue, dateValue) {
  const status = normalizeText(statusValue);
  const date = normalizeText(dateValue);

  if (status.includes("no finalizado") || status.includes("no completado")) {
    return date.includes("progreso") ? "En progreso" : "No finalizado";
  }

  if (status.includes("progreso") || date.includes("progreso")) return "En progreso";
  if (status.includes("finalizado") || status.includes("completado")) return "Finalizado";
  return "No finalizado";
}

function formatCompletionDateTime(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";

  const number = Number(text);
  if (Number.isFinite(number) && number > 0 && number < 100000) {
    return formatExcelDateTime(number);
  }

  const timestamp = formatTimestampDateTime(text);
  return timestamp || text;
}

function inferClientName(rows, emailColumn) {
  const email = rows
    .slice(1)
    .map((row) => String(row[emailColumn] || ""))
    .find((value) => value.includes("@"));
  const domain = email?.split("@")[1]?.split(".")[0];
  return domain ? domain.toUpperCase() : "Cliente cargado";
}

function buildDatasetFromRows(rows, fileName) {
  const headerIndex = rows.findIndex((row) => row.some((cell) => isEmailHeader(cell)));
  if (headerIndex === -1) {
    throw new Error("No encontré una columna de correo. Revisa que el archivo mantenga el formato esperado.");
  }

  const header = rows[headerIndex];
  const emailColumn = header.findIndex((cell) => isEmailHeader(cell));
  const explicitNameColumn = header.findIndex((cell, index) => index !== emailColumn && isParticipantHeader(cell));
  const nameColumn = explicitNameColumn >= 0 ? explicitNameColumn : Math.max(0, emailColumn - 1);
  const moduleColumns = header
    .map((cell, index) => ({ name: cleanImportedLabel(cell), index }))
    .filter(
      ({ name, index }) =>
        name &&
        index !== emailColumn &&
        index !== nameColumn &&
        !isParticipantHeader(name) &&
        !isEmailHeader(name) &&
        !isDateHeader(name),
    );

  if (!moduleColumns.length) {
    throw new Error("No encontré columnas de módulos o hitos para graficar.");
  }

  const modules = moduleColumns.map((module) => module.name);
  const parsedStudents = rows
    .slice(headerIndex + 1)
    .map((row, index) => {
      const email = String(row[emailColumn] || "").trim();
      const name = cleanImportedLabel(row[nameColumn] || email || `Participante ${index + 1}`);
      if (!email && !name) return null;

      const moduleStates = moduleColumns.map((module) => ({
        name: module.name,
        status: cellStatus(row[module.index], row[module.index + 1]),
        date: row[module.index + 1],
      }));
      const completed = moduleStates.filter((module) => module.status === "Finalizado").length;
      const hasProgress = moduleStates.some((module) => module.status === "En progreso");
      const progress = Math.round((completed / modules.length) * 100);
      let status = "En progreso";
      if (completed === modules.length) status = "Finalizado";
      if (completed === 0 && !hasProgress) status = "Sin iniciar";

      let lastActivityDate = "Sin actividad";
      if (moduleStates.some((m) => m.date)) {
        const lastDateValue = moduleStates.find((m) => m.status === "Finalizado")?.date ||
          moduleStates.find((m) => m.status === "En progreso")?.date ||
          moduleStates.filter((m) => m.date).pop()?.date;
        if (lastDateValue) {
          const numValue = Number(lastDateValue);
          if (Number.isFinite(numValue) && numValue > 100000) {
            lastActivityDate = formatTimestampDate(lastDateValue) || "Sin actividad";
          } else if (Number.isFinite(numValue) && numValue > 0) {
            lastActivityDate = formatExcelDate(numValue);
          } else if (typeof lastDateValue === "string" && lastDateValue.includes("-")) {
            lastActivityDate = formatTimestampDate(lastDateValue) || "Sin actividad";
          }
        }
      }

      return {
        id: index + 1,
        name,
        email,
        completed,
        progress,
        status,
        modules: moduleStates.map(({ name: moduleName, status: moduleStatus, date }) => ({
          name: moduleName,
          status: moduleStatus,
          completedAt: moduleStatus === "Finalizado" ? formatCompletionDateTime(date) : "",
        })),
        lastActivity: lastActivityDate,
      };
    })
    .filter(Boolean);

  if (!parsedStudents.length) {
    throw new Error("No encontré participantes en la planilla.");
  }

  return {
    clientName: inferClientName(rows.slice(headerIndex + 1), emailColumn),
    courseName: inferCourseName(fileName, modules),
    category: "Curso virtual",
    sourceName: fileName,
    updatedLabel: `Archivo cargado: ${fileName}`,
    modules,
    students: parsedStudents,
  };
}

async function parseWorkbook(file) {
  const entries = await readZipEntries(await file.arrayBuffer());
  const sharedStrings = getSharedStrings(textEntry(entries, "xl/sharedStrings.xml"));
  const worksheetPath = getWorkbookSheetPath(entries);
  const rows = getWorksheetRows(textEntry(entries, worksheetPath), sharedStrings);
  return buildDatasetFromRows(rows, file.name);
}

async function parseCSV(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: false,
      skipEmptyLines: false,
      complete: (results) => {
        if (!results.data || !results.data.length) {
          reject(new Error("El archivo CSV está vacío."));
          return;
        }
        resolve(results.data);
      },
      error: (error) => {
        reject(new Error(`Error al leer el CSV: ${error.message}`));
      },
    });
  });
}

function formatTimestampDate(timestamp) {
  if (!timestamp || typeof timestamp !== "string") return "";
  try {
    const date = new Date(timestamp);
    if (!Number.isFinite(date.getTime())) return "";
    return new Intl.DateTimeFormat("es", { day: "numeric", month: "short" }).format(date);
  } catch {
    return "";
  }
}

function formatTimestampDateTime(timestamp) {
  if (!timestamp || typeof timestamp !== "string") return "";
  try {
    const date = new Date(timestamp);
    if (!Number.isFinite(date.getTime())) return "";
    return new Intl.DateTimeFormat("es", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return "";
  }
}

async function handleFileUpload(file) {
  if (!file) return;

  const fileName = file.name.toLowerCase();
  const isCSV = fileName.endsWith(".csv");
  const isXLSX = fileName.endsWith(".xlsx");

  if (!isCSV && !isXLSX) {
    setFileStatus("Subí un archivo .csv o .xlsx para poder procesarlo.", "error");
    return;
  }

  try {
    setFileStatus(`Leyendo ${file.name}...`);

    let rows;
    if (isCSV) {
      rows = await parseCSV(file);
    } else {
      const entries = await readZipEntries(await file.arrayBuffer());
      const sharedStrings = getSharedStrings(textEntry(entries, "xl/sharedStrings.xml"));
      const worksheetPath = getWorkbookSheetPath(entries);
      rows = getWorksheetRows(textEntry(entries, worksheetPath), sharedStrings);
    }

    dataset = buildDatasetFromRows(rows, file.name);
    renderAll();
    setFileStatus(
      `Archivo cargado: ${dataset.students.length} participantes y ${dataset.modules.length} hitos.`,
      "success",
    );
  } catch (error) {
    console.error(error);
    setFileStatus(error.message || "No pude leer el archivo cargado.", "error");
  }
}

document.addEventListener("click", (event) => {
  const navItem = event.target.closest(".nav-item");
  const detailButton = event.target.closest("[data-student-id]");
  const filterButton = event.target.closest(".filter");
  const peopleLink = event.target.closest("[data-go-to-people]");

  if (navItem) switchView(navItem.dataset.view);
  if (detailButton) openDrawer(detailButton.dataset.studentId);
  if (peopleLink) switchView("people");
  if (filterButton) {
    activeStatus = filterButton.dataset.status;
    document.querySelectorAll(".filter").forEach((button) => button.classList.remove("active"));
    filterButton.classList.add("active");
    renderPeople();
  }
});

document.querySelector("#people-search").addEventListener("input", renderPeople);
document.querySelector("#drawer-close").addEventListener("click", closeDrawer);
document.querySelector("#drawer-overlay").addEventListener("click", closeDrawer);
document.querySelector("#file-input").addEventListener("change", (event) => {
  handleFileUpload(event.target.files[0]);
});

const uploadBox = document.querySelector(".upload-box");
["dragenter", "dragover"].forEach((eventName) => {
  uploadBox.addEventListener(eventName, (event) => {
    event.preventDefault();
    uploadBox.classList.add("dragging");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  uploadBox.addEventListener(eventName, (event) => {
    event.preventDefault();
    uploadBox.classList.remove("dragging");
  });
});

uploadBox.addEventListener("drop", (event) => {
  handleFileUpload(event.dataTransfer.files[0]);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeDrawer();
});

renderAll();
