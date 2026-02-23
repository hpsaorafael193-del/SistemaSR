import { supabase } from "./supabase.js";
import {
  asPassaporte,
  adicionarDias,
  calcularValidade,
  isoFromDateInput,
  maxDeps,
} from "./utils.js";

function $(id) {
  return document.getElementById(id);
}

const modal = $("gerenciarModal");
const closeX = $("fecharGerenciarModal");
const selectPlano = $("gerenciarSelectPlano");
const painel = $("gerenciarPainel");

const novaDataEl = $("gerenciarNovaData");

// se você tem select do tipo:
const tipoPlanoEl = $("gerenciarTipoPlano");

const depsList = $("gerenciarDepsList");
const addDepBtn = $("gerenciarAddDepBtn");

const renovarBtn = $("gerenciarRenovarBtn");
const salvarBtn = $("gerenciarSalvarBtn");
const encerrarBtn = $("gerenciarEncerrarBtn");

const msgEl = $("gerenciarMsg");

let pacienteAtual = null;
let depsAtual = [];

// snapshot dos ids originais carregados (pra deletar corretamente)
let depsOrigIds = new Set();

function isDiretor() {
  return localStorage.getItem("cargo") === "diretor";
}

function setMsg(text, ok = true) {
  if (!msgEl) return;
  msgEl.textContent = text || "";
  msgEl.style.color = ok ? "" : "#ffb4b4";
}

function showPainel() {
  if (painel) painel.style.display = "block";
}
function hidePainel() {
  if (painel) painel.style.display = "none";
}

function closeModal() {
  if (modal) modal.style.display = "none";
  setMsg("");
  pacienteAtual = null;
  depsAtual = [];
  depsOrigIds = new Set();
  hidePainel();
  if (selectPlano) selectPlano.value = "";
}

if (closeX) {
  closeX.addEventListener("click", closeModal);
}

if (modal) {
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });
}

/**
 * ------------- TIPOS DE PLANO (anti-bug trigger) -------------
 * - "tipoPlanoSelecionadoRaw": o que o usuário escolheu
 * - "tipoPlanoParaLimite": normaliza pra maxDeps (sem acento)
 * - "tipoPlanoParaDB": grava no banco preservando o padrão existente do registro
 *
 * IMPORTANTE (seu schema):
 * - O banco valida limite via pacientes.max_dependentes (int4)
 * - Então ao mudar tipo_plano, PRECISA atualizar max_dependentes junto.
 */

function tipoPlanoSelecionadoRaw() {
  return String(
    tipoPlanoEl?.value || pacienteAtual?.tipo_plano || "individual",
  ).trim();
}

function tipoPlanoParaLimite() {
  const t = tipoPlanoSelecionadoRaw().toLowerCase();
  if (t.includes("fam")) return "familia";
  if (t.includes("comb")) return "combo";
  return "individual";
}

// grava no banco respeitando como o DB já armazena (com ou sem acento)
function tipoPlanoParaDB() {
  const raw = tipoPlanoSelecionadoRaw();
  const rawLower = raw.toLowerCase();

  const atual = String(pacienteAtual?.tipo_plano || "").trim();
  const atualLower = atual.toLowerCase();

  // se o banco já usa "família" com acento, mantenha
  const bancoUsaAcento = atualLower.includes("famíl");

  if (rawLower.includes("fam")) return bancoUsaAcento ? "família" : "familia";
  if (rawLower.includes("comb")) return atual || "combo";
  if (rawLower.includes("ind")) return atual || "individual";

  // fallback: tenta gravar o que veio
  return raw;
}

// ✅ fonte de verdade pro limite no banco (pacientes.max_dependentes)
function maxDependentesPorTipo(tipoPlanoDbOuRaw) {
  const t = String(tipoPlanoDbOuRaw || "").toLowerCase();
  if (t.includes("fam")) return 4; // familia / família
  if (t.includes("comb")) return 2; // combo
  return 0; // individual
}

