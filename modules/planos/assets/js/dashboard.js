import { supabase } from "./supabase.js";
import { asPassaporte, calcularValidade, diasRestantes, formatarData, uiAlert } from "./utils.js";

let pacienteAtual = null;

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
const fecharCadastroX = $("fecharModal");

const buscarBtn = $("buscarBtn");
const passaporteInput = $("passaporte");

const statusBadge = $("statusBadge");
const alertaPlano = $("alertaPlano");
const fecharResultadoSlot = $("fecharResultadoSlot");
const resultadoPaciente = $("resultadoPaciente");

/* ---------- Sessão / Permissões ---------- */

async function getSessionSafe() {
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data?.session || null;
}

function getCargo() {
  return localStorage.getItem("cargo");
}

function setUIByAuth({ logado, cargo, username }) {
  // topo
  if (diretoriaBtn) diretoriaBtn.style.display = logado ? "none" : "inline-flex";
  if (logoutBtn) logoutBtn.style.display = logado ? "inline-flex" : "none";

  if (userIcon) {
    userIcon.style.display = logado ? "inline-flex" : "none";
    userIcon.title = logado ? `${username} · ${cargo}` : "";
  }

  // busca bloqueada se não logado
  if (passaporteInput) passaporteInput.disabled = !logado;
  if (buscarBtn) buscarBtn.disabled = !logado;

  // cadastro só diretoria
  if (cadastroBtn) {
    cadastroBtn.style.display = logado && cargo === "diretor" ? "inline-flex" : "none";
  }

  // gerenciar só diretoria
  if (gerenciarBtn) {
    gerenciarBtn.style.display = logado && cargo === "diretor" ? "inline-flex" : "none";
  }
}

async function refreshAuthUI() {
  const session = await getSessionSafe();
  const cargo = getCargo();

  const logado = !!(session && cargo);
  const username = session?.user?.email ? session.user.email.split("@")[0] : "";

  setUIByAuth({ logado, cargo, username });

  return { logado, cargo, username, session };
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
  statusBadge.innerHTML = `<span class="status ${s}">${s || "-"}</span>`;
}

function renderAlertaValidade(dias, validadeDate) {
  if (!alertaPlano) return;
  alertaPlano.innerHTML = "";

  // vencido
  if (dias < 0) {
    alertaPlano.innerHTML = `
      <div class="alerta-vencido">
        ⛔ Plano vencido em ${formatarData(validadeDate)} — atendimento apenas particular.
      </div>
    `;
    return;
  }

  // vence hoje
  if (dias === 0) {
    alertaPlano.innerHTML = `
      <div class="alerta-pendente">
        ⚠ Vence hoje (${formatarData(validadeDate)}) — renovação necessária.
      </div>
    `;
    return;
  }

  // perto do vencimento
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

  renderStatus(paciente.status);
  renderAlertaValidade(dias, validade);
  renderFecharResultado();

  const cargo = getCargo();
  const mostrarRenovar = cargo === "diretor";

  const badgeVenceHoje =
    dias === 0 ? `<span class="status pendente" style="margin-left:.6rem;">vence hoje</span>` : "";

  const imagemHTML = paciente.imagem_url
    ? `<div style="margin-top:.9rem;">
         <img src="${paciente.imagem_url}" alt="Passaporte" style="width:100%; max-width:320px; border-radius:12px; border:1px solid rgba(0,0,0,.08);">
       </div>`
    : "";

  // MUITO IMPORTANTE: NÃO criar <div id="resultadoPaciente"> dentro do #resultadoPaciente.
  // O container já é #resultadoPaciente e o CSS faz o grid.
  resultadoPaciente.innerHTML = `
    <div class="card">
      <h3 style="margin-top:0;">${paciente.nome}</h3>

      <p><strong>Passaporte:</strong> ${paciente.passaporte}</p>
      <p><strong>Plano:</strong> ${paciente.tipo_plano}${badgeVenceHoje}</p>
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
                    dependenteBuscado && String(d.passaporte) === String(dependenteBuscado)
                      ? "dep-destaque"
                      : "";
                  return `<li class="${destaque}">${d.nome} (${d.passaporte})</li>`;
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
  limparResultado();
  setHTML(resultadoPaciente, `<div class="loading"></div>`);

  const passaporte = asPassaporte(passStr);
  let dependenteBuscado = null;

  // 1) Titular
  const titularRes = await supabase
    .from("pacientes")
    .select(`
      id,nome,passaporte,tipo_plano,status,imagem_url,criado_em,
      dependentes(nome,passaporte)
    `)
    .eq("passaporte", passaporte);

  if (titularRes.error) {
    console.error(titularRes.error);
    setHTML(resultadoPaciente, `<p>Erro ao buscar paciente</p>`);
    return;
  }

  let paciente = titularRes.data?.[0] || null;

  // 2) Dependente
  if (!paciente) {
    const depRes = await supabase
      .from("dependentes")
      .select("paciente_id")
      .eq("passaporte", passaporte)
      .maybeSingle();

    if (depRes.error) {
      console.error(depRes.error);
      setHTML(resultadoPaciente, `<p>Erro ao buscar dependente</p>`);
      return;
    }

    if (!depRes.data) {
      setHTML(resultadoPaciente, `<p>Paciente não encontrado</p>`);
      return;
    }

    dependenteBuscado = passStr;

    const pacRes = await supabase
      .from("pacientes")
      .select(`
        id,nome,passaporte,tipo_plano,status,imagem_url,criado_em,
        dependentes(nome,passaporte)
      `)
      .eq("id", depRes.data.paciente_id)
      .single();

    if (pacRes.error) {
      console.error(pacRes.error);
      setHTML(resultadoPaciente, `<p>Erro ao buscar titular</p>`);
      return;
    }

    paciente = pacRes.data;
  }

  renderResultado(paciente, dependenteBuscado);
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

// Botão Log in
if (diretoriaBtn) {
  diretoriaBtn.addEventListener("click", () => show(loginModal));
}

// Logout
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    window.dispatchEvent(new Event("usuario-deslogado"));
    limparResultado();
    await refreshAuthUI();
    show(loginModal);
  });
}

// Abrir cadastro
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

// Fechar cadastro pelo X
if (fecharCadastroX) {
  fecharCadastroX.addEventListener("click", () => hide(cadastroModal));
}

// Clique fora fecha modais
window.addEventListener("click", (e) => {
  if (e.target === loginModal) hide(loginModal);
  if (e.target === cadastroModal) hide(cadastroModal);
});

// Buscar
if (buscarBtn) {
  buscarBtn.addEventListener("click", async () => {
    const ok = await exigirLoginOuAbrirModal();
    if (!ok) return;

    const pass = passaporteInput?.value?.trim();
    if (!pass) return;

    await buscarPorPassaporte(pass);
  });
}

// Enter no input faz buscar
if (passaporteInput) {
  passaporteInput.addEventListener("keydown", async (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      buscarBtn?.click();
    }
  });
}

// Quando o auth.js finalizar login
window.addEventListener("usuario-logado", async () => {
  hide(loginModal);
  await refreshAuthUI();
});

// Quando o cadastro.js criar um plano
window.addEventListener("plano-criado", async (e) => {
  // e.detail deve ser o passaporte do titular
  const pass = String(e.detail || "").trim();
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

