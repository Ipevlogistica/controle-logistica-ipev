// ================== CONFIG SUPABASE ==================
const SUPABASE_URL = "https://ilsbyrvnrkutwynujfhs.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlsc2J5cnZucmt1dHd5bnVqZmhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzNDAwNDEsImV4cCI6MjA2OTkxNjA0MX0.o56R-bf1Nt3PiqMZbG_ghEPYZzrPnEU-jCdYKkjylTQ";

// Proteção para caso a UMD não carregue
let supabaseClient = null;
if (window.supabase && typeof window.supabase.createClient === "function") {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
  console.warn("Supabase UMD não carregou. Cabeçalho será gerado sem motoristas.");
}

// ================== ELEMENTOS ==================
const selMes = document.getElementById("selMes");
const selAno = document.getElementById("selAno");
const thead = document.getElementById("thead");
const tbody = document.getElementById("tbody");
const statusEl = document.getElementById("status");
const btnImprimir = document.getElementById("btnImprimir");

// ================== HELPERS ==================
const meses = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
];

function preencherCombosMesAno() {
  // Mês
  selMes.innerHTML = meses.map((m, i) => `<option value="${i+1}">${m}</option>`).join("");
  // Ano (atual -1, atual, +1, +2)
  const anoAtual = new Date().getFullYear();
  const anos = [anoAtual - 1, anoAtual, anoAtual + 1, anoAtual + 2];
  selAno.innerHTML = anos.map(a => `<option value="${a}">${a}</option>`).join("");

  // Seleciona mês/ano atuais por padrão
  selMes.value = (new Date().getMonth() + 1).toString();
  selAno.value = anoAtual.toString();
}

function diasNoMes(ano, mes1a12) {
  return new Date(ano, mes1a12, 0).getDate();
}

function formatarDataISO(ano, mes1a12, dia) {
  const mm = String(mes1a12).padStart(2,"0");
  const dd = String(dia).padStart(2,"0");
  return `${ano}-${mm}-${dd}`;
}

function formatarDataBR(iso) {
  const [y,m,d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

// ================== TABELA DINÂMICA ==================
async function carregarMotoristas() {
  if (!supabaseClient) {
    statusEl.textContent = "Modo offline: Supabase não carregou.";
    return [];
  }
  statusEl.textContent = "Carregando motoristas...";
  const { data, error } = await supabaseClient
    .from("motoristas")
    .select("nome, placa")
    .order("nome", { ascending: true });

  if (error) {
    console.error(error);
    statusEl.textContent = "Erro ao carregar motoristas.";
    return [];
  }
  statusEl.textContent = "";
  return data || [];
}

function montarCabecalho(motoristas) {
  // primeira coluna é "Data"
  const cols = ['<th class="px-4 py-3 text-left font-semibold">Data</th>'];
  motoristas.forEach(m => {
    cols.push(`<th class="px-4 py-3 text-left font-semibold">${m.nome}</th>`);
  });
  thead.innerHTML = `<tr>${cols.join("")}</tr>`;
}

function montarLinhasVazias(ano, mes1a12, motoristas) {
  const totalDias = diasNoMes(ano, mes1a12);
  const linhas = [];

  for (let dia = 1; dia <= totalDias; dia++) {
    const dataISO = formatarDataISO(ano, mes1a12, dia);
    const tds = [`<td class="px-4 py-2 whitespace-nowrap text-gray-800">${formatarDataBR(dataISO)}</td>`];

    // Placeholder "--" por motorista
    motoristas.forEach(() => {
      tds.push(`<td class="px-4 py-2 text-center text-gray-500">--</td>`);
    });

    linhas.push(`<tr class="hover:bg-gray-50">${tds.join("")}</tr>`);
  }
  tbody.innerHTML = linhas.join("");
}

// ================== FLUXO PRINCIPAL ==================
async function atualizarTabela() {
  const ano = parseInt(selAno.value, 10);
  const mes = parseInt(selMes.value, 10);

  const motoristas = await carregarMotoristas();

  if (!motoristas.length) {
    thead.innerHTML = "";
    tbody.innerHTML = `<tr><td class="px-4 py-3 text-red-600">Nenhum motorista cadastrado.</td></tr>`;
    return;
  }

  montarCabecalho(motoristas);
  montarLinhasVazias(ano, mes, motoristas);

  // (Futuro): preencher células com dados do controle_diario
}

// Eventos
btnImprimir?.addEventListener("click", () => window.print());
selMes.addEventListener("change", atualizarTabela);
selAno.addEventListener("change", atualizarTabela);

// Init
document.addEventListener("DOMContentLoaded", () => {
  preencherCombosMesAno();
  atualizarTabela();
});
