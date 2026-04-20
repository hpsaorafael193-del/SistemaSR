// SUPABASE CONFIG
const SUPABASE_URL = "https://kygvunkvbnpzplxdpvhq.supabase.co";
const SUPABASE_KEY = "sb_publishable_5nig_0z1i1TbZB38KgH-DQ_TTjVPCXB";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ESTADO DA APLICAÇÃO
let appointments = []; // vem do Supabase
let currentDate = new Date();
let selectedDoctor = null;
let currentAppointment = null;
const AGENDA_FORM_DRAFT_KEY = "hpsr_agenda_form_draft";

// ELEMENTOS DOM
const specialtySelect = document.getElementById("specialty");
const birthTypeSelect = document.getElementById("birth-type");
const birthDateInput = document.getElementById("birth-date");
const birthTimeInput = document.getElementById("birth-time");
const btnSchedule = document.getElementById("btn-schedule");
const doctorOptions = document.querySelectorAll(".doctor-option");
const calendarElement = document.getElementById("calendar");
const currentMonthElement = document.getElementById("current-month");
const btnPrevMonth = document.getElementById("btn-prev-month");
const btnNextMonth = document.getElementById("btn-next-month");
const confirmationModal = document.getElementById("confirmation-modal");
const btnCloseModal = document.getElementById("btn-close-modal");
const btnConfirmAppointment = document.getElementById(
  "btn-confirm-appointment",
);
const btnCancelAppointment = document.getElementById("btn-cancel-appointment");
const modalDetails = document.getElementById("modal-details");

// CONSTANTES / MAPAS
const DOCTORS = {
  anny: "Dra. Anny D'Amato",
  natalie: "Dra. Natalie Bianchi",
  luidhy: "Dr. Luidhy Luddhiev",
  luan: "Dr. Luan D'Amato",
  lia: "Dra. Lia Vespucci",
  alex: "Dr. Alex Gregory"
};

const SPECIALTIES = {
  clinica: "Clínica Geral",
  pediatria: "Pediatria",
  obstetricia: "Obstetricia",
  ginecologia: "Ginecologia",
  psicologia: "Psicologia",
  psiquiatria: "Psiquiatria",
  cardiologia: "Cardiologia",
  oftalmologia: "Oftalmologia",
  nutricionista: "Nutricionista",
  dermatologia: "Dermatologia"
};

function normalizeDoctor(raw) {
  if (!raw) return null;
  const v = String(raw).trim().toLowerCase();

  if (DOCTORS[v]) return v;

  if (v.includes("anny")) return "anny";
  if (v.includes("natalie")) return "natalie";
  if (v.includes("luidhy")) return "luidhy";
  if (v.includes("luan")) return "luan";
  if (v.includes("lia")) return "lia";
  if (v.includes("alex")) return "alex";

  return v.replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

const DOCTOR_NAME = (doctor) => {
  const key = normalizeDoctor(doctor);
  return DOCTORS[key] || String(doctor);
};

// Tipo de consulta
const CONSULT_TYPE_NAMES = {
  consulta: "Consulta",
  retorno: "Retorno",
  procedimento: "Procedimento",
  parto: "Parto", // compatibilidade com registros antigos
};

// REGRAS DE INTERVALO (GLOBAL, independente do médico)
function isProcedureType(type) {
  const t = String(type || "").toLowerCase();
  return t === "procedimento" || t === "parto";
}

function getRequiredIntervalMs(newType, existingType) {
  const newIsProc = isProcedureType(newType);
  const oldIsProc = isProcedureType(existingType);

  if (newIsProc && oldIsProc) return 4 * 60 * 60 * 1000;
  return 1 * 60 * 60 * 1000;
}

// Seleciona visualmente o médico e atualiza o estado
function applySelectedDoctor(doctorKey) {
  const key = normalizeDoctor(doctorKey);
  if (!key) return false;

  let matched = false;
  doctorOptions.forEach((opt) => {
    const optKey = normalizeDoctor(opt.getAttribute("data-doctor"));
    if (optKey === key) {
      doctorOptions.forEach((o) => o.classList.remove("selected"));
      opt.classList.add("selected");
      selectedDoctor = key;
      matched = true;
    }
  });

  if (matched) {
    validateForm();
    persistFormDraft();
  }
  return matched;
}

// Auto seleciona o médico com base no usuário logado
async function autoSelectDoctorFromLoggedUser() {
  try {
    const { data, error } = await supabaseClient.auth.getSession();

    if (error) {
      console.warn("Não foi possível obter sessão:", error);
      return;
    }

    const user = data?.session?.user || null;
    if (!user) return;

    const { data: profile, error: profileErr } = await supabaseClient
      .from("usuarios")
      .select("nome")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileErr) {
      console.warn("Erro ao buscar perfil em usuarios:", profileErr);
    }

    const rawName =
      profile?.nome ||
      user.user_metadata?.nome ||
      user.user_metadata?.name ||
      user.email ||
      "";

    const key = normalizeDoctor(rawName);
    if (key && DOCTORS[key]) {
      applySelectedDoctor(key);
    }
  } catch (e) {
    console.warn("Falha ao auto-selecionar médico:", e);
  }
}

function formatDateForInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDate(dateString) {
  if (!dateString) return null;
  const [year, month, day] = String(dateString).split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

// CONFIGURAÇÕES INICIAIS
const today = new Date();
const formattedToday = formatDateForInput(today);
birthDateInput.min = formattedToday;
birthDateInput.value = formattedToday;
birthTimeInput.value = "08:00";

// Seleção de médico
doctorOptions.forEach((option) => {
  option.addEventListener("click", () => {
    applySelectedDoctor(option.getAttribute("data-doctor"));
    persistFormDraft();
  });
});

// Agendamento
btnSchedule.addEventListener("click", scheduleAppointment);

// Navegação calendário
btnPrevMonth.addEventListener("click", () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
});

btnNextMonth.addEventListener("click", () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
});

// Modal
btnCloseModal.addEventListener("click", () => {
  confirmationModal.style.display = "none";
});

btnCancelAppointment.addEventListener("click", () => {
  confirmationModal.style.display = "none";
});

// Validar formulário em tempo real
[birthTypeSelect, birthDateInput, birthTimeInput, specialtySelect].forEach((input) => {
  const eventName = input.tagName === "SELECT" ? "change" : "input";
  input.addEventListener(eventName, () => {
    validateForm();
    persistFormDraft();
  });
});

// Fechar modal ao clicar fora
window.addEventListener("click", (e) => {
  if (e.target === confirmationModal) {
    confirmationModal.style.display = "none";
  }
});

// INIT
restoreFormDraft();
renderCalendar();
validateForm();
loadAppointments();
autoSelectDoctorFromLoggedUser();

// FUNÇÕES

function getFormDraft() {
  return {
    birth_type: birthTypeSelect.value,
    doctor: normalizeDoctor(selectedDoctor),
    date: birthDateInput.value,
    time: birthTimeInput.value,
    specialty: specialtySelect.value,
  };
}

function persistFormDraft() {
  try {
    const draft = getFormDraft();
    const hasValue = Object.values(draft).some((value) => String(value || "").trim() !== "");

    if (!hasValue) {
      localStorage.removeItem(AGENDA_FORM_DRAFT_KEY);
      return;
    }

    localStorage.setItem(AGENDA_FORM_DRAFT_KEY, JSON.stringify(draft));
  } catch (error) {
    console.warn("Não foi possível salvar o rascunho do agendamento:", error);
  }
}

function restoreFormDraft() {
  try {
    const rawDraft = localStorage.getItem(AGENDA_FORM_DRAFT_KEY);
    if (!rawDraft) return;

    const draft = JSON.parse(rawDraft);
    if (!draft || typeof draft !== "object") return;

    birthTypeSelect.value = draft.birth_type || "consulta";
    birthDateInput.value = draft.date || formattedToday;
    birthTimeInput.value = draft.time || "08:00";
    specialtySelect.value = draft.specialty || "clinica";

    if (draft.doctor) {
      applySelectedDoctor(draft.doctor);
    }
  } catch (error) {
    console.warn("Não foi possível restaurar o rascunho do agendamento:", error);
    localStorage.removeItem(AGENDA_FORM_DRAFT_KEY);
  }
}

