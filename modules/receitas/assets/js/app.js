const medico = document.getElementById('medico');
const crm = document.getElementById('crm');
const paciente = document.getElementById('paciente');
const passaporte = document.getElementById('passaporte');
const data = document.getElementById('data');
const observacoes = document.getElementById('observacoes');

const previewPaciente = document.getElementById('preview-paciente');
const previewPassaporte = document.getElementById('preview-passaporte');
const previewData = document.getElementById('preview-data');
const previewMedico = document.getElementById('preview-medico');
const previewCrm = document.getElementById('preview-crm');
const previewObs = document.getElementById('preview-observacoes');
const previewMeds = document.getElementById('preview-medicamentos');
const previewNumero = document.getElementById('preview-receita-numero');
const previewCarimbo = document.getElementById('preview-carimbo');

const medicamentosTextarea = document.getElementById('medicamentos-texto');

const LIMITE_LINHAS_MEDICAMENTO = 12;

/* =======================
   CARIMBO
======================= */
let carimboData = null;

const carimboFile = document.getElementById('carimbo-file');
const carimboPreview = document.getElementById('carimbo-preview');
const btnCarregarCarimbo = document.getElementById('btn-carregar-carimbo');
const btnRemoverCarimbo = document.getElementById('btn-remover-carimbo');

/* =======================
   INIT
======================= */
document.addEventListener('DOMContentLoaded', () => {
    data.value = new Date().toLocaleDateString('pt-BR');
    inicializarNumeroReceita();
    carregarRascunho();
    carregarCarimboSalvo();
    atualizarPreview();
});

/* =======================
   NUMERAÇÃO
======================= */
function gerarNumeroReceita() {
    const ano = new Date().getFullYear();
    const chave = `receitaSeq_${ano}`;
    let seq = parseInt(localStorage.getItem(chave) || '0', 10) + 1;
    localStorage.setItem(chave, seq);
    return `HSR-${ano}-${String(seq).padStart(6, '0')}`;
}

function inicializarNumeroReceita() {
    const numero = gerarNumeroReceita();
    document.body.dataset.receitaNumero = numero;
    previewNumero.textContent = numero;
}

/* =======================
   MEDICAMENTOS
======================= */
function obterLinhasMedicamentos() {
    return medicamentosTextarea.value
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean)
        .slice(0, LIMITE_LINHAS_MEDICAMENTO);
}

/* =======================
   PREVIEW
======================= */
function atualizarPreview() {
    previewPaciente.textContent = paciente.value || '—';
    previewPassaporte.textContent = passaporte.value || '—';
    previewData.textContent = data.value || '—';
    previewMedico.textContent = medico.value || '—';
    previewCrm.textContent = crm.value || '—';
    previewObs.textContent = observacoes.value || '—';

    const linhas = obterLinhasMedicamentos();

    previewMeds.innerHTML = linhas.length
        ? linhas.map(l => `
            <div class="medicamento-preview">
                <p class="texto-quebra">${l}</p>
            </div>
        `).join('')
        : '<p>Nenhum medicamento adicionado.</p>';
}

/* =======================
   RASCUNHO
======================= */
function salvarRascunho() {
    localStorage.setItem('rascunhoReceita', JSON.stringify({
        medico: medico.value,
        crm: crm.value,
        paciente: paciente.value,
        passaporte: passaporte.value,
        data: data.value,
        observacoes: observacoes.value,
        medicamentos: medicamentosTextarea.value,
        numero: document.body.dataset.receitaNumero
    }));
}

function carregarRascunho() {
    const r = localStorage.getItem('rascunhoReceita');
    if (!r) return;

    const d = JSON.parse(r);

    medico.value = d.medico || '';
    crm.value = d.crm || '';
    paciente.value = d.paciente || '';
    passaporte.value = d.passaporte || '';
    data.value = d.data || '';
    observacoes.value = d.observacoes || '';
    medicamentosTextarea.value = d.medicamentos || '';

    if (d.numero) {
        document.body.dataset.receitaNumero = d.numero;
        previewNumero.textContent = d.numero;
    }
}

