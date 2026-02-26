# Sistemas São Rafael

Sistema clínico web do Hospital São Rafael (HPSR), desenvolvido em HTML, CSS e JavaScript modular, com autenticação e persistência via Supabase.

## Visão geral

O projeto centraliza, em uma única interface, os principais módulos operacionais do hospital. O core funciona como painel principal e carrega ferramentas internas por navegação lateral e iframes, mantendo a experiência integrada para uso clínico e administrativo.

Principais objetivos do sistema:
- concentrar os módulos do hospital em um único ambiente
- padronizar fluxos e formulários
- facilitar o acesso rápido às ferramentas médicas
- permitir autenticação de usuários e controle de permissões
- gerenciar planos médicos diretamente no core

## Funcionalidades

### Core
- dashboard principal com navegação lateral responsiva
- abertura de módulos internos em iframes
- login e logout com Supabase Auth
- exibição de perfil do usuário autenticado
- sincronização do estado de autenticação com a interface

### Planos médicos
- busca de plano por passaporte
- exibição de status do plano
- cadastro de novo plano
- gerenciamento e renovação de planos
- suporte a dependentes
- exibição condicional de ações administrativas para diretoria

### Módulos internos
- **Agenda**: organização de atendimentos
- **Calculadora**: apoio a cálculos clínicos e operacionais
- **Laudos**: geração de laudos padronizados
- **Receitas**: emissão de receitas
- **Recibos**: emissão de recibos
- **Atestados**: emissão de atestados
- **Parceiros**: área informativa com convênios e benefícios internos

## Stack utilizada

- HTML5
- CSS3
- JavaScript ES Modules
- Supabase Auth
- Supabase Database
- Font Awesome

## Estrutura do projeto

```text
Sistemas São Rafael/
├─ index.html
├─ assets/
│  ├─ css/
│  │  ├─ core-dashboard.css
│  │  └─ style.css
│  ├─ img/
│  ├─ js/
│  │  ├─ auth.js
│  │  ├─ cadastro.js
│  │  ├─ core.js
│  │  ├─ dashboard.js
│  │  ├─ gerenciar.js
│  │  ├─ supabase.js
│  │  └─ utils.js
│  └─ modules/
│     ├─ agenda/
│     ├─ atestados/
│     ├─ calculadora/
│     ├─ laudos/
│     ├─ receitas/
│     └─ recibos/
```

## Como executar

Como o projeto usa módulos ES e arquivos locais encadeados, o ideal é executar com um servidor local.

### Opção 1: VS Code + Live Server
1. Abra a pasta do projeto no VS Code.
2. Instale a extensão **Live Server**.
3. Clique com o botão direito em `index.html`.
4. Escolha **Open with Live Server**.

### Opção 2: Python
Na raiz do projeto, execute:

```bash
python -m http.server 5500
```

Depois abra no navegador:

```text
http://localhost:5500
```

## Configuração do Supabase

A conexão com o Supabase está centralizada em:

```text
assets/js/supabase.js
```

Esse arquivo cria o client usado pelo restante do sistema.

### Pontos importantes
- o login depende do Supabase Auth
- o core consulta dados complementares do usuário na tabela `usuarios`
- o módulo de planos depende de tabelas relacionadas a pacientes, planos e dependentes
- permissões de interface, como ações de diretoria, dependem do cargo recuperado após autenticação

## Fluxo de autenticação

1. O usuário abre o modal de login pelo botão **Entrar**.
2. O sistema autentica com email e senha no Supabase.
3. Após autenticar, o projeto busca dados complementares do usuário na tabela `usuarios`.
4. O sistema atualiza a interface lateral, o perfil e as permissões visuais.
5. O logout limpa o estado local e restaura a interface de visitante.

## Regras de interface

- visitantes podem navegar pelo sistema principal
- recursos administrativos do módulo de planos aparecem apenas para usuários autorizados
- a barra lateral pode ser expandida ou minimizada
- em telas menores, a navegação deve priorizar os ícones para preservar espaço visual

## Observações de manutenção

- evite usar `localStorage.clear()` em módulos internos; prefira chaves com prefixo próprio
- ao adicionar novos módulos, mantenha o carregamento via iframe compatível com o core
- centralize qualquer alteração de autenticação no `auth.js` e no `dashboard.js`
- preserve consistência entre os dados vindos do Supabase e os elementos renderizados na UI
- valide com atenção qualquer conteúdo inserido no DOM via `innerHTML`

## Sugestão de melhorias futuras

- padronização total das chaves de armazenamento local por módulo
- sanitização centralizada de dados exibidos na interface
- camada única de controle de permissões
- revisão completa de responsividade dos módulos internos
- melhoria do tratamento visual de erros de autenticação e integração

## Licença e uso

Este projeto foi desenvolvido para uso interno no contexto do Hospital São Rafael e seus sistemas operacionais. Caso deseje publicar, distribuir ou comercializar, ajuste esta seção conforme a licença que pretende adotar.

## Créditos

Desenvolvimento e organização do sistema por **Luddhiev**.