async function carregarListaPlanos() {
  if (!selectPlano) return;

  selectPlano.innerHTML = '<option value="">Carregando...</option>';
  hidePainel();
  setMsg("");

  const { data, error } = await supabase
    .from("pacientes")
    .select("id,nome,passaporte,tipo_plano,status,criado_em")
    .order("criado_em", { ascending: false })
    .limit(250);

  if (error) {
    selectPlano.innerHTML = '<option value="">Erro ao carregar</option>';
    setMsg("Erro ao carregar planos: " + error.message, false);
    return;
  }

  const opts = ['<option value="">Selecione...</option>'].concat(
    (data || []).map((p) => {
      const pass = p.passaporte ?? "";
      const tipo = p.tipo_plano ?? "";
      const st = p.status ?? "";
      return `<option value="${p.id}" data-passaporte="${pass}">${p.nome} — ${pass} — ${tipo} — ${st}</option>`;
    }),
  );

  selectPlano.innerHTML = opts.join("");
}

function renderDeps() {
  if (!depsList) return;
  depsList.innerHTML = "";

  if (!depsAtual.length) {
    depsList.innerHTML = '<p style="opacity:.8">Sem dependentes.</p>';
    return;
  }

  depsAtual.forEach((d, idx) => {
    const row = document.createElement("div");
    row.style.display = "grid";
    row.style.gridTemplateColumns = "1fr 1fr auto";
    row.style.gap = ".5rem";
    row.style.marginBottom = ".5rem";

    row.innerHTML = `
      <input type="text" placeholder="Nome" value="${String(d.nome ?? "").replaceAll('"', "&quot;")}" data-idx="${idx}" data-field="nome">
      <input type="text" placeholder="Passaporte" value="${String(d.passaporte ?? "").replaceAll('"', "&quot;")}" data-idx="${idx}" data-field="passaporte">
      <button type="button" class="btn-outline" data-remove="${idx}">Remover</button>
    `;

    depsList.appendChild(row);
  });

  depsList.querySelectorAll("input").forEach((inp) => {
    inp.addEventListener("input", () => {
      const idx = Number(inp.dataset.idx);
      const field = inp.dataset.field;
      if (!Number.isFinite(idx) || !field) return;
      depsAtual[idx][field] = inp.value;
    });
  });

  depsList.querySelectorAll("button[data-remove]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.remove);
      if (!Number.isFinite(idx)) return;
      depsAtual.splice(idx, 1);
      renderDeps();
    });
  });
}

async function carregarPlano(pacienteId) {
  setMsg("");

  const { data: paciente, error: errP } = await supabase
    .from("pacientes")
    .select("*")
    .eq("id", pacienteId)
    .single();

  if (errP) {
    setMsg("Erro ao carregar plano: " + errP.message, false);
    hidePainel();
    return;
  }

  const { data: deps, error: errD } = await supabase
    .from("dependentes")
    .select("*")
    .eq("paciente_id", pacienteId)
    .order("id", { ascending: true });

  if (errD) {
    setMsg("Erro ao carregar dependentes: " + errD.message, false);
    hidePainel();
    return;
  }

  pacienteAtual = paciente;
  depsAtual = (deps || []).map((d) => ({
    id: d.id,
    nome: d.nome,
    passaporte: d.passaporte,
  }));

  depsOrigIds = new Set(depsAtual.map((d) => d.id).filter(Boolean));

  // preenche tipo no select respeitando o que veio do banco
  if (tipoPlanoEl) {
    const t = String(pacienteAtual?.tipo_plano || "individual");
    tipoPlanoEl.value = t;
    if (tipoPlanoEl.value !== t) {
      const lim = tipoPlanoParaLimite();
      tipoPlanoEl.value = lim;
    }
  }

  if (novaDataEl && pacienteAtual?.criado_em) {
    const dt = new Date(pacienteAtual.criado_em);
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const dd = String(dt.getDate()).padStart(2, "0");
    novaDataEl.value = `${yyyy}-${mm}-${dd}`;
  }

  renderDeps();
  showPainel();
}