function clearFormDraft() {
  try {
    localStorage.removeItem(AGENDA_FORM_DRAFT_KEY);
  } catch (error) {
    console.warn("Não foi possível limpar o rascunho do agendamento:", error);
  }
}

function validateForm() {
  const isFormValid =
    birthDateInput.value !== "" &&
    birthTimeInput.value !== "" &&
    selectedDoctor !== null;

  btnSchedule.disabled = !isFormValid;
  return isFormValid;
}

/**
 * LOAD APPOINTMENTS - Carrega todos os dados antigos do Supabase
 * Mantém compatibilidade com registros que possuem patient_name, patient_phone, notes
 */
async function loadAppointments() {
  const { data, error } = await supabaseClient
    .from("appointments")
    .select("*") // Carrega todos os campos existentes (incluindo dados antigos)
    .order("date", { ascending: true })
    .order("time", { ascending: true });

  if (error) {
    console.error("Erro ao carregar appointments:", error);
    showAlert(
      `Erro ao carregar agendamentos: ${error.message || "desconhecido"}`,
      "error",
    );
    return;
  }

  appointments = (data || [])
    .filter((app) => app && app.id && app.date && app.time && app.doctor)
    .map((app) => {
      const doctorKey = normalizeDoctor(app.doctor);
      const dt = new Date(`${app.date}T${app.time}`);
      return {
        ...app, // Mantém todos os dados originais (patient_name, patient_phone, notes, etc)
        doctor: doctorKey,
        datetime_ms: Number.isNaN(dt.getTime()) ? null : dt.getTime(),
      };
    });

  console.log(`Carregados ${appointments.length} agendamentos do Supabase`);
  renderCalendar();
}

// CONFLITOS
function checkForConflicts(appointmentDate, appointmentId, newType) {
  return appointments.filter((app) => {
    if (!app) return false;
    if (appointmentId && app.id === appointmentId) return false;

    let existingMs = app.datetime_ms;
    if (!existingMs && app.date && app.time) {
      const d = new Date(`${app.date}T${app.time}`);
      existingMs = Number.isNaN(d.getTime()) ? null : d.getTime();
    }
    if (!existingMs) return false;

    const requiredMs = getRequiredIntervalMs(newType, app.birth_type);
    const diff = Math.abs(appointmentDate.getTime() - existingMs);
    return diff < requiredMs;
  });
}

// CRIAR AGENDAMENTO (novos registros sem paciente/telefone/observações)
function scheduleAppointment() {
  if (!validateForm()) {
    showAlert("Preencha todos os campos obrigatórios!", "error");
    return;
  }

  const appointmentDate = new Date(
    `${birthDateInput.value}T${birthTimeInput.value}`,
  );

  if (appointmentDate < new Date()) {
    showAlert("Não é possível agendar para datas/horários passados!", "error");
    return;
  }

  const newType = birthTypeSelect.value;
  const conflicts = checkForConflicts(appointmentDate, null, newType);

  if (conflicts.length > 0) {
    showAlert(
      "Conflito de horário: intervalo mínimo — Consultas/Retornos: 1h | Procedimentos: 4h.",
      "error",
    );
    return;
  }

  // Novos agendamentos NÃO incluem patient_name, patient_phone, notes
  currentAppointment = {
    birth_type: birthTypeSelect.value,
    doctor: normalizeDoctor(selectedDoctor),
    date: birthDateInput.value,
    time: birthTimeInput.value,
    specialty: specialtySelect.value,
    datetime: `${birthDateInput.value}T${birthTimeInput.value}:00`,
    status: "agendado",
    // Campos opcionais que podem existir no banco - deixar como null para novos registros
    patient_name: null,
    patient_phone: null,
    notes: null
  };

  persistFormDraft();
  showConfirmationModal(currentAppointment);
}

