// Elementos do formulário
const tipoAtestado = document.getElementById('tipoAtestado');
const patientName = document.getElementById('patientName');
const issueDate = document.getElementById('issueDate');
const daysOff = document.getElementById('daysOff');
const notes = document.getElementById('notes');
const doctorName = document.getElementById('doctorName');
const crm = document.getElementById('crm');

// Elementos do preview
const textoAtestado = document.getElementById('textoAtestado');
const documentDate = document.getElementById('documentDate');
const doctorPreview = document.getElementById('doctorPreview');
const crmPreview = document.getElementById('crmPreview');
const tipoPreview = document.getElementById('tipoPreview');
const patientPreview = document.getElementById('patientPreview');
const datePreview = document.getElementById('datePreview');
const periodSummary = document.getElementById('periodSummary');
const periodPreview = document.getElementById('periodPreview');
const placeDatePreview = document.getElementById('placeDatePreview');

// Observações
const obsBox = document.getElementById('obsBox');
const obsPreview = document.getElementById('obsPreview');
const LIMITE_OBSERVACOES = 2000;

// Assinatura
const signatureUpload = document.getElementById('signatureUpload');
const signaturePreview = document.getElementById('signaturePreview');
const removeSignatureBtn = document.getElementById('removeSignatureBtn');
const signatureButton = document.querySelector('.signature-button');

// Controles
const fieldDaysOff = document.getElementById('fieldDaysOff');
const savePngBtn = document.getElementById('savePngBtn');
const appModal = document.getElementById('appModal');
const appModalMessage = document.getElementById('appModalMessage');
const appModalOk = document.getElementById('appModalOk');


// Inicialização
issueDate.value = new Date().toISOString().split('T')[0];
updatePreview();

// Formata data para padrão brasileiro
function formatDateBR(dateISO) {
  if (!dateISO) return '';
  const [year, month, day] = dateISO.split('-');
  return `${day}/${month}/${year}`;
}

// Controla exibição dos campos conforme o tipo
function controlarCampos() {
  fieldDaysOff.style.display = 'none';

  if (['afastamento', 'restricao', 'escolar'].includes(tipoAtestado.value)) {
    fieldDaysOff.style.display = 'block';
  }
}

function getTipoLabel() {
  const labels = {
    comparecimento: 'Atestado de comparecimento',
    afastamento: 'Atestado de afastamento',
    restricao: 'Atestado com restrição',
    retorno: 'Atestado de retorno',
    escolar: 'Atestado escolar'
  };

  return labels[tipoAtestado.value] || 'Atestado médico';
}

// Gera o texto principal do atestado
function gerarTextoAtestado() {
  const nome = patientName.value || '[Nome do paciente]';
  const data = formatDateBR(issueDate.value) || '--/--/----';
  const dias = Number(daysOff.value || 0);

  switch (tipoAtestado.value) {
    case 'comparecimento':
      return `Atesto, para os devidos fins, que ${nome} compareceu ao Hospital São Rafael em ${data}, onde recebeu atendimento e avaliação médica. Após o atendimento realizado, o(a) paciente encontra-se liberado(a) conforme orientação profissional, devendo seguir as recomendações descritas neste documento quando houver.`;

    case 'afastamento':
      return `Atesto, para os devidos fins, que ${nome} foi atendido(a) e avaliado(a) clinicamente no Hospital São Rafael em ${data}. Em razão da condição observada no atendimento, recomenda-se afastamento de suas atividades habituais pelo período de ${dias} dia(s), contados a partir da data informada, para recuperação, repouso e acompanhamento conforme necessidade.`;

    case 'restricao':
      return `Atesto, para os devidos fins, que ${nome} foi atendido(a) e avaliado(a) clinicamente no Hospital São Rafael em ${data}. O(a) paciente poderá retornar às atividades, desde que observadas as restrições e orientações médicas pelo período de ${dias} dia(s), evitando esforços ou condutas incompatíveis com sua recuperação.`;

    case 'retorno':
      return `Atesto, para os devidos fins, que ${nome} passou por avaliação médica no Hospital São Rafael em ${data}. No momento da avaliação, encontra-se apto(a) para retorno às suas atividades habituais, respeitando eventuais orientações complementares registradas neste documento.`;

    case 'escolar':
      return `Atesto, para os devidos fins, que ${nome} esteve sob atendimento médico no Hospital São Rafael em ${data}. Recomenda-se afastamento de suas atividades escolares pelo período de ${dias} dia(s), com retorno após esse prazo, salvo nova orientação médica.`;

    default:
      return '';
  }
}

