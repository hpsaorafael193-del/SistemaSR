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

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttr(value) {
  return escapeHTML(value);
}

const modal = $("gerenciarModal");
const closeX = $("fecharGerenciarModal");
const selectPlano = $("gerenciarSelectPlano");
const painel = $("gerenciarPainel");

const novaDataEl = $("gerenciarNovaData");
const tipoPlanoEl = $("gerenciarTipoPlano");

const depsList = $("gerenciarDepsList");
const addDepBtn = $("gerenciarAddDepBtn");

const renovarBtn = $("gerenciarRenovarBtn");
const salvarBtn = $("gerenciarSalvarBtn");
const encerrarBtn = $("gerenciarEncerrarBtn");

const msgEl = $("gerenciarMsg");

let pacienteAtual = null;
let depsAtual = [];
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

function normalizarStatus(status) {
  return String(status || "").trim().toLowerCase();
}

function prioridadeStatus(status) {
  const s = normalizarStatus(status);
  if (s === "ativo") return 0;
  if (s === "pendente") return 1;
  if (s === "encerrado") return 2;
  return 3;
}

function compararPlanos(a, b) {
  const pa = prioridadeStatus(a.status);
  const pb = prioridadeStatus(b.status);

  if (pa !== pb) return pa - pb;

  const nomeA = String(a.nome || "").trim().toLowerCase();
  const nomeB = String(b.nome || "").trim().toLowerCase();
  const nomeCmp = nomeA.localeCompare(nomeB, "pt-BR");
  if (nomeCmp !== 0) return nomeCmp;

  const dataA = new Date(a.criado_em || 0).getTime();
  const dataB = new Date(b.criado_em || 0).getTime();
  return dataB - dataA;
}

