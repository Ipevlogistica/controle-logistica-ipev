/* Consumo Total por Motorista – JS específico (persistência de Recarga/Adicional + consumo_geral/resquicio)
   Alterações mínimas:
   - salvar também consumo_geral e resquicio na tabela recargas_motoristas
   Demais comportamentos preservados.
*/

// === CONFIG SUPABASE ===
const SUPABASE_URL = 'https://ilsbyrvnrkutwynujfhs.supabase.co';
const SUPABASE_ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlsc2J5cnZucmt1dHd5bnVqZmhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzNDAwNDEsImV4cCI6MjA2OTkxNjA0MX0.o56R-bf1Nt3PiqMZbG_ghEPYZzrPnEU-jCdYKkjylTQ';

const supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// === CAMPOS E UTILITÁRIOS ===
const DATA_FIELDS = ['data', 'Data', 'created_at'];
const MOTORISTA_FIELDS = ['motorista', 'Motorista', 'nome_motorista', 'nomeMotorista'];
const PLACA_FIELDS = ['placa', 'Placa'];
// inclui seu nome de coluna diário
const VALOR_DIA_FIELDS = ['valor_total_gasto', 'valor_total', 'valorTotal'];

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
// Debounce simples
function debounce(fn, wait = 600) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

// === BUSCAS BASE ===
async function getMotoristas() {
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
  // Busca tudo e filtra em JS para suportar diferentes formatos de data
  const result = await supa.from('controle_diario').select('*');
  if (result.error) {
    console.error('Erro controle_diario:', result.error);
    return new Map();
  }
  const rows = result.data || [];

  const mapa = new Map(); // key: nome -> { dia: valor }
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];

    const nome = String(pickFirst(r, MOTORISTA_FIELDS) || '—');

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

// === PERSISTÊNCIA: RECARGAS/ADICIONAIS ===
// Lê mapa: key "NOME|PLACA" -> { recarga, adicional }
async function carregarRecargas(ano, mes) {
  const { data, error } = await supa
    .from('recargas_motoristas')
    .select('motorista_nome,placa,recarga,adicional')   // leitura mantida
    .eq('ano', ano)
    .eq('mes', mes);
  if (error) {
    console.error('Erro carregarRecargas:', error);
    return new Map();
  }
  const mapa = new Map();
  (data || []).forEach((r) => {
    const key = `${r.motorista_nome}|${r.placa || ''}`;
    mapa.set(key, { recarga: toNum(r.recarga) || 250, adicional: toNum(r.adicional) || 0 });
  });
  return mapa;
}

// Salva (upsert) um registro de recarga/adicional (+ consumo_geral/resquicio)
async function salvarRecargaAdicional({ nome, placa, ano, mes, recarga, adicional, consumo_geral, resquicio }) {
  const { error } = await supa
    .from('recargas_motoristas')
    .upsert(
      [{
        motorista_nome: nome,
        placa: placa || null,
        ano,
        mes,
        recarga,
        adicional,
        consumo_geral,   // << NOVO
        resquicio        // << NOVO
      }],
      { onConflict: 'motorista_nome,placa,ano,mes' }
    );
  if (error) console.error('Erro salvarRecargaAdicional:', error);
  return !error;
}

// === RENDER ===
function drawHeader(qtdDias) {
  const ths = [];
  ths.push('<th class="border px-2 py-1">Motorista (Placa)</th>');
  ths.push('<th class="border px-2 py-1">Recarga (R$)</th>');
  ths.push('<th class="border px-2 py-1">Adicional (R$)</th>');
  for (let d = 1; d <= qtdDias; d++) ths.push(`<th class="border px-2 py-1">Dia ${d}</th>`);
  // Colunas finais (já existentes)
  ths.push('<th class="border px-2 py-1 bg-blue-100">Consumo Geral (R$)</th>');
  ths.push('<th class="border px-2 py-1 bg-blue-100">Resquício (R$)</th>');
  $('thead').innerHTML = `<tr>${ths.join('')}</tr>`;
}

