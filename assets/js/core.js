const sidebar = document.getElementById('coreSidebar');
const toggleBtn = document.getElementById('sidebarToggle');
const navButtons = [...document.querySelectorAll('.core-nav-item[data-tab]')];
const tabs = [...document.querySelectorAll('.core-tab[data-content]')];
const pageTitle = document.getElementById('corePageTitle');
const pageSubtitle = document.getElementById('corePageSubtitle');

const subtitles = {
  principal: 'Sistema clínico interno do Hospital São Rafael',
  agenda: 'Agenda médica e controle de atendimentos',
  planos: 'Gerenciamento de planos de saúde e convênios',
  medicamentos: 'Guia básico de medicamentos e nomenclaturas clínicas',
  parceiros: 'Parcerias e integrações',
  calculadora: 'Ferramenta de apoio clínico',
  laudos: 'Emissão e padronização de laudos',
  receitas: 'Emissão de receitas médicas',
  recibos: 'Gestão de comprovantes e recibos',
  atestados: 'Emissão de atestados médicos',
  perfil: 'Informações do usuário e dados de acesso'
};

function activateTab(tab){
  navButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
  tabs.forEach(section => section.classList.toggle('active', section.dataset.content === tab));
  if (pageTitle) pageTitle.textContent = tab.charAt(0).toUpperCase() + tab.slice(1);
  if (pageSubtitle) pageSubtitle.textContent = subtitles[tab] || 'Módulo do sistema clínico';
  try { history.replaceState(null, '', `#/${tab}`); } catch {}
}

window.coreActivateTab = activateTab;


function isCompactScreen(){
  return window.matchMedia('(max-width: 980px)').matches;
}

function updateSidebarState(){
  const collapsed = sidebar?.classList.contains('collapsed');
  const app = document.querySelector('.core-app');
  app?.classList.toggle('sidebar-collapsed', !!collapsed);
  if (toggleBtn) {
    toggleBtn.setAttribute('aria-expanded', String(!collapsed));
    toggleBtn.setAttribute('aria-label', collapsed ? 'Abrir menu' : 'Recolher menu');
  }
}

function autoCollapseOnSmallScreens(){
  if (!sidebar) return;
  if (isCompactScreen()) {
    sidebar.classList.add('collapsed');
  }
  updateSidebarState();
}

navButtons.forEach(btn => btn.addEventListener('click', () => {
  activateTab(btn.dataset.tab);
  if (isCompactScreen()) {
    sidebar?.classList.add('collapsed');
    updateSidebarState();
  }
}));

const shortcutButtons = [...document.querySelectorAll('[data-target-tab]')];
shortcutButtons.forEach(btn => btn.addEventListener('click', () => {
  const target = btn.dataset.targetTab;
  if (target) activateTab(target);
}));


toggleBtn?.addEventListener('click', () => {
  sidebar?.classList.toggle('collapsed');
  updateSidebarState();
});

window.addEventListener('resize', () => {
  if (isCompactScreen()) {
    sidebar?.classList.add('collapsed');
  }
  updateSidebarState();
});

autoCollapseOnSmallScreens();

const hash = (location.hash || '').replace('#/','').trim();
const initial = tabs.some(section => section.dataset.content === hash) ? hash : 'principal';
activateTab(initial);

window.addEventListener('usuario-logado', () => {
  const pill = document.getElementById('userIcon');
  if (pill) {
    pill.textContent = '';
    pill.style.display = 'none';
  }
});

window.addEventListener('usuario-deslogado', () => {
  const pill = document.getElementById('userIcon');
  if (pill) {
    pill.textContent = '';
    pill.style.display = 'none';
  }
});
