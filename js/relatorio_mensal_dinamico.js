// ================== CONFIG SUPABASE ==================
const SUPABASE_URL = "https://ilsbyrvnrkutwynujfhs.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlsc2J5cnZucmt1dHd5bnVqZmhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzNDAwNDEsImV4cCI6MjA2OTkxNjA0MX0.o56R-bf1Nt3PiqMZbG_ghEPYZzrPnEU-jCdYKkjylTQ";

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
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

function preencherCombosMesAno() {
  selMes.innerHTML = meses.map((m, i) => `<option value="${i+1}">${m}</option>`).join("");
  const anoAtual = new Date().getFullYear();
  const anos = [anoAtual - 1, anoAtual, anoAtual + 1, anoAtual + 2];
  selAno.innerHTML = anos.map(a => `<option value="${a}">${a}</option>`).join("");
  selMes.value = (new Date().getMonth() + 1).toString();
  selAno.value = anoAtual.toString();
  atualizarMesAno();  // Atualiza mês e ano no cabeçalho de impressão
}

function atualizarMesAno() {
  const mesSelecionado = selMes.value;
  const anoSelecionado = selAno.value;

  // Exibição do mês e ano SOMENTE na impressão
  const mesAnoTexto = `${meses[mesSelecionado - 1]} ${anoSelecionado}`;
  document.getElementById("mesAnoReferencia").textContent = mesAnoTexto;
}

function diasNoMes(ano, mes1a12) {
  return new Date(ano, mes1a12, 0).getDate();
}

function formatarDataISO(ano, mes1a12, dia) {
  return `${ano}-${String(mes1a12).padStart(2,"0")}-${String(dia).padStart(2,"0")}`;
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
  // >>> Alteração: filtrar apenas ativos
  const { data, error } = await supabaseClient
    .from("motoristas")
    .select("id, nome, placa")
    .eq("ativo", true)
    .order("nome", { ascending: true });
  if (error) return [];
  return data || [];
}

async function carregarKmPorDiaMesEValorGas(ano, mes1a12) {
  const inicioISO = formatarDataISO(ano, mes1a12, 1);
  const fimISO = formatarDataISO(ano, mes1a12, diasNoMes(ano, mes1a12));
  if (!supabaseClient) return { mapaKmDia: new Map(), valorGasolinaAtual: null };

  const { data: dadosMes } = await supabaseClient
    .from("controle_diario")
    .select("data, motorista, km_rota1, km_rota2, km_adicional, valor_gasolina")
    .gte("data", inicioISO)
    .lte("data", fimISO)
    .order("data", { ascending: true });

  const mapaKmDia = new Map();
  (dadosMes || []).forEach(row => {
    const dataISO = row.data;
    const mot = row.motorista || "";
    const kmTotal = num(row.km_rota1) + num(row.km_rota2) + num(row.km_adicional);
    const key = `${dataISO}__${mot}`;
    mapaKmDia.set(key, (mapaKmDia.get(key) || 0) + kmTotal);
  });

  const { data: gasMes } = await supabaseClient
    .from("controle_diario")
    .select("valor_gasolina, data")
    .gte("data", inicioISO)
    .lte("data", fimISO)
    .not("valor_gasolina", "is", null)
    .gt("valor_gasolina", 0)
    .order("data", { ascending: false })
    .limit(1);

  let valorGasolinaAtual = null;
  if (gasMes && gasMes.length > 0) {
    valorGasolinaAtual = num(gasMes[0].valor_gasolina);
  } else {
    const { data: gasGlobal } = await supabaseClient
      .from("controle_diario")
      .select("valor_gasolina, data")
      .not("valor_gasolina", "is", null)
      .gt("valor_gasolina", 0)
      .order("data", { ascending: false })
      .limit(1);
    if (gasGlobal && gasGlobal.length > 0) {
      valorGasolinaAtual = num(gasGlobal[0].valor_gasolina);
    }
  }
  return { mapaKmDia, valorGasolinaAtual };
}

async function carregarRecargasMes(ano, mes1a12) {
  if (!supabaseClient) return new Map();
  const { data } = await supabaseClient
    .from("recargas_motoristas")
    .select("motorista_nome, placa, ano, mes, recarga, adicional")
    .eq("ano", ano)
    .eq("mes", mes1a12);

  const mapa = new Map();
  (data || []).forEach(r => {
    const key = `${r.motorista_nome || ""}__${r.placa || ""}`;
    mapa.set(key, { recarga: num(r.recarga), adicional: num(r.adicional) });
  });
  return mapa;
}

