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
          const descricaoPreenchida = getDescricaoTexto().trim() !== "";
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

          if ("value" in descricaoEl) {
            return descricaoEl.value.replace(/\r\n/g, "\n");
          }

          const html = descricaoEl.innerHTML || "";
          const withBreaks = html
            .replace(/<\s*br\s*\/?\s*>/gi, "\n")
            .replace(/<\s*\/p\s*>/gi, "\n")
            .replace(/<\s*\/div\s*>/gi, "\n");

          const temp = document.createElement("div");
          temp.innerHTML = withBreaks;
          return (temp.textContent || temp.innerText || "")
            .replace(/\u00a0/g, " ")
            .replace(/\r\n/g, "\n");
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

          const descricaoTexto = getDescricaoTexto();

          return {
            numero: numeroReciboInput.value || "NÃO INFORMADO",
            data,
            hora: horaInput.value || "",
            referencia:
              document.getElementById("referencia").value || "NÃO INFORMADO",
            descricao: descricaoTexto.trim() ? descricaoTexto : "NÃO INFORMADA",
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
          const paragraphs = String(text || "").replace(/\r\n/g, "\n").split(/\n/);
          const lines = [];

          paragraphs.forEach((paragraph) => {
            if (paragraph === "") {
              lines.push("");
              return;
            }

            const tokens = paragraph.match(/\S+|\s+/g) || [""];
            let line = "";

            tokens.forEach((token) => {
              const testLine = line + token;

              if (ctx.measureText(testLine).width <= maxWidth || !line) {
                line = testLine;
                return;
              }

              lines.push(line.replace(/[ \t]+$/g, ""));
              line = token.replace(/^[ \t]+/g, "");

              while (ctx.measureText(line).width > maxWidth && line.length > 1) {
                let cut = line.length;
                while (cut > 1 && ctx.measureText(line.slice(0, cut)).width > maxWidth) {
                  cut--;
                }
                lines.push(line.slice(0, cut));
                line = line.slice(cut);
              }
            });

            lines.push(line.replace(/[ \t]+$/g, ""));
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
          const pageHeight = 1754;
          const margin = 90;
          const contentWidth = width - margin * 2;

          const colors = {
            primary: "#400f00",
            dark: "#422e23",
            gray: "#7d766c",
            border: "#d4c6b5",
            light: "#faf6ec",
          };

          let logo = null;
          try {
            logo = await loadImage("imagens/logo.png");
          } catch (error) {
            console.warn("Logo não carregou para exportação:", error);
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = pageHeight;
          const ctx = canvas.getContext("2d");
          ctx.textBaseline = "top";

          function fitTextToWidth(text, maxWidth, baseFont, minSize = 18) {
            const family = baseFont.includes("Georgia") ? "Georgia" : "Arial";
            const isBold = baseFont.includes("bold");
            const isItalic = baseFont.includes("italic");
            let sizeMatch = baseFont.match(/(\d+)px/);
            let size = sizeMatch ? Number(sizeMatch[1]) : 28;
            const prefix = `${isItalic ? "italic " : ""}${isBold ? "bold " : ""}`;

            while (size > minSize) {
              ctx.font = `${prefix}${size}px ${family}`;
              if (ctx.measureText(text).width <= maxWidth) break;
              size -= 1;
            }

            return `${prefix}${size}px ${family}`;
          }

          function drawTextLine(text, x, y, maxWidth, baseFont, fillStyle = colors.dark, align = "left") {
            ctx.font = fitTextToWidth(String(text || ""), maxWidth, baseFont);
            ctx.fillStyle = fillStyle;
            ctx.textAlign = align;
            ctx.fillText(String(text || ""), x, y);
          }

          function drawPageBase() {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, width, pageHeight);

            if (logo) {
              ctx.drawImage(logo, 250, 50, 74, 74);
            }

            ctx.fillStyle = colors.primary;
            ctx.font = "bold 32px Georgia";
            ctx.textAlign = "center";
            ctx.fillText("Hospital São Rafael", width / 2 + 60, 58);

            ctx.fillStyle = colors.dark;
            ctx.font = "bold 20px Georgia";
            ctx.textAlign = "left";
            ctx.fillText("Recibo nº:", margin, 188);
            ctx.font = "19px Georgia";
            ctx.fillText(data.numero, margin + 120, 188);

            ctx.font = "bold 20px Georgia";
            const dataLabel = "Data:";
            const dataValor = `${data.data}${data.hora ? ` às ${data.hora}` : ""}`;
            const dataValorWidth = ctx.measureText(dataValor).width;
            const dataLabelWidth = ctx.measureText(dataLabel).width;
            const rightX = width - margin - dataValorWidth - dataLabelWidth - 12;
            ctx.fillText(dataLabel, rightX, 188);
            ctx.font = "19px Georgia";
            ctx.fillText(dataValor, rightX + dataLabelWidth + 12, 188);

            ctx.strokeStyle = colors.primary;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(margin, 252);
            ctx.lineTo(width - margin, 252);
            ctx.stroke();
            ctx.strokeStyle = colors.border;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(margin, 256);
            ctx.lineTo(width - margin, 256);
            ctx.stroke();
          }

          function drawSectionTitle(text, y) {
            ctx.fillStyle = colors.primary;
            ctx.font = "bold 22px Georgia";
            ctx.textAlign = "left";
            ctx.fillText(text, margin, y);
            ctx.strokeStyle = colors.border;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(margin, y + 46);
            ctx.lineTo(width - margin, y + 46);
            ctx.stroke();
            return y + 66;
          }

          function drawCompactLabelValue(x, y, boxWidth, label, value, options = {}) {
            const labelFont = options.labelFont || "20px Georgia";
            const valueFont = options.valueFont || "bold 23px Georgia";
            const valueTop = options.valueTop || 36;

            ctx.font = labelFont;
            ctx.fillStyle = colors.gray;
            ctx.textAlign = "left";
            ctx.fillText(label, x, y);

            drawTextLine(value, x, y + valueTop, boxWidth, valueFont, colors.dark, "left");

            ctx.strokeStyle = colors.border;
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 4]);
            ctx.beginPath();
            ctx.moveTo(x, y + valueTop + 28);
            ctx.lineTo(x + boxWidth, y + valueTop + 28);
            ctx.stroke();
            ctx.setLineDash([]);
          }

          function calculateDescriptionFit(text, maxWidth, maxHeight) {
            const measureCanvas = document.createElement("canvas");
            const measureCtx = measureCanvas.getContext("2d");
            const paddingX = 34;
            const paddingY = 28;
            const innerWidth = maxWidth - paddingX * 2;
            const availableTextHeight = maxHeight - paddingY * 2;

            for (let fontSize = 28; fontSize >= 7; fontSize -= 1) {
              const lineHeight = Math.max(10, Math.ceil(fontSize * 1.32));
              measureCtx.font = `${fontSize}px Georgia`;
              const lines = wrapText(measureCtx, text, innerWidth);

              if (lines.length * lineHeight <= availableTextHeight) {
                return { fontSize, lineHeight, paddingX, paddingY, lines, overflowScaleY: 1 };
              }
            }

            measureCtx.font = "7px Georgia";
            const lines = wrapText(measureCtx, text, innerWidth);
            const lineHeight = 10;
            return {
              fontSize: 7,
              lineHeight,
              paddingX,
              paddingY,
              lines,
              overflowScaleY: Math.min(1, availableTextHeight / Math.max(lineHeight, lines.length * lineHeight)),
            };
          }

          function drawDescriptionBox(y, height, fit) {
            roundedRect(ctx, margin, y, contentWidth, height, 6);
            ctx.fillStyle = "#ffffff";
            ctx.fill();
            ctx.strokeStyle = colors.border;
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = colors.dark;
            ctx.font = `${fit.fontSize}px Georgia`;
            ctx.textAlign = "left";

            const textX = margin + fit.paddingX;
            const textY = y + fit.paddingY;
            const scaleY = fit.overflowScaleY || 1;

            ctx.save();
            roundedRect(ctx, margin + 2, y + 2, contentWidth - 4, height - 4, 4);
            ctx.clip();
            ctx.translate(0, textY);
            ctx.scale(1, scaleY);

            fit.lines.forEach((line, index) => {
              ctx.fillText(line || " ", textX, index * fit.lineHeight);
            });

            ctx.restore();
          }

          function drawFooter() {
            const y = pageHeight - 142;
            ctx.strokeStyle = colors.border;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(margin, y);
            ctx.lineTo(width - margin, y);
            ctx.stroke();

            ctx.textAlign = "center";
            ctx.fillStyle = colors.gray;
            ctx.font = "bold 18px Georgia";
            ctx.fillText("Hospital São Rafael", width / 2, y + 24);
            ctx.font = "18px Georgia";
            ctx.fillText("Documento emitido eletronicamente - Sistema de Recibos Digitais", width / 2, y + 58);
            ctx.fillStyle = colors.primary;
            ctx.font = "italic 18px Georgia";
            ctx.fillText("Este recibo comprova a prestação de serviços médicos e o respectivo recebimento.", width / 2, y + 96);
            ctx.textAlign = "left";
          }

          drawPageBase();

          let y = 318;
          y = drawSectionTitle("RECIBO DE SERVIÇOS MÉDICOS", y);

          // Área do valor reduzida para liberar mais espaço à descrição detalhada.
          roundedRect(ctx, margin, y, contentWidth, 156, 14);
          ctx.fillStyle = colors.light;
          ctx.fill();
          ctx.strokeStyle = colors.primary;
          ctx.lineWidth = 3;
          ctx.stroke();

          ctx.textAlign = "center";
          ctx.fillStyle = colors.gray;
          ctx.font = "bold 18px Georgia";
          ctx.fillText("VALOR TOTAL", width / 2, y + 30);
          ctx.fillStyle = colors.primary;
          ctx.font = fitTextToWidth(`R$ ${data.valor}`, contentWidth - 140, "bold 40px Georgia", 24);
          ctx.fillText(`R$ ${data.valor}`, width / 2, y + 68);
          ctx.fillStyle = colors.dark;
          ctx.font = fitTextToWidth(data.valorExtenso, contentWidth - 140, "italic 18px Georgia", 13);
          ctx.fillText(data.valorExtenso, width / 2, y + 118);
          ctx.textAlign = "left";
          y += 192;

          const colGap = 24;
          const colWidth = (contentWidth - colGap) / 2;
          drawCompactLabelValue(margin, y, colWidth, "Referência:", data.referencia, { valueFont: "23px Georgia" });
          drawCompactLabelValue(margin + colWidth + colGap, y, colWidth, "Forma de Pagamento:", data.formaPagamento, { valueFont: "23px Georgia" });
          y += 96;

          y = drawSectionTitle("DESCRIÇÃO DOS SERVIÇOS", y);

          const finalSectionsHeight = 330;
          const footerReserve = 180;
          const descTop = y;
          const descBottom = pageHeight - footerReserve - finalSectionsHeight;
          const descHeight = Math.max(250, descBottom - descTop);
          const descFit = calculateDescriptionFit(data.descricao, contentWidth, descHeight);
          drawDescriptionBox(descTop, descHeight, descFit);

          y = descTop + descHeight + 36;

          y = drawSectionTitle("PROFISSIONAL EMITENTE", y);
          drawCompactLabelValue(margin, y, colWidth, "Nome:", data.emitenteNome, { valueFont: "25px Georgia" });
          drawCompactLabelValue(margin + colWidth + colGap, y, colWidth, "Registro:", `CRM ${data.emitenteRegistro}`, { valueFont: "23px Georgia" });
          y += 98;

          y = drawSectionTitle("DADOS DO RECEBEDOR", y);
          const colGap3 = 22;
          const colWidth3 = (contentWidth - colGap3 * 2) / 3;
          drawCompactLabelValue(margin, y, colWidth3, "Nome:", data.recebedorNome, { valueFont: "22px Georgia" });
          drawCompactLabelValue(margin + colWidth3 + colGap3, y, colWidth3, "Documento:", data.documentoNumero, { valueFont: "22px Georgia" });
          drawCompactLabelValue(margin + (colWidth3 + colGap3) * 2, y, colWidth3, "Telefone:", data.telefone, { valueFont: "22px Georgia" });

          drawFooter();

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

          if (!descricao.trim()) {
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
