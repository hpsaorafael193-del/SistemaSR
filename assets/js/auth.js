import { supabase } from "./supabase.js";

window.currentDoctorProfile = null;

const loginModal = document.getElementById("loginModal");
const diretoriaBtn = document.getElementById("diretoriaBtn");
const loginForm = document.getElementById("loginForm");
const errorBox = document.getElementById("error");

const userIcon = document.getElementById("userIcon");
if (userIcon) userIcon.style.display = "none";

function hideError() {
  if (!errorBox) return;
  errorBox.innerText = "";
  errorBox.classList.add("hidden");
}

function showError(message) {
  if (!errorBox) return;
  errorBox.innerText = message || "";
  errorBox.classList.remove("hidden");
}

function formatarDataBr(valor) {
  if (!valor) return "—";
  const dt = new Date(valor);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("pt-BR");
}

function formatarDataHoraBr(valor) {
  if (!valor) return "—";
  const dt = new Date(valor);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleString("pt-BR");
}

function calcularTempoContrato(valor) {
  if (!valor) return "—";
  const inicio = new Date(valor);
  if (Number.isNaN(inicio.getTime())) return "—";

  const agora = new Date();
  let anos = agora.getFullYear() - inicio.getFullYear();
  let meses = agora.getMonth() - inicio.getMonth();

  if (agora.getDate() < inicio.getDate()) meses -= 1;
  if (meses < 0) {
    anos -= 1;
    meses += 12;
  }

  const partes = [];
  if (anos > 0) partes.push(`${anos} ano${anos > 1 ? "s" : ""}`);
  if (meses > 0) partes.push(`${meses} mês${meses > 1 ? "es" : ""}`);
  if (!partes.length) partes.push("menos de 1 mês");
  return partes.join(" e ");
}

function preencherPerfilUI(profile, authUser) {
  const username = authUser?.email?.split("@")[0] || "—";
  const email = authUser?.email || "—";

  const nome = (profile?.nome || username || "—").trim();
  const crm = profile?.crm ?? null;

  const mapa = {
    perfilNome: nome,
    perfilCrm: crm == null || crm === "" ? "—" : `CRM ${crm}`,
    perfilUsername: username,
    perfilEmail: email,
  };

  Object.entries(mapa).forEach(([id, valor]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = String(valor ?? "—");
  });
}


async function buscarPerfilNoBanco(userId) {
  const { data, error } = await supabase
    .from("usuarios")
        .select("nome,crm,cargo")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Erro ao buscar perfil em usuarios:", error);
    return null;
  }

  return data || null;
}

function atualizarBotaoLateral({ label, cargo }) {
  const sideBtn = document.getElementById("diretoriaBtn");
  if (sideBtn) {
    sideBtn.style.display = "inline-flex";
    sideBtn.textContent = label;
    sideBtn.title = cargo ? `Abrir perfil (${cargo})` : "Abrir perfil";
  }
}

function broadcastAuthToModuleIframes(profile) {
  const payload = profile
    ? {
        type: "HPSR_AUTH_USER",
        nome: profile.nome || "",
        username: profile.username || "",
        cargo: profile.cargo || "",
        crm: profile.crm ?? null,
        email: profile.email || "",
      }
    : { type: "HPSR_AUTH_USER_LOGOUT" };

  document.querySelectorAll(".core-module-frame").forEach((frame) => {
    try {
      frame.contentWindow?.postMessage(payload, window.location.origin);
    } catch (err) {
      console.warn("Não foi possível sincronizar auth com módulo interno:", err);
    }
  });
}

function bindAuthBroadcastOnFrameLoad(profile) {
  document.querySelectorAll(".core-module-frame").forEach((frame) => {
    if (frame.dataset.authBridgeBound === "1") return;
    frame.dataset.authBridgeBound = "1";
    frame.addEventListener("load", () => {
      broadcastAuthToModuleIframes(profile || window.currentDoctorProfile || null);
    });
  });
}

window.addEventListener("click", (e) => {
  if (e.target === loginModal) {
    hideError();
    loginModal.style.display = "none";
  }
});

const { data: sessionData } = await supabase.auth.getSession();
bindAuthBroadcastOnFrameLoad(window.currentDoctorProfile);
if (sessionData.session) {
  await carregarUsuario(sessionData.session.user);
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const usuario = document.getElementById("usuario").value.trim();
  const password = document.getElementById("password").value;

  if (!usuario || !password) {
    showError("Preencha usuário e senha");
    return;
  }

  const email = `${usuario}@srafael.local`;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error("Erro login:", error);
    showError("Login inválido");
    return;
  }

  hideError();

  await carregarUsuario(data.user);
  loginModal.style.display = "none";
  window.dispatchEvent(new Event("usuario-logado"));
});

const loginClose = document.getElementById("loginClose");
loginClose?.addEventListener("click", () => {
  hideError();
  loginModal.style.display = "none";
});

supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") {
    if (session?.user) {
      await carregarUsuario(session.user);
      window.dispatchEvent(new Event("usuario-logado"));
    }
    return;
  }

  if (event === "SIGNED_OUT") {
    ["cargo", "username", "display_name"].forEach((k) => localStorage.removeItem(k));
    window.currentDoctorProfile = null;
    broadcastAuthToModuleIframes(null);
    window.dispatchEvent(new Event("usuario-deslogado"));
  }
});

hideError();

function normalizarCargo(valor) {
  const cargo = String(valor || "usuario").trim().toLowerCase();
  return cargo || "usuario";
}

async function carregarUsuario(user) {
  const username = user?.email?.split("@")[0] || "usuario";

  if (userIcon) {
    userIcon.style.display = "none";
    userIcon.title = username;
    userIcon.textContent = username;
  }

  const perfilBanco = await buscarPerfilNoBanco(user.id);
  const cargo = normalizarCargo(perfilBanco?.cargo || localStorage.getItem("cargo") || "usuario");
  const nomeBotao = (perfilBanco?.nome || username).trim();

  localStorage.setItem("cargo", cargo);
  localStorage.setItem("username", username);
  localStorage.setItem("display_name", nomeBotao);

  // salva perfil completo em memória global para outros módulos
  window.currentDoctorProfile = {
    user_id: user.id,
    username,
    email: user.email,
    nome: perfilBanco?.nome || username,
    cargo,
    crm: perfilBanco?.crm ?? null,
  };

  atualizarBotaoLateral({ label: nomeBotao, cargo });
  preencherPerfilUI(window.currentDoctorProfile, user);
  broadcastAuthToModuleIframes(window.currentDoctorProfile);
  hideError();
}
