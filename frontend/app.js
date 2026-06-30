
const API_BASE = window.API_BASE || "http://localhost:5001/api";

const state = {
  contas: [],
  contaSelecionadaId: null,
  operacao: "saque", 
};

const el = {
  status: document.getElementById("api-status"),
  accountsList: document.getElementById("accounts-list"),
  accountsCount: document.getElementById("accounts-count"),
  passbookEmpty: document.getElementById("passbook-empty"),
  passbookContent: document.getElementById("passbook-content"),
  pbTipo: document.getElementById("pb-tipo"),
  pbTitular: document.getElementById("pb-titular"),
  pbId: document.getElementById("pb-id"),
  pbSaldo: document.getElementById("pb-saldo"),
  pbLimite: document.getElementById("pb-limite"),
  opForm: document.getElementById("op-form"),
  opTabs: Array.from(document.querySelectorAll(".op-tab")),
  fieldDestino: document.getElementById("field-destino"),
  opDestino: document.getElementById("op-destino"),
  opValor: document.getElementById("op-valor"),
  opSubmit: document.getElementById("op-submit"),
  opSubmitLabel: document.getElementById("op-submit-label"),
  opFeedback: document.getElementById("op-feedback"),
  entriesList: document.getElementById("entries-list"),
  entriesCount: document.getElementById("entries-count"),
  stamp: document.getElementById("stamp"),
  stampText: document.getElementById("stamp-text"),
};

const formatBRL = (valor) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatHora = (iso) => {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
};

const ENTRY_LABELS = {
  saque: { icon: "−", desc: "Saque" },
  transferencia_saida: { icon: "↗", desc: "Transferência enviada" },
  transferencia_entrada: { icon: "↙", desc: "Transferência recebida" },
};


async function api(path, options) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.erro || "Erro inesperado ao falar com o banco.");
  }
  return data;
}

async function carregarContas() {
  state.contas = await api("/contas");
}

async function carregarExtrato(contaId) {
  return api(`/contas/${contaId}/extrato`);
}


function setStatus(online) {
  el.status.classList.toggle("online", online);
  el.status.classList.toggle("offline", !online);
  el.status.innerHTML = online
    ? `<span class="dot"></span> conectado ao banco`
    : `<span class="dot"></span> sem conexão com a API`;
}


function renderAccountsList() {
  el.accountsCount.textContent = `(${state.contas.length})`;

  if (state.contas.length === 0) {
    el.accountsList.innerHTML = `<p class="muted">Nenhuma conta cadastrada.</p>`;
    return;
  }

  el.accountsList.innerHTML = "";
  for (const conta of state.contas) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "account-card" + (conta.id === state.contaSelecionadaId ? " active" : "");
    btn.dataset.id = conta.id;

    const negativo = conta.saldo < 0;
    btn.innerHTML = `
      <span class="card-name">${conta.titular}</span>
      <span class="card-meta">
        <span class="card-type">${conta.tipo}</span>
        <span class="card-balance ${negativo ? "negative" : ""}">${formatBRL(conta.saldo)}</span>
      </span>
    `;
    btn.addEventListener("click", () => selecionarConta(conta.id));
    el.accountsList.appendChild(btn);
  }
}


function preencherSelectDestino() {
  const outras = state.contas.filter((c) => c.id !== state.contaSelecionadaId);
  el.opDestino.innerHTML = outras
    .map((c) => `<option value="${c.id}">${c.titular} · ${c.id}</option>`)
    .join("");
}

function renderPassbookHead(conta) {
  el.pbTipo.textContent = conta.tipo === "corrente" ? "Conta corrente" : "Conta poupança";
  el.pbTitular.textContent = conta.titular;
  el.pbId.textContent = conta.id;

  el.pbSaldo.textContent = formatBRL(conta.saldo);
  el.pbSaldo.classList.toggle("negative", conta.saldo < 0);

  el.pbLimite.textContent = conta.cobra_tarifa
    ? `tarifa de R$ 1,00 por operação · cheque especial até ${formatBRL(conta.limite_negativo)} negativos`
    : `sem tarifa · saldo não pode ficar negativo`;
}