function normalizarDependentesValidosComId() {
  return depsAtual
    .map((d) => ({
      id: d.id ?? null,
      nome: String(d.nome || "").trim(),
      passaporte: String(d.passaporte || "").trim(),
    }))
    .filter((d) => d.nome && d.passaporte);
}

function depsPayload() {
  if (!pacienteAtual) return [];

  // ✅ limite do FRONT baseado no tipo selecionado (normalizado)
  const limite = maxDeps(tipoPlanoParaLimite());
  const validos = normalizarDependentesValidosComId();

  if (limite >= 0 && validos.length > limite) {
    throw new Error("Limite de dependentes atingido");
  }

  // Envia passaporte como STRING para não quebrar BigInt/precisão
  return validos.map((d) => ({
    id: d.id,
    nome: d.nome,
    passaporte: d.passaporte,
    paciente_id: pacienteAtual.id,
  }));
}

// ✅ SYNC correto: DELETE → UPDATE → INSERT (evita trigger estourar)
async function syncDependentes(pacienteId, novosDeps) {
  const paraUpdate = novosDeps.filter((d) => d.id);
  const paraInsert = novosDeps.filter((d) => !d.id);

  const idsMantidos = new Set(paraUpdate.map((d) => d.id));
  const idsParaDeletar = [...depsOrigIds].filter((id) => !idsMantidos.has(id));

  // 1) DELETE
  if (idsParaDeletar.length) {
    const del = await supabase
      .from("dependentes")
      .delete()
      .in("id", idsParaDeletar)
      .eq("paciente_id", pacienteId);

    if (del.error) throw new Error(del.error.message);
  }

  // 2) UPDATE
  for (const d of paraUpdate) {
    const up = await supabase
      .from("dependentes")
      .update({ nome: d.nome, passaporte: d.passaporte })
      .eq("id", d.id)
      .eq("paciente_id", pacienteId);

    if (up.error) throw new Error(up.error.message);
  }

  // 3) INSERT
  if (paraInsert.length) {
    const ins = await supabase.from("dependentes").insert(
      paraInsert.map((d) => ({
        paciente_id: pacienteId,
        nome: d.nome,
        passaporte: d.passaporte,
      })),
    );

    if (ins.error) {
      console.error("Detalhe Supabase insert dependentes:", ins.error);
      throw new Error(ins.error.message || "Falha ao inserir dependentes (400)");
    }
  }
}

async function renovar30() {
  if (!isDiretor()) return setMsg("Apenas diretores podem gerenciar.", false);
  if (!pacienteAtual) return;

  const hoje = new Date();
  const validadeAtual = calcularValidade(pacienteAtual.criado_em);
  const base = validadeAtual > hoje ? validadeAtual : hoje;
  const novoCriado = adicionarDias(base, -30);

  const { error } = await supabase
    .from("pacientes")
    .update({ criado_em: novoCriado.toISOString(), status: "ativo" })
    .eq("id", pacienteAtual.id);

  if (error) return setMsg("Erro ao renovar: " + error.message, false);

  setMsg("Plano renovado por mais 30 dias.");
  await carregarPlano(pacienteAtual.id);

  window.dispatchEvent(
    new CustomEvent("plano-atualizado", {
      detail: { passaporte: pacienteAtual.passaporte },
    }),
  );
}

