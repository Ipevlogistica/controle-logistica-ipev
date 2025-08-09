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

function num(v) {
  if (v === null || v === undefined) return 0;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  return isNaN(n) ? 0 : n;
}

function fmt2(n) {
  return Number(n).toFixed(2);
}

// ================== BUSCA DE DADOS ==================
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

/**
 * Lê do Supabase:
 * - mapaKmDia: Map<`${dataISO}__${motorista}`, km_total_no_dia>
 * - valorGasolinaAtual: valor_gasolina MAIS RECENTE (prioriza o mês selecionado; se não houver, usa o mais recente global)
 */
async function carregarKmPorDiaMesEValorGas(ano, mes1a12) {
  const inicioISO = formatarDataISO(ano, mes1a12, 1);
  const fimISO = formatarDataISO(ano, mes1a12, diasNoMes(ano, mes1a12));

  if (!supabaseClient) return { mapaKmDia: new Map(), valorGasolinaAtual: null };

  statusEl.textContent = "Carregando dados do mês...";

  // 1) KM por dia/motorista no mês
  const { data: dadosMes, error: errMes } = await supabaseClient
    .from("controle_diario")
    .select("data, motorista, km_rota1, km_rota2, km_adicional, valor_gasolina")
    .gte("data", inicioISO)
    .lte("data", fimISO)
    .order("data", { ascending: true });

  if (errMes) {
    console.error(errMes);
    statusEl.textContent = "Erro ao carregar dados do mês.";
    return { mapaKmDia: new Map(), valorGasolinaAtual: null };
  }

  const mapaKmDia = new Map();
  let valorGasolinaAtual = null;

  (dadosMes || []).forEach(row => {
    const dataISO = row.data; // YYYY-MM-DD
    const mot = row.motorista || "";
    const kmTotal = num(row.km_rota1) + num(row.km_rota2) + num(row.km_adicional);
    const key = `${dataISO}__${mot}`;
    mapaKmDia.set(key, (mapaKmDia.get(key) || 0) + kmTotal);
  });

  // 2) Buscar o valor_gasolina MAIS RECENTE dentro do mês
  // (valor_gasolina não nulo e > 0), ordenado por data desc, 1 registro
  const { data: gasMes, error: errGasMes } = await supabaseClient
    .from("controle_diario")
    .select("valor_gasolina, data")
    .gte("data", inicioISO)
    .lte("data", fimISO)
    .not("valor_gasolina", "is", null)
    .gt("valor_gasolina", 0)
    .order("data", { ascending: false })
    .limit(1);

  if (!errGasMes && gasMes && gasMes.length > 0) {
    valorGasolinaAtual = num(gasMes[0].valor_gasolina);
  } else {
    // 3) Fallback: buscar o MAIS RECENTE global (fora do mês)
    const { data: gasGlobal, error: errGasGlobal } = await supabaseClient
      .from("controle_diario")
      .select("valor_gasolina, data")
      .not("valor_gasolina", "is", null)
      .gt("valor_gasolina", 0)
      .order("data", { ascending: false })
      .limit(1);

    if (!errGasGlobal && gasGlobal && gasGlobal.length > 0) {
      valorGasolinaAtual = num(gasGlobal[0].valor_gasolina);
    }
  }

  statusEl.textContent = "";
  return { mapaKmDia, valorGasolinaAtual };
}

// ================== TABELA DINÂMICA ==================
function montarCabecalho(motoristas) {
  // primeira coluna é "Data"
  const cols = ['<th class="px-4 py-3 text-left font-semibold">Data</th>'];
  motoristas.forEach(m => {
    cols.push(`<th class="px-4 py-3 text-left font-semibold">${m.nome}</th>`);
  });
  thead.innerHTML = `<tr>${cols.join("")}</tr>`;
}

function montarLinhasComDados(ano, mes1a12, motoristas, mapaKmDia, valorGasolinaAtual) {
  const totalDias = diasNoMes(ano, mes1a12);
  const linhas = [];

  // Vetor para somar o total por motorista (coluna)
  const totaisPorMotorista = new Array(motoristas.length).fill(0);

  // Linhas dos dias
  for (let dia = 1; dia <= totalDias; dia++) {
    const dataISO = formatarDataISO(ano, mes1a12, dia);
    const tds = [`<td class="px-4 py-2 whitespace-nowrap text-gray-800">${formatarDataBR(dataISO)}</td>`];

    motoristas.forEach((m, idx) => {
      const key = `${dataISO}__${m.nome}`;
      const km = mapaKmDia.get(key);
      if (km !== undefined) {
        totaisPorMotorista[idx] += Number(km);
        tds.push(`<td class="px-4 py-2 text-center">${fmt2(km)}</td>`);
      } else {
        tds.push(`<td class="px-4 py-2 text-center text-gray-500">--</td>`);
      }
    });

    linhas.push(`<tr class="hover:bg-gray-50">${tds.join("")}</tr>`);
  }

  // ===== Linhas finais =====
  // Linha TOTAL KM (somada por coluna)
  const totalKm = [`<th class="px-4 py-2 text-left font-semibold bg-blue-100">Total KM</th>`];
  motoristas.forEach((_, idx) => {
    totalKm.push(`<td class="px-4 py-2 text-center font-semibold bg-blue-50">${fmt2(totaisPorMotorista[idx])}</td>`);
  });
  linhas.push(`<tr>${totalKm.join("")}</tr>`);

  // Linha VALOR TOTAL MÊS ((Total KM / 35) * valor_gasolina_atual)
  const valorMes = [`<th class="px-4 py-2 text-left font-semibold bg-blue-100">Valor Total Mês</th>`];
  motoristas.forEach((_, idx) => {
    if (valorGasolinaAtual && valorGasolinaAtual > 0) {
      const valor = (totaisPorMotorista[idx] / 35) * valorGasolinaAtual;
      valorMes.push(`<td class="px-4 py-2 text-center font-semibold bg-blue-50">${fmt2(valor)}</td>`);
    } else {
      valorMes.push(`<td class="px-4 py-2 text-center font-semibold bg-blue-50">--</td>`);
    }
  });
  linhas.push(`<tr>${valorMes.join("")}</tr>`);

  // Linha RESQUÍCIO MÊS (placeholder)
  const resquicioMes = [`<th class="px-4 py-2 text-left font-semibold bg-blue-100">Resquício Mês</th>`];
  motoristas.forEach(() => {
    resquicioMes.push(`<td class="px-4 py-2 text-center font-semibold bg-blue-50">--</td>`);
  });
  linhas.push(`<tr>${resquicioMes.join("")}</tr>`);

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

  // Carrega KM/dia do mês e valor da gasolina MAIS ATUAL
  const { mapaKmDia, valorGasolinaAtual } = await carregarKmPorDiaMesEValorGas(ano, mes);
  montarLinhasComDados(ano, mes, motoristas, mapaKmDia, valorGasolinaAtual);
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
