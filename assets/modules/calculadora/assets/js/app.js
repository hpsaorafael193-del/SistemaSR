// Dados dos produtos organizados por categoria (valores em centavos)
const medicamentos = [
            { id: 'm0', nome: "KIT MÉDICO", preco: 230000, imagem: "Icones/Kit medico.png" },
            { id: 'm1', nome: "BANDAGEM", preco: 30000, imagem: "Icones/Bandagem.png" },
            { id: 'm2', nome: "ATADURA", preco: 25000, imagem: "Icones/Atadura.png" },
            { id: 'm3', nome: "ADRENALINA", preco: 780000, imagem: "Icones/Adrenalina.png" },
            { id: 'm4', nome: "SINKALMY", preco: 80000, imagem: "Icones/Sinkalmy.png" },
            { id: 'm5', nome: "RITMONEARY", preco: 55000, imagem: "Icones/Ritmoneary.png" },
            { id: 'm6', nome: "ANALGÉSICO", preco: 55000, imagem: "Icones/Analgesico.png" },
        ];

const procedimentos = [
            { id: 'p0', nome: "TRATAMENTO", preco: 180000, imagem: "Icones/Tratamento.png" },
            { id: 'p1', nome: "QUEIMADURAS/GESSO", preco: 250000, imagem: "Icones/Gesso.png" },
            { id: 'p2', nome: "CONSULTAS", preco: 10000000, imagem: "Icones/Consultas.png" },
            { id: 'p3', nome: "EXAMES BASICOS", preco: 250000, imagem: "Icones/Exames_basicos.png" },
            { id: 'p4', nome: "EXAMES DE IMAGEM", preco: 300000, imagem: "Icones/Exames_imagem.png" },
            { id: 'p5', nome: "PROCEDIMENTOS", preco: 25000000, imagem: "Icones/Procedimentos.png" },
            { id: 'p6', nome: "FERT IN VITRO", preco: 40000000, imagem: "Icones/Fiv.png" },
            { id: 'p7', nome: "PARTO NORMAL", preco: 40000000, imagem: "Icones/Partos.png" },
            { id: 'p8', nome: "PARTO HUMANIZADO", preco: 80000000, imagem: "Icones/Partos_H.png" },
        ];

const ursosHP = [
            { id: 'u0', nome: "CATZINHA", preco: 3000000, imagem: "Icones/CatZinha.png" },
            { id: 'u1', nome: "CAPIZINHA", preco: 3000000, imagem: "Icones/CapZinha.png" },
            { id: 'u2', nome: "PANDINHO", preco: 3000000, imagem: "Icones/PanDinho.png" },
        ];

const combos = {
  Simples: {
    nome: "COMBO SIMPLES",
    items: [
      { id: "m0", quantidade: 2 },
      { id: "m1", quantidade: 5 },
      { id: "m2", quantidade: 10 },
      { id: "m3", quantidade: 2 },
    ],
  },
  Completo: {
    nome: "COMBO COMPLETO",
    items: [
      { id: "m0", quantidade: 2 },
      { id: "m1", quantidade: 5 },
      { id: "m2", quantidade: 20 },
      { id: "m3", quantidade: 2 },
      { id: "m4", quantidade: 5 },
      { id: "m5", quantidade: 5 },
      { id: "m6", quantidade: 10 },
    ],
  },
};

// Elementos DOM
const valorTotalElement = document.querySelector(".valor-total");
const convenioAplicadoElement = document.querySelector(".convenio-aplicado");
const btnZerarTudo = document.getElementById("btn-zerar-tudo");
const btnComboSimples = document.getElementById("combo-simples");
const btnComboCompleto = document.getElementById("combo-completo");
const abaBotoes = document.querySelectorAll(".aba-botao");
const abaConteudos = document.querySelectorAll(".aba-conteudo");
const convenioOptions = document.querySelectorAll(".convenio-option");

// Estado da aplicação
let carrinho = {};
let convenioAtual = "sem";

