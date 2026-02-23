(function () {
  // ======= CONFIG: aponte cada sistema para o seu index.html =======
  // DICA: isole cada sistema em uma pasta dentro de /modules
  // Ex.: /modules/agenda/index.html, /modules/planos/index.html, etc.
  const moduleRoutes = {
    agenda: {
      title: "Agenda",
      icon: "fa-calendar-alt",
      src: "./modules/agenda/index.html",
    },
    exames: {
      title: "Exames",
      icon: "fa-flask",
      src: "./modules/exames/index.html",
    },
    planos: {
      title: "Planos",
      icon: "fa-clipboard-list",
      src: "./modules/planos/index.html",
    },
    receitas: {
      title: "Receitas",
      icon: "fa-prescription-bottle",
      src: "./modules/receitas/index.html",
    },
    atestados: {
      title: "Atestados",
      icon: "fa-notes-medical",
      src: "./modules/atestados/index.html",
    },
    recibos: {
      title: "Recibos",
      icon: "fa-receipt",
      src: "./modules/recibos/index.html",
    },
    calc: {
      title: "Calculadora",
      icon: "fa-calculator",
      src: "./modules/calculadora/index.html",
    },
  };

  const staticPages = {
    home: {
      title: "Principal",
      icon: "fa-home",
      render: () => `
            <div class="page-container">
              <div class="welcome-box">
                <p style="margin:0.8rem 0;">Seguem os atalhos para acessar os sistemas utilizados pelo hospital São Rafael.</p>
                <div style="display:flex; gap:10px; flex-wrap:wrap;">
                  <span class="badge">Agenda</span>
                                    <span class="badge">Exames</span>
                  <span class="badge">Planos</span>
                  <span class="badge">Receitas</span>
                  <span class="badge">Atestados</span>
                  <span class="badge">Recibos</span>
                  <span class="badge">Calculadora</span>
                </div>
              </div>

              <div class="card-grid">
                <div class="card">
                  <h3><i class="fas fa-calendar-check" style="color:#400f00;"></i> Agenda</h3>
                  <p>Interface integrada para sua agenda (ex.: Supabase).</p>
                  <button class="btn-outline" data-go="agenda">abrir</button>
                </div>
                <div class="card">
                  <h3><i class="fas fa-clipboard-list" style="color:#400f00;"></i> Planos</h3>
                  <p>Seu sistema de planos e renovação.</p>
                  <button class="btn-outline" data-go="planos">abrir</button>
                </div>

                <div class="card">
                  <h3><i class="fas fa-prescription-bottle" style="color:#400f00;"></i> Receitas</h3>
                  <p>Emissão de receitas e prescrições.</p>
                  <button class="btn-outline" data-go="receitas">abrir</button>
                </div>

                <div class="card">
                  <h3><i class="fas fa-notes-medical" style="color:#400f00;"></i> Atestados</h3>
                  <p>Geração de atestados com identidade institucional.</p>
                  <button class="btn-outline" data-go="atestados">abrir</button>
                </div>

                <div class="card">
                  <h3><i class="fas fa-receipt" style="color:#400f00;"></i> Recibos</h3>
                  <p>Emissão e gestão de recibos.</p>
                  <button class="btn-outline" data-go="recibos">abrir</button>
                </div>

                <div class="card">
                  <h3><i class="fas fa-calculator" style="color:#400f00;"></i> Calculadora</h3>
                  <p>Calculadora/guia de itens médicos.</p>
                  <button class="btn-outline" data-go="calculadora">abrir</button>
                </div>
              </div>
            </div>
          `,
    },
    parceiros: {
      title: "Parceiros",
      icon: "fa-handshake",
      render: () => `
    <div class="page-container">
      <div class="card page-card">
        <h3 class="page-title">
          <i class="fas fa-handshake"></i> Parceiros e integrações
        </h3>

        <p class="page-lead">
          O Hospital São Rafael possui parcerias operacionais e benefícios internos listados abaixo.
        </p>

        <div class="partner-stack">
          <div class="partner-box">
            <h4 class="partner-box__title">
              <i class="fas fa-wrench"></i> Mecânica StrokeMaster
            </h4>
            <p class="partner-box__text">
              Parceiro para manutenção e personalização de veículos do hospital.
            </p>
          </div>

          <div class="partner-box">
            <h4 class="partner-box__title">
              <i class="fas fa-tags"></i> Benefício para funcionários
            </h4>
            <p class="partner-box__text">
              Funcionários do Hospital São Rafael recebem desconto com ou sem uniforme.
            </p>
          </div>
        </div>

        <div style="margin-top:1.5rem;">
          <h4 class="section-title">
            <i class="fas fa-users"></i> Lista de funcionários elegíveis
          </h4>

          <div class="partner-table">
            <div class="partner-grid">
              <div class="partner-grid__head"><strong>Passaporte</strong></div>
              <div class="partner-grid__head"><strong>Nome / Observação</strong></div>

              <div><strong>2824</strong></div><div>Raziel Montenegro</div>
              <div><strong>2147</strong></div><div>Jack Morgan</div>
              <div><strong>313</strong></div><div>Sarah Groves</div>
              <div><strong>325</strong></div><div>Ashley Ootori</div>
              <div><strong>3441</strong></div><div>Zé V</div>
              <div><strong>3140</strong></div><div>Antonio Costa</div>
              <div><strong>449</strong></div><div>Zara Bellini</div>
              <div><strong>3777</strong></div><div>Ch Stifler</div>

              <div><strong>281</strong></div><div>Aurora Monteiro</div>
              <div><strong>844</strong></div><div>Majo Santana</div>
              <div><strong>1069</strong></div><div>Larissa Marilac</div>
              <div><strong>4011</strong></div><div>João Silveira</div>
              <div><strong>405</strong></div><div>Yelena Niknov</div>
              <div><strong>383</strong></div><div>Elizabeth Drake</div>
              <div><strong>745</strong></div><div>Maria Martini</div>
              <div><strong>331</strong></div><div>Isabella Higanbana</div>

              <div><strong>2673</strong></div><div>Haru Suzuki</div>
              <div><strong>665</strong></div><div>Bruno Pellegrini</div>
              <div><strong>2236</strong></div><div>Yeda Maksimova</div>
              <div><strong>319</strong></div><div>Hella Sanchez</div>
              <div><strong>271</strong></div><div>Quinn Tsukuroi</div>
            </div>
          </div>
        </div>

        <p class="partner-note">
          <i class="fas fa-circle-info"></i>
        </p>
      </div>
    </div>
  `,
    },
  };

  const navItems = Array.from(document.querySelectorAll(".nav-item"));
  const contentDiv = document.getElementById("mainContent");
  const topTitle = document.getElementById("topTitle");
  const sidebar = document.getElementById("sidebar");
  const sidebarToggle = document.getElementById("sidebarToggle");

  // ======= Sidebar: minimizar (mantém só ícones) =======
  (function initSidebarCollapse() {
    if (!sidebar || !sidebarToggle) return;

    const saved = localStorage.getItem("sidebarCollapsed");
    if (saved === "1") sidebar.classList.add("is-collapsed");

    sidebarToggle.addEventListener("click", () => {
      sidebar.classList.toggle("is-collapsed");
      localStorage.setItem(
        "sidebarCollapsed",
        sidebar.classList.contains("is-collapsed") ? "1" : "0",
      );
    });
  })();

  function setTopTitle(icon, title) {
    topTitle.innerHTML = `<i class="fas ${icon}"></i><span>${title}</span>`;
  }

  function renderEmbed(pageId) {
    const def = moduleRoutes[pageId];
    const safeSrc = def && def.src ? def.src : "";

    // iframe deve ocupar 100% da área de conteúdo (sem card, sem toolbar)
    return `<iframe class="full-embed-frame" id="embedFrame" src="${safeSrc}" loading="lazy" title="${def?.title || "Módulo"}"></iframe>`;
  }

  function setEmbedMode(isEmbed) {
    if (!contentDiv) return;
    contentDiv.classList.toggle("is-embed", !!isEmbed);
  }

  function loadPage(pageId) {
    // 1) páginas estáticas do Core
    if (staticPages[pageId]) {
      const page = staticPages[pageId];
      setEmbedMode(false);
      contentDiv.innerHTML = page.render();
      setTopTitle(page.icon, page.title);
      activateNav(pageId);

      // bind: atalhos do dashboard
      contentDiv.querySelectorAll("[data-go]").forEach((btn) => {
        btn.addEventListener("click", () =>
          navigate(btn.getAttribute("data-go")),
        );
      });

      // bind: IMC demo
      const btnImc = document.getElementById("btnImc");
      if (btnImc) {
        btnImc.addEventListener("click", () => {
          const peso = parseFloat(
            document.getElementById("imcPeso").value.replace(",", "."),
          );
          const altura = parseFloat(
            document.getElementById("imcAltura").value.replace(",", "."),
          );
          const out = document.getElementById("imcOut");

          if (!peso || !altura || altura <= 0) {
            out.textContent = "Resultado: preencha peso e altura válidos.";
            return;
          }
          const imc = peso / (altura * altura);
          let cls = "—";
          if (imc < 18.5) cls = "baixo peso";
          else if (imc < 25) cls = "adequado";
          else if (imc < 30) cls = "sobrepeso";
          else cls = "obesidade";

          out.textContent = `Resultado: ${imc.toFixed(1)} (${cls})`;
        });
      }

      return;
    }

    // 2) páginas que apontam para sistemas existentes (módulos)
    if (moduleRoutes[pageId]) {
      const def = moduleRoutes[pageId];
      setEmbedMode(true);
      contentDiv.innerHTML = renderEmbed(pageId);
      setTopTitle(def.icon, def.title);
      activateNav(pageId);
      return;
    }

    // fallback
    contentDiv.innerHTML = `<div class="page-container"><div class="card"><h3>Página não encontrada</h3></div></div>`;
    setTopTitle("fa-triangle-exclamation", "Erro");
    activateNav(null);
  }

  function activateNav(pageId) {
    navItems.forEach((btn) => {
      btn.classList.remove("active");
      if (btn.dataset.page === pageId) btn.classList.add("active");
    });
  }

  // ======= ROTEAMENTO POR HASH (#/agenda) =======
  function getHashPage() {
    const raw = (location.hash || "#/home").replace("#/", "");
    return raw || "home";
  }
  function navigate(pageId) {
    location.hash = "#/" + pageId;
  }
  window.addEventListener("hashchange", () => loadPage(getHashPage()));

  // sidebar click
  navItems.forEach((btn) => {
    btn.addEventListener("click", () => {
      const page = btn.dataset.page;
      if (page) navigate(page);
    });
  });

  // start
  loadPage(getHashPage());
})();
