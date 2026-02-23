export function asPassaporte(valor) {
  return String(valor ?? "").trim();
}

export function hojeISODate() {
  return new Date().toISOString().slice(0, 10);
}

export function isoFromDateInput(dateStr) {
  if (!dateStr) return new Date().toISOString();

  const [y, m, d] = dateStr.split("-").map(Number);

  // meio-dia local evita cair no dia anterior por fuso/UTC
  const localNoon = new Date(y, m - 1, d, 12, 0, 0);
  return localNoon.toISOString();
}

export function formatarData(data) {
  return new Date(data).toLocaleDateString("pt-BR");
}

export function adicionarDias(dataBase, dias) {
  const base =
    dataBase instanceof Date ? new Date(dataBase.getTime()) : new Date(dataBase);
  const out = new Date(base.getTime());
  out.setDate(out.getDate() + Number(dias || 0));
  return out;
}

export function calcularValidade(criadoEm) {
  return adicionarDias(criadoEm, 30);
}

export function diasRestantes(validade) {
  const hoje = new Date();
  return Math.ceil((validade - hoje) / 86400000);
}

export function maxDeps(plano) {
  const p = String(plano || "").toLowerCase();
  if (p.includes("comb")) return 2;
  if (p.includes("fam")) return 4; // familia / família
  return 0;
}

export function statusPorValidade(dias) {
  if (dias < 0) return "encerrado";
  if (dias <= 7) return "pendente";
  return "ativo";
}

export function uiAlert(message, title = "Aviso") {
  const popup = document.getElementById("uiPopup");
  const titleEl = document.getElementById("uiPopupTitle");
  const msgEl = document.getElementById("uiPopupMsg");
  const okBtn = document.getElementById("uiPopupOk");
  const cancelBtn = document.getElementById("uiPopupCancel");
  const closeBtn = document.getElementById("uiPopupClose");
  const backdrop = popup?.querySelector(".ui-popup-backdrop");

  if (!popup || !msgEl || !okBtn) {
    alert(message);
    return Promise.resolve(true);
  }

  titleEl.textContent = title;
  msgEl.textContent = message;

  if (cancelBtn) cancelBtn.classList.add("hidden");

  popup.classList.remove("hidden");
  popup.setAttribute("aria-hidden", "false");

  return new Promise((resolve) => {
    const cleanup = () => {
      popup.classList.add("hidden");
      popup.setAttribute("aria-hidden", "true");

      okBtn.removeEventListener("click", onOk);
      closeBtn?.removeEventListener("click", onOk);
      backdrop?.removeEventListener("click", onOk);

      resolve(true);
    };

    const onOk = () => cleanup();

    okBtn.addEventListener("click", onOk);
    closeBtn?.addEventListener("click", onOk);
    backdrop?.addEventListener("click", onOk);
  });
}

export function uiConfirm(message, title = "Confirmação") {
  const popup = document.getElementById("uiPopup");
  const titleEl = document.getElementById("uiPopupTitle");
  const msgEl = document.getElementById("uiPopupMsg");
  const okBtn = document.getElementById("uiPopupOk");
  const cancelBtn = document.getElementById("uiPopupCancel");
  const closeBtn = document.getElementById("uiPopupClose");
  const backdrop = popup?.querySelector(".ui-popup-backdrop");

  if (!popup || !msgEl || !okBtn || !cancelBtn) {
    return Promise.resolve(confirm(message));
  }

  titleEl.textContent = title;
  msgEl.textContent = message;

  cancelBtn.classList.remove("hidden");

  popup.classList.remove("hidden");
  popup.setAttribute("aria-hidden", "false");

  return new Promise((resolve) => {
    const cleanup = (val) => {
      popup.classList.add("hidden");
      popup.setAttribute("aria-hidden", "true");

      okBtn.removeEventListener("click", onOk);
      cancelBtn.removeEventListener("click", onCancel);
      closeBtn?.removeEventListener("click", onCancel);
      backdrop?.removeEventListener("click", onCancel);

      resolve(val);
    };

    const onOk = () => cleanup(true);
    const onCancel = () => cleanup(false);

    okBtn.addEventListener("click", onOk);
    cancelBtn.addEventListener("click", onCancel);
    closeBtn?.addEventListener("click", onCancel);
    backdrop?.addEventListener("click", onCancel);
  });
}