// Atualiza o preview em tempo real
function updatePreview() {
  controlarCampos();

  const dataFormatada = formatDateBR(issueDate.value) || '--/--/----';
  const exigePeriodo = ['afastamento', 'restricao', 'escolar'].includes(tipoAtestado.value);

  textoAtestado.textContent = gerarTextoAtestado();
  tipoPreview.textContent = getTipoLabel();
  patientPreview.textContent = patientName.value || '[Nome do paciente]';
  datePreview.textContent = dataFormatada;
  periodSummary.style.display = exigePeriodo ? 'block' : 'none';
  periodPreview.textContent = (daysOff.value || 0) + ' dia(s)';
  doctorPreview.textContent = doctorName.value || 'Nome do médico';
  crmPreview.textContent = 'CRM: ' + (crm.value || '000000');
  documentDate.textContent = 'Data: ' + dataFormatada;
  placeDatePreview.textContent = `Sandy Shores, ${dataFormatada}.`;

  const obs = notes.value.trim();

  if (obs) {
    obsBox.style.display = 'block';
    obsPreview.textContent = obs.slice(0, LIMITE_OBSERVACOES);
  } else {
    obsBox.style.display = 'none';
  }
}


// Modal personalizado para avisos e validações
function showAppMessage(message, title = 'Atenção') {
  document.getElementById('appModalTitle').textContent = title;
  appModalMessage.textContent = message;
  appModal.classList.add('is-open');
  appModal.setAttribute('aria-hidden', 'false');
  appModalOk.focus();
}

function closeAppModal() {
  appModal.classList.remove('is-open');
  appModal.setAttribute('aria-hidden', 'true');
}

appModalOk.addEventListener('click', closeAppModal);
appModal.addEventListener('click', event => {
  if (event.target === appModal) closeAppModal();
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && appModal.classList.contains('is-open')) {
    closeAppModal();
  }
});

// Validação antes de exportar
function validarAtestado() {
  if (!patientName.value.trim()) {
    showAppMessage('Informe o nome do paciente.');
    return false;
  }

  if (!doctorName.value.trim()) {
    showAppMessage('Informe o nome do médico.');
    return false;
  }

  if (!crm.value.trim()) {
    showAppMessage('Informe o CRM.');
    return false;
  }

  if (['afastamento', 'restricao', 'escolar'].includes(tipoAtestado.value)) {
    if (Number(daysOff.value) <= 0) {
      showAppMessage('Informe os dias de afastamento.');
      return false;
    }
  }

  if (tipoAtestado.value === 'restricao' && !notes.value.trim()) {
    showAppMessage('Informe as observações da restrição.');
    return false;
  }

  return true;
}

// Eventos para preview em tempo real
[
  tipoAtestado,
  patientName,
  issueDate,
  daysOff,
  notes,
  doctorName,
  crm
].forEach(el => {
  el.addEventListener('input', updatePreview);
  el.addEventListener('change', updatePreview);
});

// Upload da assinatura
signatureUpload.addEventListener('change', event => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    signaturePreview.src = e.target.result;
    signaturePreview.style.display = 'block';
  };
  reader.readAsDataURL(file);

  signatureButton.textContent = 'Assinatura inserida';
  removeSignatureBtn.style.display = 'inline';
});

removeSignatureBtn.addEventListener('click', () => {
  signatureUpload.value = '';
  signaturePreview.removeAttribute('src');
  signaturePreview.style.display = 'none';
  signatureButton.textContent = 'Inserir assinatura';
  removeSignatureBtn.style.display = 'none';
});

// Exportar atestado como PNG
savePngBtn.addEventListener('click', async () => {
  if (!validarAtestado()) return;

  updatePreview();

  const paper = document.getElementById('paper');
  const canvas = await html2canvas(paper, { scale: 2 });

  canvas.toBlob(blob => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'atestado.png';
    link.click();
  });
});
