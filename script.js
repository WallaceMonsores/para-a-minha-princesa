"use strict";

// ===============================
// CONFIGURACOES PRINCIPAIS
// ===============================
const dataInicioRelacionamento = "2023-06-27";

const mensagemParaEsposa = {
  titulo: "Para o amor da minha vida",
  paragrafos: [
    "Meu amor, cada dia ao seu lado transforma o comum em especial e faz meu mundo ficar mais leve.",
    "Obrigado por dividir sonhos, desafios, risadas e carinho comigo. Voce e minha melhor escolha, todos os dias.",
    "Que essa linha do tempo continue crescendo com mais viagens, conquistas, abracos apertados e muito amor."
  ]
};

const eventosBase = [
  {
    data: "2023-06-27",
    titulo: "Nosso comeco",
    descricao: "O dia em que tudo mudou.",
    imagem: "assets/1.jpg",
    video: ""
  },
];

const STORAGE_KEY = "timeline_eventos_niver_namoro_v1";
const SCREEN_IDS = ["screen-home", "screen-message", "screen-timeline"];

// ===============================
// ELEMENTOS DA PAGINA
// ===============================
const screenElements = Object.fromEntries(
  SCREEN_IDS.map((id) => [id, document.getElementById(id)])
);

const yearsEl = document.getElementById("years");
const monthsEl = document.getElementById("months");
const daysEl = document.getElementById("days");

const messageTitleEl = document.getElementById("message-title");
const messageBodyEl = document.getElementById("message-body");

const timelineListEl = document.getElementById("timeline-list");

const openModalBtn = document.getElementById("open-modal-btn");
const modalEl = document.getElementById("event-modal");
const eventForm = document.getElementById("event-form");
const modalTitleEl = document.getElementById("modal-title");
const submitEventBtn = document.getElementById("submit-event-btn");

let eventos = carregarEventos();
let timelineObserver = null;
let editingIndex = null;

// ===============================
// INICIALIZACAO
// ===============================
iniciar();

function iniciar() {
  renderizarMensagem();
  atualizarContador();
  renderizarTimeline();

  document.querySelectorAll("[data-go]").forEach((btn) => {
    btn.addEventListener("click", () => trocarTela(btn.dataset.go));
  });

  openModalBtn.addEventListener("click", abrirModal);

  modalEl.addEventListener("click", (event) => {
    if (event.target.matches("[data-close-modal='true']")) fecharModal();
  });

  timelineListEl.addEventListener("click", onClickTimeline);

  eventForm.addEventListener("submit", onSubmitNovoEvento);

  // Atualiza periodicamente para manter anos/meses/dias corretos quando virar o dia.
  setInterval(atualizarContador, 60 * 1000);
}

// ===============================
// CONTROLE DE TELAS (SPA SIMPLES)
// ===============================
function trocarTela(targetId) {
  const target = screenElements[targetId];
  if (!target) return;

  Object.values(screenElements).forEach((screen) => {
    screen.classList.remove("active");
  });

  target.classList.add("active");

  if (targetId === "screen-timeline") {
    reiniciarAnimacaoTimeline();
  }
}

// ===============================
// MENSAGEM ROMANTICA
// ===============================
function renderizarMensagem() {
  messageTitleEl.textContent = mensagemParaEsposa.titulo;

  messageBodyEl.innerHTML = "";
  mensagemParaEsposa.paragrafos.forEach((texto) => {
    const p = document.createElement("p");
    p.textContent = texto;
    messageBodyEl.appendChild(p);
  });
}

// ===============================
// CONTADOR PRECISO (ANOS/MESES/DIAS)
// ===============================
function atualizarContador() {
  const inicio = parseISODateUTC(dataInicioRelacionamento);
  const hoje = dataUTC(new Date());

  if (!inicio || inicio > hoje) {
    yearsEl.textContent = "0";
    monthsEl.textContent = "0";
    daysEl.textContent = "0";
    return;
  }

  const diff = calcularDiferencaPrecisao(inicio, hoje);
  yearsEl.textContent = String(diff.anos);
  monthsEl.textContent = String(diff.meses);
  daysEl.textContent = String(diff.dias);
}

function calcularDiferencaPrecisao(inicio, fim) {
  let cursor = new Date(inicio.getTime());
  let anos = 0;
  let meses = 0;

  while (true) {
    const proxAno = addYearsUTC(cursor, 1);
    if (proxAno <= fim) {
      cursor = proxAno;
      anos += 1;
    } else {
      break;
    }
  }

  while (true) {
    const proxMes = addMonthsUTC(cursor, 1);
    if (proxMes <= fim) {
      cursor = proxMes;
      meses += 1;
    } else {
      break;
    }
  }

  const dias = Math.floor((fim.getTime() - cursor.getTime()) / 86400000);

  return { anos, meses, dias };
}