function showConfirmationModal(appointment) {
  modalDetails.innerHTML = `
        <div class="detail-row">
            <div class="detail-label">Médico:</div>
            <div class="detail-value">${DOCTOR_NAME(appointment.doctor)}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Especialidade:</div>
            <div class="detail-value">${SPECIALTIES[appointment.specialty] || appointment.specialty}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Data:</div>
            <div class="detail-value">${formatDate(appointment.date)}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Horário:</div>
            <div class="detail-value">${appointment.time}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Tipo:</div>
            <div class="detail-value">${
              CONSULT_TYPE_NAMES[appointment.birth_type] ||
              appointment.birth_type
            }</div>
        </div>
    `;

  const modalTitle = document.querySelector(".modal-title");
  if (modalTitle) {
    modalTitle.innerHTML =
      '<i class="fas fa-calendar-check"></i> Confirmar Agendamento';
  }

  btnConfirmAppointment.textContent = "Confirmar";
  btnConfirmAppointment.onclick = confirmAppointment;

  confirmationModal.style.display = "flex";
}

async function confirmAppointment() {
  if (!currentAppointment) {
    confirmationModal.style.display = "none";
    return;
  }

  const { error } = await supabaseClient
    .from("appointments")
    .insert([currentAppointment]);

  if (error) {
    console.error("Erro ao inserir appointment:", error);
    showAlert(`Erro ao salvar agendamento: ${error.message}`, "error");
    return;
  }

  confirmationModal.style.display = "none";
  showAlert("Consulta agendada com sucesso!", "success");
  currentAppointment = null;
  clearFormDraft();
  validateForm();
  await loadAppointments();
}

// CONCLUIR AGENDAMENTO
async function concludeAppointment(appointmentId) {
  if (!appointmentId) return;

  const local = appointments.find((a) => a && a.id === appointmentId);
  if (local && local.status === "concluido") {
    confirmationModal.style.display = "none";
    return;
  }

  const { error } = await supabaseClient
    .from("appointments")
    .update({ status: "concluido" })
    .eq("id", appointmentId);

  if (error) {
    console.error("Erro ao concluir:", error);
    showAlert("Erro ao concluir agendamento (Supabase).", "error");
    return;
  }

  confirmationModal.style.display = "none";
  showAlert("Agendamento marcado como concluído!", "success");
  await loadAppointments();
}

// CANCELAR (DELETE)
async function deleteAppointment(appointmentId) {
  if (!appointmentId) return;

  const appointment = appointments.find((a) => a && a.id === appointmentId);
  if (!appointment) return;

  showActionConfirmModal({
    title: "Confirmar cancelamento",
    confirmText: "Sim, cancelar",
    cancelText: "Voltar",
    html: `
      <div class="appointment-details">
        <div class="detail-row">
          <div class="detail-label">Médico:</div>
          <div class="detail-value">${DOCTOR_NAME(appointment.doctor)}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Especialidade:</div>
          <div class="detail-value">${SPECIALTIES[appointment.specialty] || appointment.specialty}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Data:</div>
          <div class="detail-value">${formatDate(appointment.date)}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Horário:</div>
          <div class="detail-value">${appointment.time}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Tipo:</div>
          <div class="detail-value">${CONSULT_TYPE_NAMES[appointment.birth_type] || appointment.birth_type}</div>
        </div>
      </div>
      <div style="margin-top:12px; font-weight:600; color:#491100;">
        Tem certeza que deseja cancelar este agendamento?
      </div>
    `,
    onConfirm: async () => {
      const { error } = await supabaseClient
        .from("appointments")
        .delete()
        .eq("id", appointmentId);

      if (error) {
        console.error("Erro ao deletar:", error);
        showAlert("Erro ao cancelar agendamento (Supabase).", "error");
        return;
      }

      confirmationModal.style.display = "none";
      showAlert("Agendamento cancelado com sucesso!", "success");
      await loadAppointments();
    },
  });
}

