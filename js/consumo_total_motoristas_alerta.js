/* Consumo Total por Motorista – JS específico
   - Lê motoristas (nome, placa) e monta 1 linha por motorista
   - Mostra colunas Dia 1..N conforme o mês/ano selecionados
   - Para cada dia, soma apenas o campo de gasto diário (valor_total OU valorTotal)
   - Colunas "Recarga (R$)" (padrão 250.00, editável) e "Adicional (R$)" (editável)
   - Sem persistência ainda (apenas visual). Depois podemos salvar em tabela própria.
*/

// === CONFIG SUPABASE (usa a lib UMD já incluída no HTML) ===
const SUPABASE_URL = 'https://ilsbyrvnrkutwynujfhs.supabase.co';
const SUPABASE_ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlsc2J5cnZucmt1dHd5bnVqZmhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzNDAwNDEsImV4cCI6MjA2OTkxNjA0MX0.o56R-bf1Nt3PiqMZbG_ghEPYZzrPnEU-jCdYKkjylTQ';

const supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// === CAMPOS E UTILITÁRIOS ===
const DATA_FIELDS = ['data', 'Data', 'created_at']; // tentaremos esses antes de compor com ano/mes/dia
const MOTORISTA_FIELDS = ['motorista', 'Motorista', 'nome_motorista', 'nomeMotorista'];
const PLACA_FIELDS = ['placa', 'Placa'];
const VALOR_DIA_FIELDS = ['valor_total', 'valorTotal']; // aceita snake e camel

const $ = (id) => document.getElementById(id);

function daysInMonth(year, month1to12) {
  return new Date(year, month1to12, 0).getDate();
}

function pickFirst(row, fields) {
  for (let i = 0; i < fields.length; i++) {
    const f = fields[i];
    if (row && row[f] != null) return row[f];
  }
  return undefined;
}

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function sumKnownFields(row, fields) {
  let acc = 0;
  for (let i = 0; i < fields.length; i++) acc += toNum(row[fields[i]]);
  return acc;
}

// Normaliza 'AAAA/MM/DD' ou Date-like para 'AAAA-MM-DD'
function normalizeDateToISO(d) {
  if (!d) return '';
  try {
    const s = String(d).replace(/\//g, '-');
    return new Date(s).toISOString().slice(0, 10);
  } catch {
    return '';
  }
}

// === BUSCAS ===
async function getMotoristas() {
  // pega só colunas necessárias
  const result = await supa.from('motoristas').select('nome,placa').order('nome', { ascending: true });
  if (result.error) {
    console.error('Erro motoristas:', result.error);
    return [];
  }
  const data = result.data || [];
  return data.map((m) => ({
    nome: m.nome || pickFirst(m, MOTORISTA_FIELDS) || '—',
    placa: m.placa || pickFirst(m, PLACA_FIELDS) || '',
  }));
}

async function getRegistrosMesAno(ano, mes) {
  // Busca tudo e filtra em JS, para suportar diferentes formatos de data
  const result = await supa.from('controle_diario').select('*');
  if (result.error) {
    console.error('Erro controle_diario:', result.error);
    return new Map();
  }
  const rows = result.data || [];

  const mapa = new Map(); // key: nome -> { dia: valor }
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];

    // motorista
    const nome = String(pickFirst(r, MOTORISTA_FIELDS) || '—');

    // data (preferir campo único; senão, compor por ano/mes/dia)
    let iso = normalizeDateToISO(pickFirst(r, DATA_FIELDS));
    if (!iso) {
      const yy = Number(pickFirst(r, ['ano', 'Ano']));
      const mm = Number(pickFirst(r, ['mes', 'Mes']));
      const dd = Number(pickFirst(r, ['dia', 'Dia']));
      if (yy && mm && dd) iso = `${yy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
    }
    if (!iso) continue;

    const y = Number(iso.slice(0, 4));
    const m = Number(iso.slice(5, 7));
    const d = Number(iso.slice(8, 10));

    if (y !== Number(ano) || m !== Number(mes)) continue;

    const valor = sumKnownFields(r, VALOR_DIA_FIELDS);
    if (!mapa.has(nome)) mapa.set(nome, {});
    const obj = mapa.get(nome);
    obj[d] = (obj[d] || 0) + valor;
  }
  return mapa;
}

// === RENDER ===
function drawHeader(qtdDias) {
  const ths = [];
  ths.push('<th class="border px-2 py-1">Motorista (Placa)</th>');
  ths.push('<th class="border px-2 py-1">Recarga (R$)</th>');
  ths.push('<th class="border px-2 py-1">Adicional (R$)</th>');
  for (let d = 1; d <= qtdDias; d++) ths.push(`<th class="border px-2 py-1">Dia ${d}</th>`);
  $('thead').innerHTML = `<tr>${ths.join('')}</tr>`;
}

function drawRows(motoristas, mapaValores, qtdDias) {
  const linhas = [];
  for (let i = 0; i < motoristas.length; i++) {
    const m = motoristas[i];
    const nomePlaca = `${m.nome}${m.placa ? ' (' + m.placa + ')' : ''}`;
    const valores = mapaValores.get(m.nome) || {};
    const tds = [];

    tds.push(`<td class="border px-2 py-1">${nomePlaca}</td>`);
    tds.push(
      `<td class="border px-2 py-1"><input type="number" step="0.01" class="w-24 text-right border rounded recarga" value="250.00" data-motorista="${m.nome}"></td>`
    );
    tds.push(
      `<td class="border px-2 py-1"><input type="number" step="0.01" class="w-24 text-right border rounded adicional" data-motorista="${m.nome}" placeholder="0.00"></td>`
    );

    for (let d = 1; d <= qtdDias; d++) {
      const v = valores[d];
      tds.push(`<td class="border px-2 py-1 text-right">${v != null && v !== 0 ? Number(v).toFixed(2) : '—'}</td>`);
    }

    linhas.push(`<tr>${tds.join('')}</tr>`);
  }
  $('tbody').innerHTML = linhas.join('');
}

// === CONTROLE ===
async function updateTable() {
  const mes = Number($('selMes').value) || new Date().getMonth() + 1;
  const ano = Number($('selAno').value) || new Date().getFullYear();
  const qtdDias = daysInMonth(ano, mes);

  // cabeçalho sempre
  drawHeader(qtdDias);

  const status = $('statusMsg');
  if (status) status.textContent = '';

  try {
    const [motoristas, mapa] = await Promise.all([getMotoristas(), getRegistrosMesAno(ano, mes)]);
    drawRows(motoristas, mapa, qtdDias);
    if (status) {
      status.textContent = `Carregado ${motoristas.length} motorista(s)`;
      status.className = 'text-xs ml-2 text-gray-600';
    }
  } catch (e) {
    console.error('Falha updateTable:', e);
    if (status) {
      status.textContent = 'Falha ao carregar dados';
      status.className = 'text-xs ml-2 text-red-600';
    }
    drawRows([], new Map(), qtdDias);
  }
}

function initYearOptions() {
  const anoAtual = new Date().getFullYear();
  const anos = [];
  for (let a = anoAtual - 3; a <= anoAtual + 1; a++) anos.push(a);
  $('selAno').innerHTML = anos.map((a) => `<option value="${a}">${a}</option>`).join('');
  $('selMes').value = String(new Date().getMonth() + 1);
  $('selAno').value = String(anoAtual);
}

function wireEvents() {
  $('btnAtualizar').addEventListener('click', updateTable);
}

// === BOOT ===
document.addEventListener('DOMContentLoaded', () => {
  initYearOptions();
  wireEvents();
  updateTable();
});