function addYearsUTC(date, yearsToAdd) {
  return addMonthsUTC(date, yearsToAdd * 12);
}

function addMonthsUTC(date, monthsToAdd) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();

  const totalMonths = month + monthsToAdd;
  const targetYear = year + Math.floor(totalMonths / 12);
  const targetMonth = ((totalMonths % 12) + 12) % 12;
  const maxDay = diasNoMesUTC(targetYear, targetMonth);
  const targetDay = Math.min(day, maxDay);

  return new Date(Date.UTC(targetYear, targetMonth, targetDay));
}

function diasNoMesUTC(year, monthIndexZeroBased) {
  return new Date(Date.UTC(year, monthIndexZeroBased + 1, 0)).getUTCDate();
}

function parseISODateUTC(isoDate) {
  const parts = isoDate.split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;

  const [year, month, day] = parts;
  return new Date(Date.UTC(year, month - 1, day));
}

function dataUTC(date) {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

// ===============================
// TIMELINE
// ===============================
function carregarEventos() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return ordenarEventos([...eventosBase]);

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return ordenarEventos([...eventosBase]);

    const validos = parsed.map(normalizarEvento).filter(isEventoValido);
    return ordenarEventos(validos.length ? validos : [...eventosBase]);
  } catch {
    return ordenarEventos([...eventosBase]);
  }
}

function salvarEventos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(eventos));
}

function isEventoValido(evento) {
  const imagem = typeof evento.imagem === "string" ? evento.imagem.trim() : "";
  const video = typeof evento.video === "string" ? evento.video.trim() : "";

  return Boolean(
    evento &&
      typeof evento.data === "string" &&
      typeof evento.titulo === "string" &&
      typeof evento.descricao === "string" &&
      typeof evento.imagem === "string" &&
      typeof evento.video === "string" &&
      (imagem || video) &&
      parseISODateUTC(evento.data)
  );
}

function normalizarEvento(evento) {
  return {
    data: String(evento?.data || "").trim(),
    titulo: String(evento?.titulo || "").trim(),
    descricao: String(evento?.descricao || "").trim(),
    imagem: String(evento?.imagem || "").trim(),
    video: String(evento?.video || "").trim()
  };
}

function ordenarEventos(lista) {
  return [...lista].sort((a, b) => {
    const da = parseISODateUTC(a.data)?.getTime() || 0;
    const db = parseISODateUTC(b.data)?.getTime() || 0;
    return da - db;
  });
}

function renderizarTimeline() {
  eventos = ordenarEventos(eventos);
  timelineListEl.innerHTML = "";

  if (!eventos.length) {
    const aviso = document.createElement("p");
    aviso.textContent = "Nenhum evento cadastrado ainda.";
    timelineListEl.appendChild(aviso);
    return;
  }

  eventos.forEach((evento, index) => {
    const sideClass = index % 2 === 0 ? "left" : "right";

    const item = document.createElement("article");
    item.className = `timeline-item ${sideClass}`;

    const dataFormatada = formatarDataPtBr(evento.data);
    const midiaHtml = gerarMidiaEvento(evento);

    item.innerHTML = `
      <span class="marker" aria-hidden="true"><i class="fa-solid fa-heart"></i></span>
      <div class="timeline-card">
        ${midiaHtml}
        <div class="timeline-content">
          <p class="timeline-date">${dataFormatada}</p>
          <h3>${escapeHtml(evento.titulo)}</h3>
          <p>${escapeHtml(evento.descricao)}</p>
          <div class="timeline-actions">
            <button class="btn btn-edit" data-edit-index="${index}" type="button">
              <i class="fa-solid fa-pen"></i>
              Editar evento
            </button>
            <button class="btn btn-delete" data-delete-index="${index}" type="button">
              <i class="fa-solid fa-trash"></i>
              Excluir evento
            </button>
          </div>
        </div>
      </div>
    `;

    timelineListEl.appendChild(item);
  });

  ativarAnimacoesTimeline();
}

function onClickTimeline(event) {
  const editBtn = event.target.closest("[data-edit-index]");
  if (editBtn) {
    const index = Number(editBtn.dataset.editIndex);
    if (Number.isNaN(index) || index < 0 || index >= eventos.length) return;
    abrirModalEdicao(index);
    return;
  }

  const deleteBtn = event.target.closest("[data-delete-index]");
  if (!deleteBtn) return;

  const index = Number(deleteBtn.dataset.deleteIndex);
  if (Number.isNaN(index) || index < 0 || index >= eventos.length) return;

  const evento = eventos[index];
  const confirmado = window.confirm(
    `Excluir o evento \"${evento.titulo}\" (${formatarDataPtBr(evento.data)})?`
  );

  if (!confirmado) return;

  eventos.splice(index, 1);
  salvarEventos();
  renderizarTimeline();
}

