// Sistema de Recibos Digital
      document.addEventListener("DOMContentLoaded", function () {
        // Elementos DOM
        const btnHelp = document.getElementById("btn-help-recibo");
        const helpModal = document.getElementById("help-modal-recibo");
        const modalClose = helpModal.querySelector(".modal-close");
        const btnAtualizarPreview = document.getElementById(
          "atualizar-preview-recibo",
        );
        const btnLimpar = document.getElementById("limpar-recibo");
        const btnExportPNG = document.getElementById("export-recibo-png");
        const notification = document.getElementById("notification-recibo");
        const notificationMessage = document.getElementById(
          "notification-message-recibo",
        );
        const reciboStatus = document.getElementById("recibo-status");
        const autoSaveStatus = document.getElementById("auto-save-status");
        const autoSaveText = document.getElementById("auto-save-text");

        // Máscara de valor monetário
        const valorInput = document.getElementById("valor-recibo");
        valorInput.addEventListener("input", function (e) {
          let value = e.target.value.replace(/\D/g, "");
          value = (value / 100).toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
          e.target.value = value;
          updateReciboStatus();
        });

        const emitenteNomeInput = document.getElementById("emitente-nome");
        const recebedorNomeInput = document.getElementById("recebedor-nome");

        function formatDateLocal(date) {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const day = String(date.getDate()).padStart(2, "0");
          return `${year}-${month}-${day}`;
        }

        // Configurar data atual
        const dataInput = document.getElementById("data-recibo");
        const hoje = formatDateLocal(new Date());
        dataInput.value = hoje;

        // Configurar hora atual
        const horaInput = document.getElementById("hora-recibo");
        const agora = new Date();
        const hora = agora.getHours().toString().padStart(2, "0");
        const minutos = agora.getMinutes().toString().padStart(2, "0");
        horaInput.value = `${hora}:${minutos}`;

        // Gerar número do recibo
        const numeroReciboInput = document.getElementById("numero-recibo");
        const btnGerarNumero = document.getElementById("gerar-numero-recibo");

        function gerarNumeroRecibo() {
          const timestamp = Date.now();
          const random = Math.floor(Math.random() * 1000);
          const numero = `REC${timestamp.toString().slice(-6)}${random.toString().padStart(3, "0")}`;
          numeroReciboInput.value = numero;
          showNotification("Número do recibo gerado com sucesso!");
          updateReciboStatus();
        }

        const STORAGE_PREFIX = "recibos:";
        const storageKey = (key) => `${STORAGE_PREFIX}${key}`;
        const getStoredValue = (key) => {
          const namespaced = localStorage.getItem(storageKey(key));
          if (namespaced !== null) return namespaced;
          return localStorage.getItem(key);
        };
        const setStoredValue = (key, value) => {
          localStorage.setItem(storageKey(key), value);
        };
        const formatTime = (date) =>
          `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
        let autoSaveFeedbackTimer = null;
        const setAutoSaveState = (state, timestamp = new Date()) => {
          if (!autoSaveStatus || !autoSaveText) return;
          autoSaveStatus.classList.remove("saving", "saved");
          if (state === "saving") {
            autoSaveStatus.classList.add("saving");
            autoSaveText.textContent = "Salvando...";
            return;
          }
          autoSaveStatus.classList.add("saved");
          autoSaveText.textContent = `Auto-salvo às ${formatTime(timestamp)}`;
        };
        const clearRecibosStorage = () => {
          const keysToRemove = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(STORAGE_PREFIX)) keysToRemove.push(key);
          }
          keysToRemove.forEach((key) => localStorage.removeItem(key));
          localStorage.removeItem("numeroRecibo");
        };

        // Carregar número salvo ou gerar novo
        const savedNumero = getStoredValue("numeroRecibo");
        if (savedNumero) {
          numeroReciboInput.value = savedNumero;
        } else {
          gerarNumeroRecibo();
        }

        btnGerarNumero.addEventListener("click", gerarNumeroRecibo);

        // Auto-save para todos os campos
        const inputs = document.querySelectorAll(
          ".form-control, #descricao-recibo, textarea",
        );
        const saveTimers = new Map();
        let previewDebounceTimer = null;

        const schedulePreviewUpdate = () => {
          clearTimeout(previewDebounceTimer);
          previewDebounceTimer = setTimeout(() => {
            updatePreview();
          }, 350);
        };

        const saveFieldValue = (input) => {
          const value = input.getAttribute("contenteditable")
            ? input.innerHTML
            : input.value;
          setStoredValue(input.id, value);
          updateReciboStatus();
          setAutoSaveState("saved");
        };

        const scheduleAutoSave = (input, options = {}) => {
          const { immediate = false } = options;
          const existingTimer = saveTimers.get(input.id);
          if (existingTimer) clearTimeout(existingTimer);
          setAutoSaveState("saving");

          if (immediate) {
            saveFieldValue(input);
            return;
          }

          const timer = setTimeout(() => {
            saveFieldValue(input);
            saveTimers.delete(input.id);
          }, 400);
          saveTimers.set(input.id, timer);
        };

        inputs.forEach((input) => {
          // Carregar dados salvos
          const savedValue = getStoredValue(input.id);
          if (savedValue !== null) {
            if (input.getAttribute("contenteditable")) {
              input.innerHTML = savedValue;
            } else {
              input.value = savedValue;
            }
          }

          const handleInput = function () {
            scheduleAutoSave(this);
            schedulePreviewUpdate();
          };

          input.addEventListener("input", handleInput);
          input.addEventListener("change", function () {
            scheduleAutoSave(this, { immediate: true });
            schedulePreviewUpdate();
          });

          if (input.getAttribute("contenteditable")) {
            input.addEventListener("blur", function () {
              scheduleAutoSave(this, { immediate: true });
              schedulePreviewUpdate();
            });
          }
        });

        // Funções auxiliares
        function showNotification(message, type = "success") {
          notificationMessage.textContent = message;
          notification.className = "notification";
          notification.classList.add("show");

          if (type === "error") {
            notification.style.background = "#422e23";
          } else {
            notification.style.background = "var(--primary-color)";
          }

          setTimeout(() => {
            notification.classList.remove("show");
          }, 3000);
        }

        function updateReciboStatus() {
          const valorPreenchido = valorInput.value.trim() !== "";
          const descricaoPreenchida =
            document.getElementById("descricao-recibo").innerHTML.trim() !== "";
          const emitentePreenchido = emitenteNomeInput.value.trim() !== "";
          const recebedorPreenchido = recebedorNomeInput.value.trim() !== "";

          if (
            valorPreenchido &&
            descricaoPreenchida &&
            emitentePreenchido &&
            recebedorPreenchido
          ) {
            reciboStatus.innerHTML =
              '<i class="fas fa-check-circle"></i><span>Pronto para exportar</span>';
          } else {
            reciboStatus.innerHTML =
              '<i class="fas fa-edit"></i><span>Em edição</span>';
          }
        }

        let previewRenderToken = 0;
        let latestPreviewCanvas = null;

        // Gerar preview do recibo
        async function updatePreview() {
          const reciboContainer = document.getElementById("recibo-container");
          const currentToken = ++previewRenderToken;

          reciboContainer.classList.remove("is-image-preview");
          reciboContainer.innerHTML =
            '<div style="padding: 2rem; color: #7d766c; text-align: center;">Atualizando preview do recibo...</div>';

          try {
            const { canvas } = await generateReciboCanvas();

            if (currentToken !== previewRenderToken) {
              return;
            }

            latestPreviewCanvas = canvas;
            const previewImage = document.createElement("img");
            previewImage.className = "recibo-preview-image";
            previewImage.alt = "Preview final do recibo";
            previewImage.src = canvas.toDataURL("image/png");

            reciboContainer.classList.add("is-image-preview");
            reciboContainer.innerHTML = "";
            reciboContainer.appendChild(previewImage);
          } catch (error) {
            console.error("Erro ao atualizar preview do recibo:", error);
            if (currentToken !== previewRenderToken) {
              return;
            }
            latestPreviewCanvas = null;
            reciboContainer.classList.remove("is-image-preview");
            reciboContainer.innerHTML =
              '<div style="padding: 2rem; color: #422e23; text-align: center;">Não foi possível gerar o preview do recibo.</div>';
          }
        }

        // Função para converter número por extenso
        function numeroParaExtenso(valor) {
          const valorNumerico =
            parseFloat(valor.replace(/[^\d,]/g, "").replace(",", ".")) || 0;
          if (valorNumerico === 0) return "Zero reais";

          const unidades = [
            "",
            "um",
            "dois",
            "três",
            "quatro",
            "cinco",
            "seis",
            "sete",
            "oito",
            "nove",
          ];
          const especiais = [
            "dez",
            "onze",
            "doze",
            "treze",
            "quatorze",
            "quinze",
            "dezesseis",
            "dezessete",
            "dezoito",
            "dezenove",
          ];
          const dezenas = [
            "",
            "",
            "vinte",
            "trinta",
            "quarenta",
            "cinquenta",
            "sessenta",
            "setenta",
            "oitenta",
            "noventa",
          ];
          const centenas = [
            "",
            "cento",
            "duzentos",
            "trezentos",
            "quatrocentos",
            "quinhentos",
            "seiscentos",
            "setecentos",
            "oitocentos",
            "novecentos",
          ];

          function converterNumero(num) {
            if (num === 0) return "";
            if (num < 10) return unidades[num];
            if (num < 20) return especiais[num - 10];
            if (num < 100) {
              const d = Math.floor(num / 10);
              const u = num % 10;
              return dezenas[d] + (u > 0 ? " e " + unidades[u] : "");
            }
            if (num < 1000) {
              const c = Math.floor(num / 100);
              const resto = num % 100;
              if (num === 100) return "cem";
              return (
                centenas[c] + (resto > 0 ? " e " + converterNumero(resto) : "")
              );
            }
            return "mil";
          }

          const inteiro = Math.floor(valorNumerico);
          const centavos = Math.round((valorNumerico - inteiro) * 100);

          let extenso =
            converterNumero(inteiro) + " real" + (inteiro !== 1 ? "es" : "");
          if (centavos > 0) {
            extenso +=
              " e " +
              converterNumero(centavos) +
              " centavo" +
              (centavos !== 1 ? "s" : "");
          }

          return extenso.charAt(0).toUpperCase() + extenso.slice(1);
        }

        // Event Listeners
        btnHelp.addEventListener("click", () => {
          helpModal.classList.add("show");
        });

        modalClose.addEventListener("click", () => {
          helpModal.classList.remove("show");
        });

        helpModal.addEventListener("click", (e) => {
          if (e.target === helpModal) {
            helpModal.classList.remove("show");
          }
        });

        btnAtualizarPreview.addEventListener("click", updatePreview);

        btnLimpar.addEventListener("click", function () {
          if (
            confirm("Tem certeza que deseja limpar todos os dados do recibo?")
          ) {
            clearRecibosStorage();
            inputs.forEach((input) => {
              if (input.getAttribute("contenteditable")) {
                input.innerHTML = "";
              } else {
                input.value = "";
              }
            });

            dataInput.value = hoje;
            horaInput.value = `${hora}:${minutos}`;
            gerarNumeroRecibo();
            updatePreview();
            updateReciboStatus();
            showNotification("Todos os dados foram limpos!");
          }
        });

        function getDescricaoTexto() {
          const descricaoEl = document.getElementById("descricao-recibo");
          const html = descricaoEl.innerHTML || "";
          const withBreaks = html
            .replace(/<\s*br\s*\/?\s*>/gi, "\n")
            .replace(/<\s*\/p\s*>/gi, "\n")
            .replace(/<\s*\/div\s*>/gi, "\n");

          const temp = document.createElement("div");
          temp.innerHTML = withBreaks;
          return (temp.textContent || temp.innerText || "")
            .replace(/\u00a0/g, " ")
            .replace(/\n{3,}/g, "\n\n")
            .trim();
        }

        function getReciboData() {
          const data = dataInput.value
            ? dataInput.value.split("-").reverse().join("/")
            : "NÃO INFORMADA";
          const formaPagamento =
            document.getElementById("forma-pagamento").value || "NÃO INFORMADA";
          const formasPagamento = {
            dinheiro: "Dinheiro",
            cartao_credito: "Cartão de Crédito",
            cartao_debito: "Cartão de Débito",
            transferencia: "Transferência Bancária",
            pix: "PIX",
            cheque: "Cheque",
          };

          return {
            numero: numeroReciboInput.value || "NÃO INFORMADO",
            data,
            hora: horaInput.value || "",
            referencia:
              document.getElementById("referencia").value || "NÃO INFORMADO",
            descricao: getDescricaoTexto() || "NÃO INFORMADA",
            valor: valorInput.value || "0,00",
            valorExtenso: numeroParaExtenso(valorInput.value || "0,00"),
            formaPagamento: formasPagamento[formaPagamento] || formaPagamento,
            emitenteNome: emitenteNomeInput.value || "NÃO INFORMADO",
            emitenteRegistro:
              document.getElementById("emitente-registro").value ||
              "NÃO INFORMADO",
            recebedorNome: recebedorNomeInput.value || "NÃO INFORMADO",
            documentoNumero:
              document.getElementById("documento-numero").value ||
              "NÃO INFORMADO",
            telefone:
              document.getElementById("recebedor-telefone").value ||
              "NÃO INFORMADO",
          };
        }

        function roundedRect(ctx, x, y, width, height, radius) {
          const r = Math.min(radius, width / 2, height / 2);
          ctx.beginPath();
          ctx.moveTo(x + r, y);
          ctx.arcTo(x + width, y, x + width, y + height, r);
          ctx.arcTo(x + width, y + height, x, y + height, r);
          ctx.arcTo(x, y + height, x, y, r);
          ctx.arcTo(x, y, x + width, y, r);
          ctx.closePath();
        }

        function wrapText(ctx, text, maxWidth) {
          const paragraphs = String(text || "").split(/\n/);
          const lines = [];
          paragraphs.forEach((paragraph, idx) => {
            const words = paragraph.trim() ? paragraph.split(/\s+/) : [""];
            let line = "";
            words.forEach((word) => {
              const testLine = line ? `${line} ${word}` : word;
              if (ctx.measureText(testLine).width > maxWidth && line) {
                lines.push(line);
                line = word;
              } else {
                line = testLine;
              }
            });
            lines.push(line);
            if (idx < paragraphs.length - 1) lines.push("");
          });
          return lines;
        }

        function drawLabelValue(ctx, x, y, width, label, value, options = {}) {
          const labelFont = options.labelFont || "24px Georgia";
          const valueFont = options.valueFont || "bold 28px Georgia";
          const labelColor = options.labelColor || "#7d766c";
          const valueColor = options.valueColor || "#422e23";
          const borderColor = options.borderColor || "#d4c6b5";
          const valueTop = options.valueTop || 54;

          ctx.font = labelFont;
          ctx.fillStyle = labelColor;
          ctx.fillText(label, x, y);

          ctx.font = valueFont;
          ctx.fillStyle = valueColor;
          ctx.fillText(value, x, y + valueTop);

          ctx.strokeStyle = borderColor;
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 4]);
          ctx.beginPath();
          ctx.moveTo(x, y + valueTop + 16);
          ctx.lineTo(x + width, y + valueTop + 16);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        function loadImage(src) {
          return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
          });
        }

        async function generateReciboCanvas() {
          const data = getReciboData();
          const width = 1240;
          const margin = 90;
          const contentWidth = width - margin * 2;
          const descriptionBoxWidth = contentWidth;
          const descFont = "28px Georgia";

          const measureCanvas = document.createElement("canvas");
          const measureCtx = measureCanvas.getContext("2d");
          measureCtx.font = descFont;
          const descLines = wrapText(
            measureCtx,
            data.descricao,
            descriptionBoxWidth - 80,
          );
          const descLineHeight = 38;
          const descHeight = Math.max(
            180,
            70 + descLines.length * descLineHeight,
          );
          const height = Math.max(1754, 1310 + descHeight);

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");

          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, width, height);
          ctx.textBaseline = "top";

          const colors = {
            primary: "#400f00",
            dark: "#422e23",
            gray: "#7d766c",
            border: "#d4c6b5",
            light: "#faf6ec",
          };

          try {
            const logo = await loadImage("imagens/logo.png");
            ctx.drawImage(logo, 250, 60, 80, 80);
          } catch (error) {
            console.warn("Logo não carregou para exportação:", error);
          }

          ctx.fillStyle = colors.primary;
          ctx.font = "bold 34px Georgia";
          ctx.textAlign = "center";
          ctx.fillText("Hospital São Rafael", width / 2 + 60, 62);
          ctx.fillStyle = colors.gray;
          ctx.font = "20px Georgia";
          ctx.textAlign = "left";

          ctx.fillStyle = colors.dark;
          ctx.font = "bold 21px Georgia";
          ctx.fillText("Recibo nº:", margin, 208);
          ctx.font = "20px Georgia";
          ctx.fillText(data.numero, margin + 130, 208);

          ctx.font = "bold 21px Georgia";
          const dataLabel = "Data:";
          const dataValor = `${data.data}${data.hora ? ` às ${data.hora}` : ""}`;
          const dataValorWidth = ctx.measureText(dataValor).width;
          const dataLabelWidth = ctx.measureText(dataLabel).width;
          const rightX = width - margin - dataValorWidth - dataLabelWidth - 12;
          ctx.fillText(dataLabel, rightX, 208);
          ctx.font = "20px Georgia";
          ctx.fillText(dataValor, rightX + dataLabelWidth + 12, 208);

          ctx.strokeStyle = colors.primary;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(margin, 280);
          ctx.lineTo(width - margin, 280);
          ctx.stroke();
          ctx.strokeStyle = colors.border;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(margin, 284);
          ctx.lineTo(width - margin, 284);
          ctx.stroke();

          let y = 350;

          function drawSectionTitle(text) {
            ctx.fillStyle = colors.primary;
            ctx.font = "bold 24px Georgia";
            ctx.fillText(text, margin, y);
            ctx.strokeStyle = colors.border;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(margin, y + 54);
            ctx.lineTo(width - margin, y + 54);
            ctx.stroke();
            y += 78;
          }

          drawSectionTitle("RECIBO DE SERVIÇOS MÉDICOS");

          roundedRect(ctx, margin, y, contentWidth, 240, 14);
          ctx.fillStyle = colors.light;
          ctx.fill();
          ctx.strokeStyle = colors.primary;
          ctx.lineWidth = 3;
          ctx.stroke();

          ctx.textAlign = "center";
          ctx.fillStyle = colors.gray;
          ctx.font = "bold 20px Georgia";
          ctx.fillText("VALOR TOTAL", width / 2, y + 62);
          ctx.fillStyle = colors.primary;
          ctx.font = "bold 46px Georgia";
          ctx.fillText(`R$ ${data.valor}`, width / 2, y + 118);
          ctx.fillStyle = colors.dark;
          ctx.font = "italic 21px Georgia";
          ctx.fillText(data.valorExtenso, width / 2, y + 190);
          ctx.textAlign = "left";
          y += 290;

          const colGap = 24;
          const colWidth = (contentWidth - colGap) / 2;
          drawLabelValue(
            ctx,
            margin,
            y,
            colWidth,
            "Referência:",
            data.referencia,
            { valueFont: "28px Georgia" },
          );
          drawLabelValue(
            ctx,
            margin + colWidth + colGap,
            y,
            colWidth,
            "Forma de Pagamento:",
            data.formaPagamento,
            { valueFont: "28px Georgia" },
          );
          y += 130;

          drawSectionTitle("DESCRIÇÃO DOS SERVIÇOS");

          roundedRect(ctx, margin, y, contentWidth, descHeight, 6);
          ctx.fillStyle = "#ffffff";
          ctx.fill();
          ctx.strokeStyle = colors.border;
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.fillStyle = colors.dark;
          ctx.font = descFont;
          let lineY = y + 42;
          descLines.forEach((line) => {
            ctx.fillText(line || " ", margin + 40, lineY);
            lineY += descLineHeight;
          });
          y += descHeight + 70;

          drawSectionTitle("PROFISSIONAL EMITENTE");
          drawLabelValue(ctx, margin, y, colWidth, "Nome:", data.emitenteNome, {
            valueFont: "32px Georgia",
          });
          drawLabelValue(
            ctx,
            margin + colWidth + colGap,
            y,
            colWidth,
            "Registro:",
            `CRM ${data.emitenteRegistro}`,
            { valueFont: "28px Georgia" },
          );
          y += 130;

          drawSectionTitle("DADOS DO RECEBEDOR");
          const colGap3 = 22;
          const colWidth3 = (contentWidth - colGap3 * 2) / 3;
          drawLabelValue(
            ctx,
            margin,
            y,
            colWidth3,
            "Nome:",
            data.recebedorNome,
            { valueFont: "28px Georgia" },
          );
          drawLabelValue(
            ctx,
            margin + colWidth3 + colGap3,
            y,
            colWidth3,
            "Documento:",
            data.documentoNumero,
            { valueFont: "28px Georgia" },
          );
          drawLabelValue(
            ctx,
            margin + (colWidth3 + colGap3) * 2,
            y,
            colWidth3,
            "Telefone:",
            data.telefone,
            { valueFont: "28px Georgia" },
          );
          y += 180;

          ctx.strokeStyle = colors.border;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(margin, y);
          ctx.lineTo(width - margin, y);
          ctx.stroke();

          ctx.textAlign = "center";
          ctx.fillStyle = colors.gray;
          ctx.font = "bold 20px Georgia";
          ctx.fillText("Hospital São Rafael", width / 2, y + 36);
          ctx.font = "20px Georgia";
          ctx.fillText(
            "Documento emitido eletronicamente - Sistema de Recibos Digitais",
            width / 2,
            y + 74,
          );
          ctx.fillStyle = colors.primary;
          ctx.font = "italic 20px Georgia";
          ctx.fillText(
            "Este recibo comprova a prestação de serviços médicos e o respectivo recebimento.",
            width / 2,
            y + 118,
          );
          ctx.textAlign = "left";

          return { canvas, data };
        }

        async function downloadCanvasAsPng(canvas, filename) {
          return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
              if (!blob) {
                reject(new Error("Não foi possível gerar o arquivo PNG."));
                return;
              }
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = filename;
              document.body.appendChild(link);
              link.click();
              link.remove();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
              resolve();
            }, "image/png");
          });
        }

        // Exportar como PNG
        btnExportPNG.addEventListener("click", async function () {
          const valor = valorInput.value.trim();
          const descricao = getDescricaoTexto();
          const emitente = emitenteNomeInput.value.trim();
          const recebedor = recebedorNomeInput.value.trim();

          if (!valor || valor === "0,00") {
            showNotification("Informe o valor do recibo!", "error");
            return;
          }

          if (!descricao) {
            showNotification("Descreva os serviços prestados!", "error");
            return;
          }

          if (!emitente) {
            showNotification(
              "Informe o nome do profissional emitente!",
              "error",
            );
            return;
          }

          if (!recebedor) {
            showNotification("Informe o nome do recebedor!", "error");
            return;
          }

          updatePreview();
          showNotification("Gerando imagem do recibo...");

          try {
            const data = getReciboData();
            const previewValido =
              latestPreviewCanvas &&
              document.querySelector("#recibo-container .recibo-preview-image");
            const canvas = previewValido
              ? latestPreviewCanvas
              : (await generateReciboCanvas()).canvas;

            const recebedorSeguro = (data.recebedorNome || "recebedor").replace(
              /[^a-zA-Z0-9_-]+/g,
              "_",
            );
            await downloadCanvasAsPng(
              canvas,
              `Recibo_${data.numero}_${recebedorSeguro}.png`,
            );
            showNotification("Recibo exportado com sucesso!");
          } catch (error) {
            console.error("Erro ao exportar:", error);
            showNotification("Erro ao exportar o recibo.", "error");
          }
        });

        // Inicializar
        updatePreview();
        updateReciboStatus();
        setAutoSaveState("saved");

        setTimeout(() => {
          showNotification(
            "Sistema de Recibos Digital carregado. Os dados são auto-salvos automaticamente!",
          );
        }, 1000);
      });