// ================== TABELA DINÂMICA ==================
function montarCabecalho(motoristas) {
  const cols = ['<th class="px-4 py-3 text-left font-semibold">Data</th>'];
  motoristas.forEach(m => cols.push(`<th class="px-4 py-3 text-left font-semibold">${m.nome}</th>`));
  thead.innerHTML = `<tr>${cols.join("")}</tr>`;
}

function montarLinhasComDados(ano, mes1a12, motoristas, mapaKmDia, valorGasolinaAtual, recargasMap) {
  const totalDias = diasNoMes(ano, mes1a12);
  const linhas = [];
  const totaisPorMotorista = new Array(motoristas.length).fill(0);

  for (let dia = 1; dia <= totalDias; dia++) {
    const dataISO = formatarDataISO(ano, mes1a12, dia);
    const diaDoMes = dia;
    const corData = (diaDoMes === 10 || diaDoMes === 20) ? "bg-yellow-200" : "";

    const tds = [`<td class="px-4 py-2 whitespace-nowrap text-gray-800 ${corData}">${formatarDataBR(dataISO)}</td>`];
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

  const totalKm = [`<th class="px-4 py-2 text-left font-semibold bg-blue-100">Total KM</th>`];
  motoristas.forEach((_, idx) => totalKm.push(`<td class="px-4 py-2 text-center font-semibold bg-blue-50">${fmt2(totaisPorMotorista[idx])}</td>`));
  linhas.push(`<tr>${totalKm.join("")}</tr>`);

  const valorMes = [`<th class="px-4 py-2 text-left font-semibold bg-blue-100">Valor Total Mês</th>`];
  const valoresTotaisMes = new Array(motoristas.length).fill(null);
  motoristas.forEach((_, idx) => {
    if (valorGasolinaAtual && valorGasolinaAtual > 0) {
      const valor = (totaisPorMotorista[idx] / 35) * valorGasolinaAtual;
      valoresTotaisMes[idx] = valor;
      valorMes.push(`<td class="px-4 py-2 text-center font-semibold bg-blue-50">${fmt2(valor)}</td>`);
    } else {
      valorMes.push(`<td class="px-4 py-2 text-center font-semibold bg-blue-50">--</td>`);
    }
  });
  linhas.push(`<tr>${valorMes.join("")}</tr>`);

  // Resquício Mês com destaque
  const resquicioMes = [`<th class="px-4 py-2 text-left font-semibold bg-blue-100">Resquício Mês</th>`];
  motoristas.forEach((m, idx) => {
    const keyRec = `${m.nome}__${m.placa || ""}`;
    const reg = recargasMap.get(keyRec);
    if (reg && valoresTotaisMes[idx] !== null) {
      const resq = (num(reg.recarga) + num(reg.adicional)) - Number(valoresTotaisMes[idx]);
      let classeCor = "bg-blue-50";
      if (resq < 0) classeCor = "bg-red-200 text-red-700";
      else if (resq > 100) classeCor = "bg-green-200 text-green-800";
      resquicioMes.push(`<td class="px-4 py-2 text-center font-semibold ${classeCor}">${fmt2(resq)}</td>`);
    } else {
      resquicioMes.push(`<td class="px-4 py-2 text-center font-semibold bg-blue-50">--</td>`);
    }
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
  const { mapaKmDia, valorGasolinaAtual } = await carregarKmPorDiaMesEValorGas(ano, mes);
  const recargasMap = await carregarRecargasMes(ano, mes);
  montarLinhasComDados(ano, mes, motoristas, mapaKmDia, valorGasolinaAtual, recargasMap);
}

btnImprimir?.addEventListener("click", () => window.print());
selMes.addEventListener("change", atualizarTabela);
selAno.addEventListener("change", atualizarTabela);

document.addEventListener("DOMContentLoaded", () => {
  preencherCombosMesAno();
  atualizarTabela();
});

// ================== OPCIONAL: Exclusão lógica (não altera UI) ==================
/**
 * Marca o motorista como inativo, sem apagar do banco.
 * Uso (no console ou em handlers seus): excluirMotorista(123)
 */
async function excluirMotorista(id) {
  if (!supabaseClient) return;
  const { error } = await supabaseClient
    .from("motoristas")
    .update({ ativo: false, excluido_em: new Date().toISOString() })
    .eq("id", id);
  if (!error) {
    // Atualiza a tabela visível (o motorista sumirá do cabeçalho)
    atualizarTabela();
  } else {
    console.error("Erro ao excluir logicamente motorista:", error);
  }
}