function formatarDataPtBr(isoDate) {
  const date = parseISODateUTC(isoDate);
  if (!date) return isoDate;

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC"
  }).format(date);
}

function ativarAnimacoesTimeline() {
  if (timelineObserver) timelineObserver.disconnect();

  timelineObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("show");
          timelineObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2 }
  );

  timelineListEl.querySelectorAll(".timeline-item").forEach((item) => {
    timelineObserver.observe(item);
  });
}

function reiniciarAnimacaoTimeline() {
  const items = timelineListEl.querySelectorAll(".timeline-item");
  items.forEach((item) => item.classList.remove("show"));
  ativarAnimacoesTimeline();
}

// ===============================
// MODAL + ADICIONAR EVENTO
// ===============================
function abrirModal() {
  editingIndex = null;
  modalTitleEl.textContent = "Adicionar evento";
  submitEventBtn.textContent = "Salvar evento";
  eventForm.reset();
  modalEl.classList.add("open");
  modalEl.setAttribute("aria-hidden", "false");
}

function fecharModal() {
  editingIndex = null;
  modalEl.classList.remove("open");
  modalEl.setAttribute("aria-hidden", "true");
  eventForm.reset();
  modalTitleEl.textContent = "Adicionar evento";
  submitEventBtn.textContent = "Salvar evento";
}

function abrirModalEdicao(index) {
  const evento = eventos[index];
  if (!evento) return;

  editingIndex = index;
  modalTitleEl.textContent = "Editar evento";
  submitEventBtn.textContent = "Salvar alteracoes";

  eventForm.elements.data.value = evento.data || "";
  eventForm.elements.titulo.value = evento.titulo || "";
  eventForm.elements.descricao.value = evento.descricao || "";
  eventForm.elements.imagem.value = evento.imagem || "";
  eventForm.elements.video.value = evento.video || "";

  modalEl.classList.add("open");
  modalEl.setAttribute("aria-hidden", "false");
}

function onSubmitNovoEvento(event) {
  event.preventDefault();

  const formData = new FormData(eventForm);
  const novoEvento = {
    data: String(formData.get("data") || "").trim(),
    titulo: String(formData.get("titulo") || "").trim(),
    descricao: String(formData.get("descricao") || "").trim(),
    imagem: String(formData.get("imagem") || "").trim(),
    video: String(formData.get("video") || "").trim()
  };

  if (!isEventoValido(novoEvento)) {
    alert("Preencha data, titulo, descricao e ao menos uma midia (imagem ou video).");
    return;
  }

  if (editingIndex !== null) {
    eventos[editingIndex] = novoEvento;
  } else {
    eventos.push(novoEvento);
  }

  eventos = ordenarEventos(eventos);
  salvarEventos();
  renderizarTimeline();
  fecharModal();
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function gerarMidiaEvento(evento) {
  const video = (evento.video || "").trim();
  const imagem = (evento.imagem || "").trim();
  const tituloSeguro = escapeHtml(evento.titulo);

  if (video) {
    return `
      <video controls preload="metadata" playsinline>
        <source src="${escapeHtml(video)}" />
        Seu navegador nao suporta video HTML5.
      </video>
    `;
  }

  return `<img src="${escapeHtml(imagem)}" alt="${tituloSeguro}" loading="lazy" />`;
}

/*
============================================
PERSONALIZACAO RAPIDA
============================================
1) Data de inicio do relacionamento:
   - Edite a constante `dataInicioRelacionamento` no topo deste arquivo.
   - Exemplo: const dataInicioRelacionamento = "2023-06-27";

2) Mensagem para sua esposa:
   - Edite `mensagemParaEsposa.titulo` e os textos dentro de `mensagemParaEsposa.paragrafos`.

3) Adicionar/remover eventos iniciais da linha do tempo:
   - Edite o array `eventosBase`.
   - Cada evento precisa de: data (AAAA-MM-DD), titulo, descricao e pelo menos uma midia.
   - Midia pode ser `imagem` ou `video` (ou os dois).

4) Trocar imagens na pasta assets/:
   - Coloque suas imagens dentro da pasta `assets`.
   - Depois, referencie no evento, por exemplo: "assets/foto-nossa.jpg".

5) Adicionar videos na pasta assets/:
   - Coloque videos (ex.: .mp4) dentro da pasta `assets`.
   - Depois, use no evento: `video: "assets/nosso-video.mp4"`.

6) Eventos adicionados pelo modal:
   - Sao salvos automaticamente no localStorage do navegador.
   - Para resetar, limpe o localStorage do site.

7) Excluir evento:
   - Clique em "Excluir evento" no card da timeline e confirme.
   - A exclusao tambem e salva no localStorage.

8) Editar evento:
   - Clique em "Editar evento" no card da timeline.
   - O modal abre preenchido para voce atualizar os dados.
   - As alteracoes tambem sao salvas no localStorage.
*/