function resumirPlanoOption(p) {
  const status = normalizarStatus(p.status);
  const pass = asPassaporte(p.passaporte || "");
  const tipo = String(p.tipo_plano || "").trim();

  const badgeAtivo = status === "ativo" ? "" : "";
  return `${badgeAtivo}${p.nome} — ${pass} — ${tipo} — ${status || "-"}`;
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
 * ------------- TIPOS DE PLANO -------------
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

function tipoPlanoParaDB() {
  const raw = tipoPlanoSelecionadoRaw();
  const rawLower = raw.toLowerCase();

  const atual = String(pacienteAtual?.tipo_plano || "").trim();
  const atualLower = atual.toLowerCase();

  const bancoUsaAcento = atualLower.includes("famíl") || rawLower.includes("famíl");

  if (rawLower.includes("fam")) return bancoUsaAcento ? "família" : "familia";
  if (rawLower.includes("comb")) return "combo";
  if (rawLower.includes("ind")) return "individual";

  return raw;
}

function maxDependentesPorTipo(tipoPlanoDbOuRaw) {
  const t = String(tipoPlanoDbOuRaw || "").toLowerCase();
  if (t.includes("fam")) return 4;
  if (t.includes("comb")) return 2;
  return 0;
}

async function carregarListaPlanos() {
  if (!selectPlano) return;

  selectPlano.innerHTML = '<option value="">Carregando...</option>';
  hidePainel();
  setMsg("");

  const { data, error } = await supabase
    .from("pacientes")
    .select("id,nome,passaporte,tipo_plano,status,criado_em")
    .limit(500);

  if (error) {
    selectPlano.innerHTML = '<option value="">Erro ao carregar</option>';
    setMsg("Erro ao carregar planos: " + error.message, false);
    return;
  }

  const planos = [...(data || [])].sort(compararPlanos);

  const opts = ['<option value="">Selecione...</option>'].concat(
    planos.map((p) => {
      const pass = asPassaporte(p.passaporte || "");
      const label = resumirPlanoOption({
        ...p,
        passaporte: pass,
      });

      return `<option value="${escapeAttr(p.id)}" data-passaporte="${escapeAttr(pass)}" data-status="${escapeAttr(normalizarStatus(p.status))}">${escapeHTML(label)}</option>`;
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
      <input type="text" placeholder="Nome" value="${escapeAttr(d.nome ?? "")}" data-idx="${idx}" data-field="nome">
      <input type="text" placeholder="Passaporte" value="${escapeAttr(d.passaporte ?? "")}" data-idx="${idx}" data-field="passaporte">
      <button type="button" class="btn-outline" data-remove="${idx}">Remover</button>
    `;

    depsList.appendChild(row);
  });

  depsList.querySelectorAll("input").forEach((inp) => {
    inp.addEventListener("input", () => {
      const idx = Number(inp.dataset.idx);
      const field = inp.dataset.field;
      if (!Number.isFinite(idx) || !field) return;

      let value = inp.value;
      if (field === "passaporte") {
        value = asPassaporte(value);
        inp.value = value;
      }

      depsAtual[idx][field] = value;
    });

    inp.addEventListener("blur", () => {
      const idx = Number(inp.dataset.idx);
      const field = inp.dataset.field;
      if (!Number.isFinite(idx) || !field) return;

      if (field === "passaporte") {
        const value = asPassaporte(inp.value);
        inp.value = value;
        depsAtual[idx][field] = value;
      } else {
        depsAtual[idx][field] = String(inp.value || "").trim();
      }
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
    nome: String(d.nome || "").trim(),
    passaporte: asPassaporte(d.passaporte || ""),
  }));

  depsOrigIds = new Set(depsAtual.map((d) => d.id).filter(Boolean));

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
      passaporte: asPassaporte(d.passaporte || ""),
    }))
    .filter((d) => d.nome && d.passaporte);
}

function depsPayload() {
  if (!pacienteAtual) return [];

  const limite = maxDeps(tipoPlanoParaLimite());
  const validos = normalizarDependentesValidosComId();

  if (limite >= 0 && validos.length > limite) {
    throw new Error("Limite de dependentes atingido");
  }

  const titular = asPassaporte(pacienteAtual.passaporte || "");
  const vistos = new Set();

  for (const d of validos) {
    const pass = asPassaporte(d.passaporte || "");
    if (pass === titular) {
      throw new Error("O passaporte do dependente não pode ser igual ao do titular");
    }
    if (vistos.has(pass)) {
      throw new Error("Há passaportes de dependentes duplicados");
    }
    vistos.add(pass);
  }

  return validos.map((d) => ({
    id: d.id,
    nome: d.nome,
    passaporte: d.passaporte,
    paciente_id: pacienteAtual.id,
  }));
}

async function validarDependentesEmOutroPlanoAtivo(novosDeps) {
  if (!pacienteAtual) return;

  const passaportes = [...new Set(
    novosDeps
      .map((d) => asPassaporte(d.passaporte || ""))
      .filter(Boolean),
  )];

  if (!passaportes.length) return;

  const { data, error } = await supabase
    .from("dependentes")
    .select(`
      id,
      nome,
      passaporte,
      paciente_id,
      pacientes!inner (
        id,
        nome,
        status,
        passaporte
      )
    `)
    .in("passaporte", passaportes);

  if (error) {
    throw new Error("Erro ao validar dependentes: " + error.message);
  }

  const conflitos = (data || []).filter((item) => {
    const statusPlano = normalizarStatus(item.pacientes?.status);
    const mesmoPlanoAtual = item.paciente_id === pacienteAtual.id;
    return statusPlano === "ativo" && !mesmoPlanoAtual;
  });

  if (conflitos.length) {
    const lista = conflitos
      .map((c) => {
        const nomeDep = c.nome || "Dependente";
        const pass = asPassaporte(c.passaporte || "");
        const titular = c.pacientes?.nome || "Titular";
        return `${nomeDep} (${pass}) já pertence ao plano ativo de ${titular}`;
      })
      .join(" | ");

    throw new Error(lista);
  }
}

async function syncDependentes(pacienteId, novosDeps) {
  const paraUpdate = novosDeps.filter((d) => d.id);
  const paraInsert = novosDeps.filter((d) => !d.id);

  const idsMantidos = new Set(paraUpdate.map((d) => d.id));
  const idsParaDeletar = [...depsOrigIds].filter((id) => !idsMantidos.has(id));

  if (idsParaDeletar.length) {
    const del = await supabase
      .from("dependentes")
      .delete()
      .in("id", idsParaDeletar)
      .eq("paciente_id", pacienteId);

    if (del.error) throw new Error(del.error.message);
  }

  for (const d of paraUpdate) {
    const up = await supabase
      .from("dependentes")
      .update({ nome: d.nome, passaporte: d.passaporte })
      .eq("id", d.id)
      .eq("paciente_id", pacienteId);

    if (up.error) throw new Error(up.error.message);
  }

  if (paraInsert.length) {
    const ins = await supabase
      .from("dependentes")
      .insert(
        paraInsert.map((d) => ({
          paciente_id: pacienteId,
          nome: d.nome,
          passaporte: d.passaporte,
        })),
      );

    if (ins.error) {
      console.error("Detalhe Supabase insert dependentes:", ins.error);
      throw new Error(ins.error.message || "Falha ao inserir dependentes");
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
      detail: { passaporte: asPassaporte(pacienteAtual.passaporte || "") },
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

    const deps = depsPayload();
    await validarDependentesEmOutroPlanoAtivo(deps);

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
    await carregarListaPlanos();

    if (selectPlano) {
      selectPlano.value = String(pacienteAtual.id);
    }

    window.dispatchEvent(
      new CustomEvent("plano-atualizado", {
        detail: { passaporte: asPassaporte(pacienteAtual.passaporte || "") },
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
  await carregarListaPlanos();

  if (selectPlano) {
    selectPlano.value = String(pacienteAtual.id);
  }

  window.dispatchEvent(
    new CustomEvent("plano-atualizado", {
      detail: { passaporte: asPassaporte(pacienteAtual.passaporte || "") },
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