function drawRows(motoristas, mapaValores, qtdDias, mapaRecargas) {
  const linhas = [];
  for (let i = 0; i < motoristas.length; i++) {
    const m = motoristas[i];
    const nomePlaca = `${m.nome}${m.placa ? ' (' + m.placa + ')' : ''}`;
    const valores = mapaValores.get(m.nome) || {};

    // valores salvos (ou defaults)
    const key = `${m.nome}|${m.placa || ''}`;
    const salvo = (mapaRecargas && mapaRecargas.get(key)) || { recarga: 250.0, adicional: 0.0 };

    // monta células
    const tds = [];
    tds.push(`<td class="border px-2 py-1">${nomePlaca}</td>`);
    tds.push(
      `<td class="border px-2 py-1"><input type="number" step="0.01" class="w-24 text-right border rounded recarga" value="${salvo.recarga.toFixed(
        2
      )}" data-motorista="${m.nome}" data-placa="${m.placa || ''}"></td>`
    );
    tds.push(
      `<td class="border px-2 py-1"><input type="number" step="0.01" class="w-24 text-right border rounded adicional" value="${salvo.adicional.toFixed(
        2
      )}" data-motorista="${m.nome}" data-placa="${m.placa || ''}"></td>`
    );

    let consumoGeral = 0;
    for (let d = 1; d <= qtdDias; d++) {
      const v = valores[d];
      consumoGeral += toNum(v);
      tds.push(`<td class="border px-2 py-1 text-right">${v != null && v !== 0 ? Number(v).toFixed(2) : '—'}</td>`);
    }

    // Consumo Geral e Resquício
    const resquicioInicial = salvo.recarga + salvo.adicional - consumoGeral;
    const trClass = resquicioInicial <= 100 ? ' class="bg-red-100"' : '';
    tds.push(`<td class="border px-2 py-1 text-right font-bold text-blue-700 consumo-geral">${consumoGeral.toFixed(2)}</td>`);
    tds.push(`<td class="border px-2 py-1 text-right font-bold resquicio">${resquicioInicial.toFixed(2)}</td>`);

    linhas.push(`<tr${trClass}>${tds.join('')}</tr>`);
  }
  $('tbody').innerHTML = linhas.join('');

  // Ligar recálculo + persistência
  bindResquicioRecalcAndSave();
}

function bindResquicioRecalcAndSave() {
  const rows = $('tbody').querySelectorAll('tr');

  const salvarDebounced = debounce(async (payload) => {
    await salvarRecargaAdicional(payload);
  }, 600);

  rows.forEach((tr) => {
    const inpRecarga = tr.querySelector('.recarga');
    const inpAdicional = tr.querySelector('.adicional');
    const tdConsumo = tr.querySelector('.consumo-geral');
    const tdResq = tr.querySelector('.resquicio');

    const nome = inpRecarga?.dataset.motorista || '';
    const placa = inpRecarga?.dataset.placa || '';

    function recalcAndSave() {
      const recarga = toNum(inpRecarga && inpRecarga.value);
      const adicional = toNum(inpAdicional && inpAdicional.value);
      const consumo_geral = toNum(tdConsumo && tdConsumo.textContent);
      const resq = recarga + adicional - consumo_geral;

      if (tdResq) tdResq.textContent = resq.toFixed(2);
      if (resq <= 100) tr.classList.add('bg-red-100');
      else tr.classList.remove('bg-red-100');

      // persistir (ano/mes atuais da UI)
      const ano = Number($('selAno').value) || new Date().getFullYear();
      const mes = Number($('selMes').value) || new Date().getMonth() + 1;

      salvarDebounced({
        nome,
        placa,
        ano,
        mes,
        recarga,
        adicional,
        consumo_geral,       // << NOVO
        resquicio: resq      // << NOVO
      });
    }

    if (inpRecarga) {
      inpRecarga.addEventListener('input', recalcAndSave);
      inpRecarga.addEventListener('blur', recalcAndSave);
    }
    if (inpAdicional) {
      inpAdicional.addEventListener('input', recalcAndSave);
      inpAdicional.addEventListener('blur', recalcAndSave);
    }
  });
}

// === CONTROLE ===
async function updateTable() {
  const mes = Number($('selMes').value) || new Date().getMonth() + 1;
  const ano = Number($('selAno').value) || new Date().getFullYear();
  const qtdDias = daysInMonth(ano, mes);

  drawHeader(qtdDias);

  const status = $('statusMsg');
  if (status) status.textContent = '';

  try {
    const [motoristas, mapa, mapaRec] = await Promise.all([
      getMotoristas(),
      getRegistrosMesAno(ano, mes),
      carregarRecargas(ano, mes),
    ]);
    drawRows(motoristas, mapa, qtdDias, mapaRec);
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
    drawRows([], new Map(), qtdDias, new Map());
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