// RENDER CALENDÁRIO
function renderCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];
  currentMonthElement.textContent = `${monthNames[month]} ${year}`;

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

  let firstDayIndex = firstDay.getDay();
  firstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

  calendarElement.innerHTML = "";

  const dayNames = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const calendarHeader = document.createElement("div");
  calendarHeader.className = "calendar-header";

  dayNames.forEach((day) => {
    const headerCell = document.createElement("div");
    headerCell.className = "calendar-header-cell";
    headerCell.textContent = day;
    calendarHeader.appendChild(headerCell);
  });

  calendarElement.appendChild(calendarHeader);

  const calendarBody = document.createElement("div");
  calendarBody.className = "calendar-body";

  for (let i = 0; i < firstDayIndex; i++) {
    const emptyDay = document.createElement("div");
    emptyDay.className = "calendar-day day-disabled";
    calendarBody.appendChild(emptyDay);
  }

  const todayLocal = new Date();
  const isCurrentMonth =
    todayLocal.getMonth() === month && todayLocal.getFullYear() === year;

  for (let day = 1; day <= daysInMonth; day++) {
    const dayElement = document.createElement("div");
    dayElement.className = "calendar-day";

    if (isCurrentMonth && day === todayLocal.getDate()) {
      dayElement.classList.add("day-today");
    }

    const dayNumber = document.createElement("div");
    dayNumber.className = "day-number";
    dayNumber.textContent = day;
    dayElement.appendChild(dayNumber);

    const dayAppointments = document.createElement("div");
    dayAppointments.className = "day-appointments";

    const currentDateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    const dayAppts = appointments.filter(
      (app) => app && app.date === currentDateStr,
    );

    dayAppts.sort((a, b) => (a.time || "").localeCompare(b.time || ""));

    dayAppts.forEach((app) => {
      const appointmentElement = document.createElement("div");

      const statusClass = app.status === "concluido" ? "appointment-done" : "";
      const doctorKey = normalizeDoctor(app.doctor);
      appointmentElement.className =
        `appointment appointment-${doctorKey} ${statusClass}`.trim();
      appointmentElement.setAttribute("data-appointment-id", app.id);

      appointmentElement.innerHTML = `
                <div class="appointment-time">${app.time}</div>
                <div class="appointment-patient">${DOCTOR_NAME(app.doctor)}</div>
            `;

      appointmentElement.addEventListener("click", (e) => {
        e.stopPropagation();
        showAppointmentDetails(app.id);
      });

      dayAppointments.appendChild(appointmentElement);
    });

    dayElement.appendChild(dayAppointments);
    calendarBody.appendChild(dayElement);
  }

  calendarElement.appendChild(calendarBody);
}

// DETALHES DO AGENDAMENTO (modal) - Mostra também dados antigos se existirem
function showAppointmentDetails(appointmentId) {
  const appointment = appointments.find(
    (app) => app && app.id === appointmentId,
  );
  if (!appointment) return;

  // Verifica se o registro antigo tem dados de paciente
  const hasPatientData = appointment.patient_name || appointment.patient_phone || appointment.notes;
  
  let patientDetailsHtml = "";
  if (hasPatientData) {
    patientDetailsHtml = `
      ${appointment.patient_name ? `
      <div class="detail-row">
          <div class="detail-label">Paciente:</div>
          <div class="detail-value">${appointment.patient_name}</div>
      </div>
      ` : ""}
      ${appointment.patient_phone ? `
      <div class="detail-row">
          <div class="detail-label">Telefone:</div>
          <div class="detail-value">${appointment.patient_phone}</div>
      </div>
      ` : ""}
      ${appointment.notes ? `
      <div class="detail-row">
          <div class="detail-label">Observações:</div>
          <div class="detail-value">${appointment.notes}</div>
      </div>
      ` : ""}
    `;
  }

  const details = `
        <div class="appointment-details">
            ${patientDetailsHtml}
            <div class="detail-row">
                <div class="detail-label">Médico:</div>
                <div class="detail-value">${DOCTOR_NAME(appointment.doctor)}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Especialidade:</div>
                <div class="detail-value">${SPECIALTIES[appointment.specialty] || appointment.specialty || "Não especificada"}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Data:</div>
                <div class="detail-value">${formatDate(appointment.date)}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Horário:</div>
                <div class="detail-value">${appointment.time}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Tipo:</div>
                <div class="detail-value">${CONSULT_TYPE_NAMES[appointment.birth_type] || appointment.birth_type}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Status:</div>
                <div class="detail-value">${
                  appointment.status === "agendado" ? "Agendado" : "Concluído"
                }</div>
            </div>
        </div>
        <div class="modal-buttons">
            <button class="btn-cancel" onclick="deleteAppointment('${appointment.id}')">
                <i class="fas fa-trash"></i> Cancelar Agendamento
            </button>
        </div>
    `;

  modalDetails.innerHTML = details;

  const modalTitle = document.querySelector(".modal-title");
  if (modalTitle) {
    modalTitle.innerHTML =
      '<i class="fas fa-calendar-alt"></i> Detalhes do Agendamento';
  }

  btnConfirmAppointment.textContent =
    appointment.status === "concluido" ? "OK" : "Concluir";
  btnConfirmAppointment.onclick = () => {
    if (appointment.status === "concluido") {
      confirmationModal.style.display = "none";
      return;
    }
    concludeAppointment(appointment.id);
  };

  confirmationModal.style.display = "flex";
}