async function salvarAlteracoes() {
  if (!isDiretor()) return setMsg("Apenas diretores podem gerenciar.", false);
  if (!pacienteAtual) return;

  try {
    setMsg("Salvando...");

    let criadoISO = pacienteAtual.criado_em;
    if (novaDataEl?.value) {
      criadoISO = isoFromDateInput(novaDataEl.value);
    }

    // valida dependentes antes
    const deps = depsPayload();

    // ✅ tipo e max_dependentes precisam andar juntos (seu trigger usa max_dependentes)
    const tipoDb = tipoPlanoParaDB();
    const novoMax = maxDependentesPorTipo(tipoDb);

    const payload = {
      criado_em: criadoISO,
      tipo_plano: tipoDb,
      max_dependentes: novoMax,
    };

    const upPac = await supabase
      .from("pacientes")
      .update(payload)
      .eq("id", pacienteAtual.id);

    if (upPac.error) throw new Error(upPac.error.message);

    // 🔎 Confirma tipo + max_dependentes no banco (evita trigger usando valor antigo)
    const check = await supabase
      .from("pacientes")
      .select("tipo_plano,max_dependentes")
      .eq("id", pacienteAtual.id)
      .single();

    if (check.error) throw new Error(check.error.message);

    const dbTipo = String(check.data?.tipo_plano || "").toLowerCase();
    const selTipo = String(payload.tipo_plano || "").toLowerCase();
    const dbMax = Number(check.data?.max_dependentes ?? -1);

    if (dbTipo !== selTipo) {
      throw new Error(
        `Tipo de plano não foi atualizado no banco (DB: "${check.data?.tipo_plano}", selecionado: "${payload.tipo_plano}"). Verifique o padrão do tipo_plano/trigger.`,
      );
    }

    if (dbMax !== novoMax) {
      throw new Error(
        `Max dependentes não foi atualizado no banco (DB: "${dbMax}", esperado: "${novoMax}"). Verifique trigger/função no Supabase.`,
      );
    }

    await syncDependentes(pacienteAtual.id, deps);

    setMsg("Alterações salvas.");
    await carregarPlano(pacienteAtual.id);

    window.dispatchEvent(
      new CustomEvent("plano-atualizado", {
        detail: { passaporte: pacienteAtual.passaporte },
      }),
    );
  } catch (e) {
    setMsg("Erro ao salvar: " + (e?.message || "erro desconhecido"), false);
  }
}

async function encerrarPlano() {
  if (!isDiretor()) return setMsg("Apenas diretores podem gerenciar.", false);
  if (!pacienteAtual) return;

  const { error } = await supabase
    .from("pacientes")
    .update({ status: "encerrado" })
    .eq("id", pacienteAtual.id);

  if (error) return setMsg("Erro ao encerrar: " + error.message, false);

  setMsg("Plano encerrado.");
  await carregarPlano(pacienteAtual.id);

  window.dispatchEvent(
    new CustomEvent("plano-atualizado", {
      detail: { passaporte: pacienteAtual.passaporte },
    }),
  );
}

/* eventos */
window.addEventListener("abrir-gerenciar", () => {
  if (!isDiretor()) return;
  carregarListaPlanos();
});

if (selectPlano) {
  selectPlano.addEventListener("change", () => {
    const id = selectPlano.value;
    if (!id) {
      hidePainel();
      pacienteAtual = null;
      depsAtual = [];
      depsOrigIds = new Set();
      return;
    }
    carregarPlano(id);
  });
}

if (addDepBtn) {
  addDepBtn.addEventListener("click", () => {
    if (!pacienteAtual) return;

    // remove entradas 100% vazias pra não inflar
    depsAtual = depsAtual.filter(
      (d) => String(d.nome || "").trim() || String(d.passaporte || "").trim(),
    );

    const limite = maxDeps(tipoPlanoParaLimite());
    if (limite <= 0) {
      return setMsg("Este tipo de plano não permite dependentes.", false);
    }

    const pendente = depsAtual.some(
      (d) => !String(d.nome || "").trim() || !String(d.passaporte || "").trim(),
    );
    if (pendente) {
      return setMsg(
        "Preencha (ou remova) o dependente em aberto antes de adicionar outro.",
        false,
      );
    }

    const validos = normalizarDependentesValidosComId();
    if (validos.length >= limite) {
      return setMsg("Limite de dependentes atingido para este plano.", false);
    }

    depsAtual.push({ id: null, nome: "", passaporte: "" });
    renderDeps();
  });
}

renovarBtn?.addEventListener("click", renovar30);
salvarBtn?.addEventListener("click", salvarAlteracoes);
encerrarBtn?.addEventListener("click", encerrarPlano);

window.addEventListener("usuario-deslogado", closeModal);