// Inicializar carrinho para todos os produtos
[...medicamentos, ...procedimentos, ...ursosHP].forEach((produto) => {
  carrinho[produto.id] = 0;
});

// Renderizar produtos por categoria
function renderizarProdutos() {
  renderizarCategoria("medicamentos", medicamentos);
  renderizarCategoria("procedimentos", procedimentos);
  renderizarCategoria("ursos-hp", ursosHP);
  adicionarEventListeners();
}

function renderizarCategoria(tipo, produtos) {
  const container = document.getElementById(`produtos-${tipo}`);
  container.innerHTML = "";

  produtos.forEach((produto, index) => {
    const produtoCard = document.createElement("div");
    produtoCard.className = "produto-card";
    produtoCard.style.animationDelay = `${index * 0.05}s`;

    produtoCard.innerHTML = `
                    <div class="produto-imagem-container">
                        <img src="${produto.imagem}" alt="${produto.nome}" class="produto-imagem" onerror="this.src='https://via.placeholder.com/150x150/f9e2b5/491100?text=${encodeURIComponent(produto.nome)}'">
                    </div>
                    <div class="produto-nome">${produto.nome}</div>
                    <div class="produto-preco">R$ ${formatarPreco(produto.preco)}</div>
                    <div class="produto-controles">
                        <div class="quantidade">
                            <button class="btn-quantidade diminuir" data-produto-id="${produto.id}">-</button>
                            <input type="number" class="quantidade-input" id="quantidade-${produto.id}" value="0" min="0" data-produto-id="${produto.id}">
                            <button class="btn-quantidade aumentar" data-produto-id="${produto.id}">+</button>
                        </div>
                        <button class="btn-zerar" data-produto-id="${produto.id}">
                            <i class="fas fa-eraser"></i> Zerar
                        </button>
                    </div>
                `;

    container.appendChild(produtoCard);
  });
}

function adicionarEventListeners() {
  // Botões de aumentar
  document.querySelectorAll(".aumentar").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = e.target.getAttribute("data-produto-id");
      if (id) {
        carrinho[id]++;
        atualizarQuantidade(id);
        calcularTotal();
      }
    });
  });

  // Botões de diminuir
  document.querySelectorAll(".diminuir").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = e.target.getAttribute("data-produto-id");
      if (id && carrinho[id] > 0) {
        carrinho[id]--;
        atualizarQuantidade(id);
        calcularTotal();
      }
    });
  });

  // Botões de zerar individual
  document.querySelectorAll(".btn-zerar").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = e.target.closest(".btn-zerar").getAttribute("data-produto-id");
      if (id) {
        carrinho[id] = 0;
        atualizarQuantidade(id);
        calcularTotal();
      }
    });
  });

  // Inputs de quantidade
  document.querySelectorAll(".quantidade-input").forEach((input) => {
    input.addEventListener("change", (e) => {
      const id = e.target.getAttribute("data-produto-id");
      if (id) {
        let valor = parseInt(e.target.value) || 0;
        if (valor < 0) valor = 0;
        carrinho[id] = valor;
        calcularTotal();
      }
    });

    input.addEventListener("input", (e) => {
      const id = e.target.getAttribute("data-produto-id");
      if (id) {
        let valor = parseInt(e.target.value) || 0;
        if (valor < 0) valor = 0;
        carrinho[id] = valor;
        calcularTotal();
      }
    });
  });
}

function atualizarQuantidade(id) {
  const input = document.getElementById(`quantidade-${id}`);
  if (input) {
    input.value = carrinho[id];
  }
}

// Função para aplicar combo (SEM ALERTA)
function aplicarCombo(tipoCombo) {
  const combo = combos[tipoCombo];

  // Aplicar quantidades do combo
  combo.items.forEach((item) => {
    // Verificar se o item existe no carrinho
    if (carrinho[item.id] !== undefined) {
      carrinho[item.id] = (carrinho[item.id] || 0) + item.quantidade;
      atualizarQuantidade(item.id);
    }
  });

  // Garantir que estamos na aba de medicamentos
  alternarAba("medicamentos");

  // Recalcular total
  calcularTotal();
}

