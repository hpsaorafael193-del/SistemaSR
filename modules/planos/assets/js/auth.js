import { supabase } from "./supabase.js";

const loginModal = document.getElementById("loginModal");
const diretoriaBtn = document.getElementById("diretoriaBtn");
const loginForm = document.getElementById("loginForm");
const errorBox = document.getElementById("error");

const userIcon = document.getElementById("userIcon");
if (userIcon) userIcon.style.display = "none";

// abrir modal
diretoriaBtn.addEventListener("click", () => {
  loginModal.style.display = "flex";
});

// fechar clicando fora
window.addEventListener("click", (e) => {
  if (e.target === loginModal) loginModal.style.display = "none";
});

// checar sessão inicial
const { data: sessionData } = await supabase.auth.getSession();
if (sessionData.session) {
  await carregarUsuario(sessionData.session.user);
}

// submit login
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const usuario = document.getElementById("usuario").value.trim();
  const password = document.getElementById("password").value;

  if (!usuario || !password) {
    errorBox.innerText = "Preencha usuário e senha";
    return;
  }

  const email = `${usuario}@srafael.local`;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("Erro login:", error);
    errorBox.innerText = "Login inválido";
    return;
  }

  errorBox.innerText = "";

  await carregarUsuario(data.user);

  loginModal.style.display = "none";

  // avisa o dashboard que houve login
  window.dispatchEvent(new Event("usuario-logado"));
});

const loginClose = document.getElementById("loginClose");
loginClose?.addEventListener("click", () => (loginModal.style.display = "none"));

errorBox.classList.remove("hidden");
errorBox.innerText = "Login inválido";
// ...
errorBox.classList.add("hidden");
errorBox.innerText = "";

// carrega usuário + cargo
async function carregarUsuario(user) {
  const icon = document.getElementById("userIcon");
  if (icon) {
    icon.style.display = "inline-flex";
    icon.title = user.email.split("@")[0];
  }

  document.getElementById("diretoriaBtn").style.display = "none";

  // ✅ maybeSingle evita 406 quando vier 0 linhas
  const { data: cargoData, error } = await supabase
    .from("usuarios")
    .select("cargo")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    // aqui você vai ver o motivo real no console
    console.error("Erro ao buscar cargo:", error);

    // fallback: não trava login
    localStorage.setItem("cargo", "usuario");
    return;
  }

  // se não existir registro, também não trava login
  if (!cargoData?.cargo) {
    localStorage.setItem("cargo", "usuario");
    return;
  }

  localStorage.setItem("cargo", cargoData.cargo);
}