/* =======================
   EVENTOS INPUT
======================= */
[
    medico, crm, paciente, passaporte, data, observacoes, medicamentosTextarea
].forEach(el => {
    el.addEventListener('input', () => {
        salvarRascunho();
        atualizarPreview();
    });
});

/* =======================
   PRESCRIÇÃO GUIADA
======================= */
document.getElementById('btn-add-medicamento').addEventListener('click', () => {
    const nome = document.getElementById('med-nome').value.trim();
    const dose = document.getElementById('med-dose').value.trim();
    const intervalo = document.getElementById('med-intervalo').value.trim();
    const via = document.getElementById('med-via').value.trim();
    const duracao = document.getElementById('med-duracao').value.trim();

    if (!nome || !dose) {
        alert('Informe nome e dose do medicamento.');
        return;
    }

    const linha = [
        nome,
        dose,
        intervalo && `– ${intervalo}`,
        via && `– ${via}`,
        duracao && `– ${duracao}`
    ].filter(Boolean).join(' ');

    medicamentosTextarea.value = medicamentosTextarea.value
        ? medicamentosTextarea.value + '\n' + linha
        : linha;

    ['med-nome','med-dose','med-intervalo','med-via','med-duracao']
        .forEach(id => document.getElementById(id).value = '');

    salvarRascunho();
    atualizarPreview();
});

/* =======================
   CARIMBO
======================= */
btnCarregarCarimbo.addEventListener('click', () => carimboFile.click());
btnRemoverCarimbo.addEventListener('click', removerCarimbo);
carimboFile.addEventListener('change', carregarCarimbo);

function carregarCarimbo(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'image/png') {
        alert('Use apenas PNG com fundo transparente.');
        return;
    }

    const reader = new FileReader();
    reader.onload = ev => {
        carimboData = ev.target.result;
        localStorage.setItem('carimboMedico', carimboData);
        atualizarCarimbo();
    };
    reader.readAsDataURL(file);
}

function atualizarCarimbo() {
    if (!carimboData) {
        carimboPreview.innerHTML = '<span>Nenhum carimbo carregado</span>';
        previewCarimbo.innerHTML = '';
        return;
    }

    carimboPreview.innerHTML = `<img src="${carimboData}">`;
    previewCarimbo.innerHTML = `<img src="${carimboData}" class="carimbo-final">`;
}

function removerCarimbo() {
    if (!confirm('Remover carimbo médico?')) return;
    carimboData = null;
    carimboFile.value = '';
    localStorage.removeItem('carimboMedico');
    atualizarCarimbo();
}

function carregarCarimboSalvo() {
    const salvo = localStorage.getItem('carimboMedico');
    if (salvo) {
        carimboData = salvo;
        atualizarCarimbo();
    }
}

/* =======================
   VALIDAÇÃO TAMANHO
======================= */
function validarComprimentoReceita() {
    if (obterLinhasMedicamentos().length >= LIMITE_LINHAS_MEDICAMENTO) {
        alert('Receita muito longa. Divida em mais de uma prescrição.');
        return false;
    }
    return true;
}

/* =======================
   GERAR PNG
======================= */
document.getElementById('btn-gerar-pdf').addEventListener('click', () => {
    if (!validarComprimentoReceita()) return;

    const clone = document.getElementById('receita-preview').cloneNode(true);
    clone.id = 'receita-print';
    document.body.appendChild(clone);

    setTimeout(() => {
        html2canvas(clone, { scale: 2, backgroundColor: '#ffffff' })
            .then(canvas => {
                document.body.removeChild(clone);
                const a = document.createElement('a');
                a.download = `receita_${paciente.value || 'paciente'}.png`;
                a.href = canvas.toDataURL();
                a.click();
            });
    }, 300);
});

/* =======================
   LIMPAR
======================= */
document.getElementById('btn-limpar').addEventListener('click', () => {
    if (!confirm('Deseja limpar todos os dados?')) return;
    localStorage.removeItem('rascunhoReceita');
    location.reload();
});