function calcularTotal() {
  let total = 0;

  // Calcular total de medicamentos
  medicamentos.forEach((produto) => {
    const quantidade = carrinho[produto.id] || 0;
    total += produto.preco * quantidade;
  });

  // Calcular total de procedimentos
  procedimentos.forEach((produto) => {
    const quantidade = carrinho[produto.id] || 0;
    total += produto.preco * quantidade;
  });

  // Calcular total de ursos HP
  ursosHP.forEach((produto) => {
    const quantidade = carrinho[produto.id] || 0;
    total += produto.preco * quantidade;
  });

  // Aplicar desconto
  let desconto = 0;
  let textoConvenio = "";

  switch (convenioAtual) {
    case "plano":
      desconto = 0.2; // 20%
      textoConvenio = "Plano Médico";
      break;
    /*case "parceria-pm":
      desconto = 0.1; // 10%
      textoConvenio = "Parceria PM";
      break;*/
    case "parceria":
      desconto = 0.15; // 15%
      textoConvenio = "Parceria";
      break;
    default:
      desconto = 0;
      textoConvenio = "Sem Convênio";
  }

  // Calcular total com desconto
  const totalComDesconto = total * (1 - desconto);

  // Atualizar display
  valorTotalElement.textContent = `R$ ${formatarPreco(totalComDesconto)}`;
  convenioAplicadoElement.textContent = textoConvenio;
}

function formatarPreco(preco) {
  // Converter centavos para reais e formatar
  const valorEmReais = preco / 100;
  return valorEmReais.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function zerarTudo() {
  // Zerar todas as quantidades
  [...medicamentos, ...procedimentos, ...ursosHP].forEach((produto) => {
    carrinho[produto.id] = 0;
    atualizarQuantidade(produto.id);
  });

  // Resetar convênio para "Sem Convênio"
  convenioOptions.forEach((opt) => opt.classList.remove("active"));
  convenioOptions[0].classList.add("active");
  convenioAtual = "sem";

  // Recalcular total
  calcularTotal();
}

// Função para alternar entre abas
function alternarAba(abaId) {
  // Atualizar botões das abas
  abaBotoes.forEach((botao) => {
    if (botao.getAttribute("data-aba") === abaId) {
      botao.classList.add("ativo");
    } else {
      botao.classList.remove("ativo");
    }
  });

  // Atualizar conteúdo das abas
  abaConteudos.forEach((conteudo) => {
    if (conteudo.id === `aba-${abaId}`) {
      conteudo.classList.add("ativo");
    } else {
      conteudo.classList.remove("ativo");
    }
  });
}

// Inicializar
renderizarProdutos();
calcularTotal();

// Event listeners para abas
abaBotoes.forEach((botao) => {
  botao.addEventListener("click", () => {
    const abaId = botao.getAttribute("data-aba");
    alternarAba(abaId);
  });
});

// Event listeners para convênios
convenioOptions.forEach((option) => {
  option.addEventListener("click", (e) => {
    const conv = e.target
      .closest(".convenio-option")
      .getAttribute("data-convenio");
    if (conv) {
      convenioOptions.forEach((opt) => opt.classList.remove("active"));
      e.target.closest(".convenio-option").classList.add("active");
      convenioAtual = conv;
      calcularTotal();
    }
  });
});

// Event listeners para combos (SEM ALERTA)
if (btnComboSimples) {
  btnComboSimples.addEventListener("click", () => aplicarCombo("Simples"));
}
if (btnComboCompleto) {
  btnComboCompleto.addEventListener("click", () => aplicarCombo("Completo"));
}

// Event listener para zerar tudo
btnZerarTudo.addEventListener("click", zerarTudo);


