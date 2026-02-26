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
  parceiros: 'Parcerias e integrações',
  calculadora: 'Ferramenta de apoio clínico',
  laudos: 'Emissão e padronização de laudos',
  receitas: 'Emissão de receitas médicas',
  recibos: 'Gestão de comprovantes e recibos',
  atestados: 'Emissão de atestados médicos'
};

function activateTab(tab){
  navButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
  tabs.forEach(section => section.classList.toggle('active', section.dataset.content === tab));
  if (pageTitle) pageTitle.textContent = tab.charAt(0).toUpperCase() + tab.slice(1);
  if (pageSubtitle) pageSubtitle.textContent = subtitles[tab] || 'Módulo do sistema clínico';
  try { history.replaceState(null, '', `#/${tab}`); } catch {}
}

window.coreActivateTab = activateTab;

navButtons.forEach(btn => btn.addEventListener('click', () => activateTab(btn.dataset.tab)));

toggleBtn?.addEventListener('click', () => {
  sidebar?.classList.toggle('collapsed');
});

const hash = (location.hash || '').replace('#/','').trim();
const initial = navButtons.some(b => b.dataset.tab === hash) ? hash : 'principal';
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
