import { supabase } from "./supabase.js";
import { asPassaporte, maxDeps, uiAlert, isoFromDateInput } from "./utils.js";

const cadastroModal = document.getElementById("cadastroModal");
const cadastroClose = document.getElementById("cadastroClose");

cadastroClose?.addEventListener("click", () => {
  if (cadastroModal) cadastroModal.style.display = "none";
});

cadastroModal?.addEventListener("click", (e) => {
  if (e.target === cadastroModal) cadastroModal.style.display = "none";
});

const cadastroForm = document.getElementById("cadastroForm");

const nomeEl = document.getElementById("nome");
const passEl = document.getElementById("passaporteCadastro");
const tipoPlanoEl = document.getElementById("tipoPlano");
const dataAtivacaoEl = document.getElementById("dataAtivacao");

const dependentesContainer = document.getElementById("dependentesContainer");
const addDependenteBtn = document.getElementById("addDependenteBtn");

// data padrão
if (dataAtivacaoEl) {
  dataAtivacaoEl.value = new Date().toISOString().split("T")[0];
}

function limparDependentes() {
  if (dependentesContainer) dependentesContainer.innerHTML = "";
}

function getDependentes() {
  if (!dependentesContainer) return [];
  return [...dependentesContainer.querySelectorAll(".cadastro-dep-row, .dep-row")]
    .map((r) => ({
      nome: (r.querySelector('[name="dep_nome"]')?.value || "").trim(),
      passaporte: (r.querySelector('[name="dep_pass"]')?.value || "").trim(),
    }))
    .filter((d) => d.nome && d.passaporte);
}

addDependenteBtn?.addEventListener("click", async () => {
  const plano = (tipoPlanoEl?.value || "").trim();
  if (!plano) {
    await uiAlert("Selecione o plano", "Atenção");
    return;
  }

  const limite = maxDeps(plano);
  if (limite <= 0) {
    await uiAlert("Este tipo de plano não permite dependentes.", "Atenção");
    return;
  }

  if (!dependentesContainer) return;

  const existePendente = [
    ...dependentesContainer.querySelectorAll(".cadastro-dep-row, .dep-row"),
  ].some((row) => {
    const nome = (row.querySelector('[name="dep_nome"]')?.value || "").trim();
    const pass = (row.querySelector('[name="dep_pass"]')?.value || "").trim();
    return !nome || !pass;
  });

  if (existePendente) {
    await uiAlert("Preencha ou remova o dependente em aberto antes de adicionar outro.", "Atenção");
    return;
  }

  const linhasAtuais = dependentesContainer.querySelectorAll(
    ".cadastro-dep-row, .dep-row",
  ).length;

  if (linhasAtuais >= limite) {
    await uiAlert("Limite de dependentes atingido para este plano.", "Atenção");
    return;
  }

  const row = document.createElement("div");
  row.className = "cadastro-dep-row";

  row.innerHTML = `
    <input name="dep_nome" placeholder="Nome dependente">
    <input name="dep_pass" placeholder="Passaporte">
    <button type="button" class="cadastro-btn cadastro-btn-ghost">Remover</button>
  `;

  row.querySelector("button").onclick = () => row.remove();
  dependentesContainer.appendChild(row);
});

cadastroForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (localStorage.getItem("cargo") !== "diretor") {
    await uiAlert("Apenas diretores podem cadastrar planos.", "Permissão");
    return;
  }

  const btn =
    e.submitter ||
    cadastroForm.querySelector('button[type="submit"]') ||
    cadastroForm.querySelector("button");

  if (btn) btn.disabled = true;

  try {
    const nome = (nomeEl?.value || "").trim();
    const passStr = asPassaporte(passEl?.value);
    const plano = (tipoPlanoEl?.value || "").trim();
    const ativacao = (dataAtivacaoEl?.value || "").trim();

    if (!nome || !passStr || !plano) {
      await uiAlert("Preencha nome, passaporte e plano.", "Atenção");
      return;
    }

    const dependentes = getDependentes();
    const limite = maxDeps(plano);

    if (dependentes.length > limite) {
      await uiAlert("Dependentes acima do limite do plano.", "Atenção");
      return;
    }

    const passDependentes = dependentes.map((d) => asPassaporte(d.passaporte));
    if (passDependentes.some((p) => p === passStr)) {
      await uiAlert("O passaporte do dependente não pode ser igual ao do titular.", "Atenção");
      return;
    }

    if (new Set(passDependentes).size !== passDependentes.length) {
      await uiAlert("Há passaportes de dependentes duplicados.", "Atenção");
      return;
    }

    const exists = await supabase
      .from("pacientes")
      .select("id")
      .eq("passaporte", passStr)
      .maybeSingle();

    if (exists.error) {
      console.error("Erro validando passaporte:", exists.error);
      await uiAlert("Erro ao validar passaporte no banco.", "Erro");
      return;
    }

    if (exists.data?.id) {
      await uiAlert(
        "Já existe um plano cadastrado para este passaporte.",
        "Atenção",
      );
      return;
    }

    // criado_em seguro (meio-dia local via utils)
    const criadoISO = ativacao ? isoFromDateInput(ativacao) : new Date().toISOString();

    const { data: paciente, error } = await supabase
      .from("pacientes")
      .insert({
        nome,
        passaporte: passStr,
        tipo_plano: plano,
        max_dependentes: limite,
        status: "ativo",
        criado_em: criadoISO,
      })
      .select()
      .single();

    if (error) {
      console.error("Erro insert paciente:", error);
      await uiAlert(error.message || "Erro ao criar paciente.", "Erro");
      return;
    }

    for (const d of dependentes) {
      const insDep = await supabase.from("dependentes").insert({
        paciente_id: paciente.id,
        nome: (d.nome || "").trim(),
        passaporte: asPassaporte(d.passaporte),
      });

      if (insDep.error) {
        console.error("Erro insert dependente:", insDep.error);
        await uiAlert(
          insDep.error.message || "Erro ao inserir dependente.",
          "Erro",
        );
        return;
      }
    }

    await uiAlert("Plano criado com sucesso.", "Sucesso");

    if (cadastroModal) cadastroModal.style.display = "none";

    if (nomeEl) nomeEl.value = "";
    if (passEl) passEl.value = "";
    if (tipoPlanoEl) tipoPlanoEl.value = "";
    limparDependentes();

    if (dataAtivacaoEl) {
      dataAtivacaoEl.value = new Date().toISOString().split("T")[0];
    }

    window.dispatchEvent(new CustomEvent("plano-criado", { detail: passStr }));
  } finally {
    if (btn) btn.disabled = false;
  }
});