function renderEntries(lancamentos) {
  el.entriesCount.textContent = lancamentos.length
    ? `${lancamentos.length} registro${lancamentos.length > 1 ? "s" : ""}`
    : "";

  if (lancamentos.length === 0) {
    el.entriesList.innerHTML = `<li class="muted entry-empty">Nenhum lançamento ainda.</li>`;
    return;
  }

  el.entriesList.innerHTML = lancamentos
    .map((l) => {
      const meta = ENTRY_LABELS[l.tipo] || { icon: "•", desc: l.tipo };
      const saiu = l.tipo !== "transferencia_entrada";
      const sinal = saiu ? "−" : "+";
      const tarifaTxt = l.tarifa > 0 ? ` (+ tarifa ${formatBRL(l.tarifa)})` : "";
      return `
        <li class="entry">
          <span class="entry-icon">${meta.icon}</span>
          <span class="entry-desc">
            ${meta.desc}${l.detalhe ? ` ${l.detalhe}` : ""}${tarifaTxt}
            <span class="entry-time">${formatHora(l.timestamp)} · saldo ${formatBRL(l.saldo_apos)}</span>
          </span>
          <span class="entry-amount ${saiu ? "negative" : "positive"}">${sinal} ${formatBRL(l.valor)}</span>
        </li>
      `;
    })
    .join("");
}

async function selecionarConta(contaId) {
  state.contaSelecionadaId = contaId;
  renderAccountsList();
  el.stamp.classList.remove("slam");
  el.stamp.classList.remove("fade");
  el.stamp.style.opacity = "0";

  el.passbookEmpty.classList.add("hidden");
  el.passbookContent.classList.remove("hidden");
  el.opFeedback.textContent = "";
  el.opFeedback.className = "op-feedback";

  const conta = state.contas.find((c) => c.id === contaId);
  renderPassbookHead(conta);
  preencherSelectDestino();

  el.entriesList.innerHTML = `<li class="muted entry-empty">Carregando…</li>`;
  try {
    const extrato = await carregarExtrato(contaId);
    renderEntries(extrato);
  } catch (e) {
    el.entriesList.innerHTML = `<li class="muted entry-empty">Não foi possível carregar o extrato.</li>`;
  }
}


function setOperacao(op) {
  state.operacao = op;
  el.opTabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.op === op));
  el.fieldDestino.classList.toggle("hidden", op !== "transferencia");
  el.opSubmitLabel.textContent = op === "saque" ? "Sacar" : "Transferir";
  el.opFeedback.textContent = "";
  el.opFeedback.className = "op-feedback";
}

el.opTabs.forEach((tab) => tab.addEventListener("click", () => setOperacao(tab.dataset.op)));

function dispararCarimbo(texto, positivo) {
  el.stamp.classList.remove("slam", "fade");
  el.stampText.textContent = texto;
  el.stamp.style.color = positivo ? "var(--good)" : "var(--stamp-red)";
  el.stamp.style.borderColor = positivo ? "var(--good)" : "var(--stamp-red)";
  void el.stamp.offsetWidth;
  el.stamp.classList.add("slam");
  setTimeout(() => el.stamp.classList.add("fade"), 1400);
}

el.opForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!state.contaSelecionadaId) return;

  const valor = parseFloat(el.opValor.value);
  el.opFeedback.textContent = "";
  el.opFeedback.className = "op-feedback";

  if (!valor || valor <= 0) {
    el.opFeedback.textContent = "Informe um valor maior que zero.";
    el.opFeedback.classList.add("error");
    return;
  }

  el.opSubmit.disabled = true;
  try {
    let resultado;
    if (state.operacao === "saque") {
      resultado = await api(`/contas/${state.contaSelecionadaId}/saque`, {
        method: "POST",
        body: JSON.stringify({ valor }),
      });
      dispararCarimbo("SACADO", true);
    } else {
      const destino = el.opDestino.value;
      if (!destino) {
        throw new Error("Selecione uma conta de destino.");
      }
      resultado = await api(`/contas/${state.contaSelecionadaId}/transferencia`, {
        method: "POST",
        body: JSON.stringify({ valor, destino }),
      });
      dispararCarimbo("ENVIADO", true);
    }

    el.opFeedback.textContent = resultado.mensagem;
    el.opFeedback.classList.add("success");
    el.opValor.value = "";

    await carregarContas();
    renderAccountsList();
    const contaAtualizada = state.contas.find((c) => c.id === state.contaSelecionadaId);
    renderPassbookHead(contaAtualizada);
    preencherSelectDestino();
    renderEntries(await carregarExtrato(state.contaSelecionadaId));
  } catch (e) {
    dispararCarimbo("RECUSADO", false);
    el.opFeedback.textContent = e.message;
    el.opFeedback.classList.add("error");
  } finally {
    el.opSubmit.disabled = false;
  }
});


async function init() {
  try {
    await api("/saude");
    setStatus(true);
  } catch (e) {
    setStatus(false);
  }

  try {
    await carregarContas();
    renderAccountsList();
  } catch (e) {
    el.accountsList.innerHTML = `<p class="muted">Não foi possível carregar as contas. Verifique se a API está rodando.</p>`;
  }
}

init();
