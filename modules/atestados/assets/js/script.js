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

// Observações
const obsBox = document.getElementById('obsBox');
const obsPreview = document.getElementById('obsPreview');
const LIMITE_OBSERVACOES = 120;

// Assinatura
const signatureUpload = document.getElementById('signatureUpload');
const signaturePreview = document.getElementById('signaturePreview');
const removeSignatureBtn = document.getElementById('removeSignatureBtn');
const signatureButton = document.querySelector('.signature-button');

// Controles
const fieldDaysOff = document.getElementById('fieldDaysOff');
const savePngBtn = document.getElementById('savePngBtn');

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

// Gera o texto principal do atestado
function gerarTextoAtestado() {
  const nome = patientName.value || '[Nome do paciente]';
  const data = formatDateBR(issueDate.value);
  const dias = daysOff.value || 0;

  switch (tipoAtestado.value) {
    case 'comparecimento':
      return `Atesto para os devidos fins que ${nome} esteve sob atendimento médico nesta data (${data}), estando apto(a) a retornar às suas atividades após o atendimento.`;

    case 'afastamento':
      return `Atesto para os devidos fins que ${nome} esteve sob atendimento médico nesta data (${data}), necessitando afastamento de suas atividades por ${dias} dia(s).`;

    case 'restricao':
      return `Atesto para os devidos fins que ${nome} esteve sob atendimento médico nesta data (${data}), podendo retornar às suas atividades com restrição, pelo período de ${dias} dia(s).`;

    case 'retorno':
      return `Atesto para os devidos fins que ${nome} esteve sob avaliação médica nesta data (${data}), encontrando-se apto(a) para retorno às suas atividades habituais.`;

    case 'escolar':
      return `Atesto para os devidos fins que ${nome} esteve sob atendimento médico nesta data (${data}), devendo permanecer afastado(a) de suas atividades escolares por ${dias} dia(s).`;

    default:
      return '';
  }
}

// Atualiza o preview em tempo real
function updatePreview() {
  controlarCampos();

  textoAtestado.textContent = gerarTextoAtestado();
  doctorPreview.textContent = doctorName.value || 'Nome do médico';
  crmPreview.textContent = 'CRM: ' + (crm.value || '000000');
  documentDate.textContent = 'Data: ' + formatDateBR(issueDate.value);

  const obs = notes.value.trim();

  if (obs) {
    obsBox.style.display = 'block';
    obsPreview.textContent = obs.slice(0, LIMITE_OBSERVACOES);
  } else {
    obsBox.style.display = 'none';
  }
}

// Validação antes de exportar
function validarAtestado() {
  if (!patientName.value.trim()) {
    alert('Informe o nome do paciente.');
    return false;
  }

  if (!doctorName.value.trim()) {
    alert('Informe o nome do médico.');
    return false;
  }

  if (!crm.value.trim()) {
    alert('Informe o CRM.');
    return false;
  }

  if (['afastamento', 'restricao', 'escolar'].includes(tipoAtestado.value)) {
    if (Number(daysOff.value) <= 0) {
      alert('Informe os dias de afastamento.');
      return false;
    }
  }

  if (tipoAtestado.value === 'restricao' && !notes.value.trim()) {
    alert('Informe as observações da restrição.');
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
