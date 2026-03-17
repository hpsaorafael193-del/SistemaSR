import { supabase, getSessionLocked } from "./supabase.js";
import { asPassaporte, calcularValidade, diasRestantes, formatarData, statusPorValidade, uiAlert } from "./utils.js";

let pacienteAtual = null;
let buscaEmAndamento = false;
let buscaSeq = 0;

function withTimeout(promise, ms = 12000, label = "operação") {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Tempo limite excedido ao ${label}.`)), ms);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/* ---------- Helpers DOM ---------- */

function $(id) {
  return document.getElementById(id);
}

function show(el) {
  if (el) el.style.display = "flex";
}

function hide(el) {
  if (el) el.style.display = "none";
}

function setHTML(el, html) {
  if (el) el.innerHTML = html;
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function safeImageURL(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw) || /^blob:/i.test(raw) || /^data:image\//i.test(raw) || raw.startsWith("/")) {
    return raw.replaceAll('"', "%22");
  }
  return "";
}

function getPlanoStatus(paciente, dias) {
  const statusBanco = String(paciente?.status || "").trim().toLowerCase();
  if (statusBanco === "encerrado") return "encerrado";
  return statusPorValidade(dias);
}

/* ---------- Elementos ---------- */

const diretoriaBtn = $("diretoriaBtn");
const loginModal = $("loginModal");
const logoutBtn = $("logoutBtn");
const userIcon = $("userIcon");

const cadastroBtn = $("cadastroBtn");
const gerenciarBtn = $("gerenciarBtn");
const gerenciarModal = $("gerenciarModal");
const fecharGerenciarX = $("fecharGerenciarModal");
const cadastroModal = $("cadastroModal");
const fecharCadastroX = $("fecharModal") || $("cadastroClose");

const buscarBtn = $("buscarBtn");
const passaporteInput = $("passaporte");

const statusBadge = $("statusBadge");
const alertaPlano = $("alertaPlano");
const fecharResultadoSlot = $("fecharResultadoSlot");
const resultadoPaciente = $("resultadoPaciente");

/* ---------- Sessão / Permissões ---------- */

async function getSessionSafe() {
  return await getSessionLocked();
}

function getCargo() {
  return localStorage.getItem("cargo");
}

function normalizarCargo(valor) {
  const cargo = String(valor || "").trim().toLowerCase();
  return cargo || null;
}

async function ensureCargo(session) {
  if (!session?.user?.id) return null;

  const cargoAtual = normalizarCargo(window.currentDoctorProfile?.cargo || getCargo());
  if (cargoAtual) return cargoAtual;

  const { data, error } = await supabase
    .from("usuarios")
    .select("cargo,nome,crm")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (error) {
    console.warn("Não foi possível carregar cargo do usuário:", error);
    return null;
  }

  const cargo = normalizarCargo(data?.cargo) || "usuario";
  const username = session.user.email ? session.user.email.split("@")[0] : "usuario";
  const nome = (data?.nome || localStorage.getItem("display_name") || username).trim();

  localStorage.setItem("cargo", cargo);
  localStorage.setItem("username", username);
  localStorage.setItem("display_name", nome);

  window.currentDoctorProfile = {
    ...(window.currentDoctorProfile || {}),
    user_id: session.user.id,
    username,
    email: session.user.email,
    nome,
    cargo,
    crm: data?.crm ?? null,
  };

  return cargo;
}

function setUIByAuth({ logado, cargo, username, displayName }) {
  if (diretoriaBtn) {
    diretoriaBtn.style.display = "inline-flex";
    diretoriaBtn.textContent = logado ? (displayName || username) : "Entrar";
    diretoriaBtn.title = logado ? `Abrir perfil (${cargo})` : "Abrir login";
    diretoriaBtn.dataset.auth = logado ? "logged" : "guest";
  }

  if (logoutBtn) logoutBtn.style.display = logado ? "inline-flex" : "none";

  if (userIcon) {
    userIcon.style.display = "none";
    userIcon.title = logado ? `${displayName || username} · ${cargo}` : "";
    userIcon.textContent = logado ? `${displayName || username} · ${cargo}` : "";
  }

  if (cadastroBtn) {
    cadastroBtn.style.display = logado && cargo === "diretor" ? "inline-flex" : "none";
  }

  if (gerenciarBtn) {
    gerenciarBtn.style.display = logado && cargo === "diretor" ? "inline-flex" : "none";
  }
}

async function refreshAuthUI() {
  const session = await getSessionSafe();
  const cargo = await ensureCargo(session);

  const logado = !!session;
  const username = session?.user?.email ? session.user.email.split("@")[0] : "";
  const displayName = window.currentDoctorProfile?.nome || localStorage.getItem("display_name") || username;

  setUIByAuth({ logado, cargo: cargo || "usuario", username, displayName });

  return { logado, cargo, username, displayName, session };
}

/* ---------- Resultado ---------- */

function limparResultado() {
  setHTML(resultadoPaciente, "");
  setHTML(statusBadge, "");
  setHTML(alertaPlano, "");
  setHTML(fecharResultadoSlot, "");
  pacienteAtual = null;
}

function renderFecharResultado() {
  if (!fecharResultadoSlot) return;

  fecharResultadoSlot.innerHTML = `
    <button id="fecharResultadoBtn" class="btn-outline" type="button">
      ✕ Fechar resultado
    </button>
  `;

  const btn = $("fecharResultadoBtn");
  if (!btn) return;

  btn.addEventListener("click", () => {
    limparResultado();
    if (passaporteInput) {
      passaporteInput.value = "";
      passaporteInput.focus();
    }
  });
}

function renderStatus(status) {
  if (!statusBadge) return;
  const s = String(status || "").toLowerCase();
  statusBadge.innerHTML = `<span class="status ${escapeHTML(s)}">${escapeHTML(s || "-")}</span>`;
}

function renderAlertaValidade(status, dias, validadeDate) {
  if (!alertaPlano) return;
  alertaPlano.innerHTML = "";

  if (status === "encerrado") {
    alertaPlano.innerHTML = `
      <div class="alerta-vencido">
        ⛔ Plano encerrado — atendimento apenas particular.
      </div>
    `;
    return;
  }

  if (dias < 0) {
    alertaPlano.innerHTML = `
      <div class="alerta-vencido">
        ⛔ Plano vencido em ${formatarData(validadeDate)} — atendimento apenas particular.
      </div>
    `;
    return;
  }

  if (dias === 0) {
    alertaPlano.innerHTML = `
      <div class="alerta-pendente">
        ⚠ Vence hoje (${formatarData(validadeDate)}) — renovação necessária.
      </div>
    `;
    return;
  }

  if (dias <= 7) {
    alertaPlano.innerHTML = `
      <div class="alerta-pendente">
        ⚠ Plano vence em ${dias} dia(s) — validade até ${formatarData(validadeDate)}.
      </div>
    `;
  }
}

function renderResultado(paciente, dependenteBuscado) {
  pacienteAtual = paciente;

  const validade = calcularValidade(paciente.criado_em);
  const dias = diasRestantes(validade);
  const statusPlano = getPlanoStatus(paciente, dias);

  renderStatus(statusPlano);
  renderAlertaValidade(statusPlano, dias, validade);
  renderFecharResultado();

  const badgeVenceHoje =
    dias === 0 ? `<span class="status pendente" style="margin-left:.6rem;">vence hoje</span>` : "";

  const nomePaciente = escapeHTML(paciente.nome);
  const passaportePaciente = escapeHTML(paciente.passaporte);
  const tipoPlanoPaciente = escapeHTML(paciente.tipo_plano);
  const imagemURL = safeImageURL(paciente.imagem_url);
  const imagemHTML = imagemURL
    ? `<div style="margin-top:.9rem;">
         <img src="${imagemURL}" alt="Passaporte" style="width:100%; max-width:320px; border-radius:12px; border:1px solid rgba(0,0,0,.08);">
       </div>`
    : "";

  resultadoPaciente.innerHTML = `
    <div class="card">
      <h3 style="margin-top:0;">${nomePaciente}</h3>

      <p><strong>Passaporte:</strong> ${passaportePaciente}</p>
      <p><strong>Plano:</strong> ${tipoPlanoPaciente}${badgeVenceHoje}</p>
      <p><strong>Ativação:</strong> ${formatarData(new Date(paciente.criado_em))}</p>
      <p><strong>Validade:</strong> ${formatarData(validade)}</p>
      <p><strong>Dias restantes:</strong> ${dias}</p>

      ${imagemHTML}
    </div>

    <div class="card">
      <h4 style="margin-top:0;">Dependentes</h4>
      ${
        paciente.dependentes && paciente.dependentes.length
          ? `<ul style="margin:0; padding-left:1.1rem;">
              ${paciente.dependentes
                .map((d) => {
                  const destaque =
                    dependenteBuscado && asPassaporte(d.passaporte || "") === asPassaporte(dependenteBuscado || "")
                      ? "dep-destaque"
                      : "";
                  return `<li class="${destaque}">${escapeHTML(d.nome)} (${escapeHTML(d.passaporte)})</li>`;
                })
                .join("")}
            </ul>`
          : "<p>Nenhum dependente</p>"
      }
    </div>
  `;
}

/* ---------- Busca ---------- */

async function buscarPorPassaporte(passStr) {
  const buscaAtual = ++buscaSeq;
  const passaporte = asPassaporte(passStr);
  let dependenteBuscado = null;

  limparResultado();
  setHTML(resultadoPaciente, `<div class="loading"></div>`);

  try {
    const titularRes = await withTimeout(
      supabase
        .from("pacientes")
        .select(`
          id,nome,passaporte,tipo_plano,status,imagem_url,criado_em,
          dependentes(nome,passaporte)
        `)
        .eq("passaporte", passaporte),
      12000,
      "buscar paciente"
    );

    if (titularRes.error) {
      console.error(titularRes.error);
      throw new Error("Erro ao buscar paciente.");
    }

    let paciente = null;

    if (titularRes.data && titularRes.data.length > 0) {
      paciente =
        titularRes.data.find((p) => String(p.status || "").trim().toLowerCase() === "ativo") ||
        titularRes.data[0];
    }

    if (!paciente) {
      const depRes = await withTimeout(
        supabase
          .from("dependentes")
          .select(`
            paciente_id,
            nome,
            passaporte,
            pacientes!inner (
              id,
              nome,
              passaporte,
              tipo_plano,
              status,
              imagem_url,
              criado_em
            )
          `)
          .eq("passaporte", passaporte),
        12000,
        "buscar dependente"
      );

      if (depRes.error) {
        console.error(depRes.error);
        throw new Error("Erro ao buscar dependente.");
      }

      if (!depRes.data || depRes.data.length === 0) {
        setHTML(resultadoPaciente, `<p>Paciente não encontrado</p>`);
        return;
      }

      const depEscolhido =
        depRes.data.find(
          (d) => String(d.pacientes?.status || "").trim().toLowerCase() === "ativo"
        ) || depRes.data[0];

      const pacienteId = depEscolhido.paciente_id;
      dependenteBuscado = passaporte;

      const pacRes = await withTimeout(
        supabase
          .from("pacientes")
          .select(`
            id,nome,passaporte,tipo_plano,status,imagem_url,criado_em,
            dependentes(nome,passaporte)
          `)
          .eq("id", pacienteId)
          .single(),
        12000,
        "buscar titular"
      );

      if (pacRes.error) {
        console.error(pacRes.error);
        throw new Error("Erro ao buscar titular.");
      }

      paciente = pacRes.data;
    }

    if (buscaAtual !== buscaSeq) return;
    renderResultado(paciente, dependenteBuscado);
  } catch (error) {
    console.error("Falha na busca de plano:", error);
    if (buscaAtual !== buscaSeq) return;
    setHTML(resultadoPaciente, `<p>${escapeHTML(error?.message || "Erro ao consultar plano.")}</p>`);
  }
}

/* ---------- Eventos / Botões ---------- */

async function exigirLoginOuAbrirModal() {
  const { logado } = await refreshAuthUI();
  if (!logado) {
    await uiAlert("Faça login para consultar planos.", "Atenção");
    show(loginModal);
    return false;
  }
  return true;
}

if (diretoriaBtn) {
  diretoriaBtn.addEventListener("click", async () => {
    const { logado } = await refreshAuthUI();
    if (!logado) {
      show(loginModal);
      return;
    }
    if (typeof window.coreActivateTab === "function") window.coreActivateTab("perfil");
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await supabase.auth.signOut();
    show(loginModal);
  });
}

if (cadastroBtn) {
  cadastroBtn.addEventListener("click", async () => {
    const ok = await exigirLoginOuAbrirModal();
    if (!ok) return;

    if (getCargo() !== "diretor") {
      await uiAlert("Apenas diretores podem cadastrar planos.", "Permissão");
      return;
    }
    show(cadastroModal);
  });
}

if (fecharCadastroX) {
  fecharCadastroX.addEventListener("click", () => hide(cadastroModal));
}

window.addEventListener("click", (e) => {
  if (e.target === loginModal) hide(loginModal);
  if (e.target === cadastroModal) hide(cadastroModal);
});

if (buscarBtn) {
  buscarBtn.addEventListener("click", async () => {
    if (buscaEmAndamento) return;

    const pass = passaporteInput?.value?.trim();
    if (!pass) return;

    buscaEmAndamento = true;
    buscarBtn.disabled = true;

    try {
      await buscarPorPassaporte(pass);
    } finally {
      buscaEmAndamento = false;
      buscarBtn.disabled = false;
    }
  });
}

if (passaporteInput) {
  passaporteInput.addEventListener("keydown", async (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      buscarBtn?.click();
    }
  });
}

window.addEventListener("usuario-logado", async () => {
  hide(loginModal);
  await refreshAuthUI();
});

window.addEventListener("usuario-deslogado", async () => {
  limparResultado();
  await refreshAuthUI();
});

window.addEventListener("plano-atualizado", async (e) => {
  const pass = asPassaporte(e?.detail?.passaporte || "");
  if (!pass || !pacienteAtual) return;

  const atualPass = asPassaporte(pacienteAtual.passaporte || "");
  const atualDeps = Array.isArray(pacienteAtual.dependentes) ? pacienteAtual.dependentes : [];
  const dependeDoAtual = atualDeps.some((d) => asPassaporte(d.passaporte || "") === pass);

  if (pass === atualPass || dependeDoAtual) {
    await buscarPorPassaporte(pass);
  }
});

window.addEventListener("plano-criado", async (e) => {
  const pass = asPassaporte(e.detail || "");
  if (!pass) return;

  hide(cadastroModal);

  if (passaporteInput) passaporteInput.value = pass;
  if (buscarBtn) buscarBtn.click();
});

/* ---------- INIT ---------- */

await refreshAuthUI();

/* ---------- Gerenciar Modal (UI básica) ---------- */

if (gerenciarBtn && gerenciarModal) {
  gerenciarBtn.addEventListener("click", () => {
    const cargo = getCargo();
    if (cargo !== "diretor") return;
    gerenciarModal.style.display = "flex";
    window.dispatchEvent(new Event("abrir-gerenciar"));
  });
}

if (fecharGerenciarX && gerenciarModal) {
  fecharGerenciarX.addEventListener("click", () => {
    gerenciarModal.style.display = "none";
  });
}

if (gerenciarModal) {
  gerenciarModal.addEventListener("click", (e) => {
    if (e.target === gerenciarModal) gerenciarModal.style.display = "none";
  });
}

window.addEventListener("usuario-deslogado", () => {
  if (gerenciarModal) gerenciarModal.style.display = "none";
});