// LIMPAR FORM
function clearForm() {
  birthTypeSelect.value = "consulta";
  doctorOptions.forEach((opt) => opt.classList.remove("selected"));
  selectedDoctor = null;
  specialtySelect.value = "clinica";

  birthDateInput.value = formattedToday;
  birthTimeInput.value = "08:00";

  clearFormDraft();
  validateForm();
}

/**
 * POPUP (TOAST) NA TELA
 */
function showAlert(message, type) {
  const TOAST_LIFETIME = 4500;

  let toastRoot = document.getElementById("toast-root");
  if (!toastRoot) {
    toastRoot = document.createElement("div");
    toastRoot.id = "toast-root";
    document.body.appendChild(toastRoot);
  }

  const titles = { success: "Sucesso", error: "Atenção", warning: "Aviso" };
  const icons = {
    success: `<svg viewBox="0 0 24 24" width="18" height="18"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"></path></svg>`,
    error: `<svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"></path></svg>`,
    warning: `<svg viewBox="0 0 24 24" width="18" height="18"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"></path></svg>`,
  };

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.dataset.type = type || "warning";

  toast.innerHTML = `
    <div class="icon">${icons[type] || icons.warning}</div>
    <div class="content">
      <div class="title">${titles[type] || titles.warning}</div>
      <div class="msg">${String(message || "")}</div>
    </div>
    <button class="close" type="button" aria-label="Fechar">×</button>
  `;

  const removeToast = () => {
    if (!toast.isConnected) return;
    toast.classList.add("out");
    toast.addEventListener("animationend", () => toast.remove(), {
      once: true,
    });
  };

  toast.querySelector(".close").addEventListener("click", removeToast);
  toastRoot.prepend(toast);
  window.setTimeout(removeToast, TOAST_LIFETIME);
}

// DATA
function formatDate(dateString) {
  const date = parseLocalDate(dateString);
  if (!date) return "Data inválida";

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function showActionConfirmModal({
  title = "Confirmar ação",
  html = "",
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  onConfirm = () => {},
}) {
  modalDetails.innerHTML = html;

  const modalTitle = document.querySelector(".modal-title");
  if (modalTitle) {
    modalTitle.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${title}`;
  }

  btnConfirmAppointment.textContent = confirmText;
  btnCancelAppointment.textContent = cancelText;

  btnConfirmAppointment.onclick = async () => {
    try {
      btnConfirmAppointment.disabled = true;
      await onConfirm();
    } finally {
      btnConfirmAppointment.disabled = false;
    }
  };

  btnCancelAppointment.onclick = () => {
    confirmationModal.style.display = "none";
  };

  confirmationModal.style.display = "flex";
}

function mapNameToDoctorKey(nome) {
  return normalizeDoctor(nome);
}

function selectDoctorByKey(doctorKey) {
  return applySelectedDoctor(doctorKey);
}

window.addEventListener("message", (event) => {
  if (event.origin !== window.location.origin) return;
  if (!event.data || event.data.type !== "HPSR_AUTH_USER") return;

  const doctorKey = mapNameToDoctorKey(event.data.nome || event.data.username || "");
  if (doctorKey && DOCTORS[doctorKey]) {
    selectDoctorByKey(doctorKey);
  }
});