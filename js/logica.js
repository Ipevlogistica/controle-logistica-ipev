// logica.js (ajustado para o schema atual do Supabase)

import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js';

const supabaseUrl = 'https://ilsbyrvnrkutwynujfhs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlsc2J5cnZucmt1dHd5bnVqZmhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzNDAwNDEsImV4cCI6MjA2OTkxNjA0MX0.o56R-bf1Nt3PiqMZbG_ghEPYZzrPnEU-jCdYKkjylTQ';
const supabase = createClient(supabaseUrl, supabaseKey);
// expõe globalmente para evitar múltiplas instâncias e permitir reuso no HTML
window.supabase = supabase;

// helpers
const toNum = (v) => Number(String(v ?? '').replace(',', '.')) || 0;

document.addEventListener('DOMContentLoaded', async () => {
  // Data inicia em branco + defaults
  document.getElementById('data').value = '';
  document.getElementById('kmAdicional').value = 10;
  document.getElementById('valorGasolina').value = 5.99;

  // Exibe usuário logado no cabeçalho (se os elementos existirem no HTML)
  await initAuthHeader();

  await carregarMotoristas();
  carregarListaRegistros();

  ['km1', 'km2', 'kmAdicional', 'valorGasolina'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', calcularValores);
  });

  document.getElementById('formulario').addEventListener('submit', async (e) => {
    e.preventDefault();

    const data = document.getElementById('data').value;          // yyyy-mm-dd
    const motorista = document.getElementById('motorista').value;

    if (!data || !motorista) {
      alert('Preencha todos os campos obrigatórios.');
      return;
    }

    // checa duplicidade por (data, motorista)
    const { data: registrosExistentes, error: erroConsulta } = await supabase
      .from('controle_diario')
      .select('*')
      .eq('data', data)
      .eq('motorista', motorista);

    if (erroConsulta) {
      alert('Erro ao verificar duplicidade: ' + erroConsulta.message);
      console.error(erroConsulta);
      return;
    }

    if (registrosExistentes && registrosExistentes.length > 0) {
      const desejaEditar = confirm('Este motorista já foi cadastrado nesta data. Deseja editar o registro?');
      if (!desejaEditar) {
        document.getElementById('formulario').reset();
        document.getElementById('kmAdicional').value = 10;
        document.getElementById('valorGasolina').value = 5.99;
        calcularValores();
        return;
      } else {
        await supabase
          .from('controle_diario')
          .delete()
          .eq('data', data)
          .eq('motorista', motorista);
      }
    }

    const placa = document.getElementById('placa').value;
    const rota = document.getElementById('rota').value;
    const kmAdicional = document.getElementById('kmAdicional').value;
    const valorGasolina = document.getElementById('valorGasolina').value;
    const km1 = document.getElementById('km1').value;
    const km2 = document.getElementById('km2').value;
    const chegada1 = document.getElementById('chegada1').value;
    const chegada2 = document.getElementById('chegada2').value;

    // calcular para preencher campos readonly
    const kmTotal = (toNum(km1) + toNum(km2) + toNum(kmAdicional)).toFixed(2);
    const litros = (toNum(kmTotal) / 35).toFixed(2);
    const valorTotal = (toNum(litros) * toNum(valorGasolina)).toFixed(2);

    // payload com nomes de coluna do schema ATUAL
    const payload = {
      data,                          // date
      motorista,                     // text
      placa,                         // text
      rota,                          // text
      chegada1: chegada1 || null,    // time
      chegada2: chegada2 || null,    // time

      km_rota1: toNum(km1),                  // numeric(6,2)
      km_rota2: toNum(km2),                  // numeric(6,2)
      km_adicional: toNum(kmAdicional),      // numeric(6,2)
      combustivel_consumido: toNum(litros),  // numeric(6,2)
      valor_gasolina: toNum(valorGasolina),  // numeric(5,2)
      valor_total_gasto: toNum(valorTotal)   // numeric(8,2)
    };

    const { error: erroInsercao } = await supabase
      .from('controle_diario')
      .insert([payload]);

    if (erroInsercao) {
      alert('Erro ao salvar: ' + erroInsercao.message);
      console.error(erroInsercao);
      return;
    }

    alert('Registro salvo com sucesso!');
    document.getElementById('formulario').reset();
    document.getElementById('kmAdicional').value = 10;
    document.getElementById('valorGasolina').value = 5.99;
    document.getElementById('litros').value = '';
    document.getElementById('kmTotal').value = '';
    document.getElementById('valorTotal').value = '';
    calcularValores();
    carregarListaRegistros();
  });

  document.getElementById('motorista').addEventListener('change', atualizarPlaca);
  document.getElementById('data').addEventListener('change', carregarListaRegistros);
});

function calcularValores() {
  const km1 = toNum(document.getElementById('km1').value);
  const km2 = toNum(document.getElementById('km2').value);
  const kmAdicional = toNum(document.getElementById('kmAdicional').value);
  const valorGasolina = toNum(document.getElementById('valorGasolina').value);

  const kmTotal = km1 + km2 + kmAdicional;
  const litros = kmTotal / 35;
  const valorTotal = litros * valorGasolina;

  document.getElementById('kmTotal').value = kmTotal.toFixed(2);
  document.getElementById('litros').value = litros.toFixed(2);
  document.getElementById('valorTotal').value = valorTotal.toFixed(2);
}

async function carregarMotoristas() {
  const select = document.getElementById('motorista');
  select.innerHTML = '';

  const optionInicial = document.createElement('option');
  optionInicial.value = '';
  optionInicial.textContent = 'Selecione';
  select.appendChild(optionInicial);

  const { data: motoristas, error } = await supabase.from('motoristas').select('nome,placa');
  if (error) {
    console.error(error);
    return;
  }
  (motoristas || []).forEach(({ nome }) => {
    const option = document.createElement('option');
    option.value = nome;
    option.textContent = nome;
    select.appendChild(option);
  });
}

function atualizarPlaca() {
  const motoristaSelecionado = document.getElementById('motorista').value;
  if (!motoristaSelecionado) {
    document.getElementById('placa').value = '';
    return;
  }

  supabase
    .from('motoristas')
    .select('placa')
    .eq('nome', motoristaSelecionado)
    .then(({ data, error }) => {
      if (error) {
        console.error(error);
        return;
      }
      document.getElementById('placa').value = data?.[0]?.placa || '';
    });
}

function abrirGerenciar() {
  document.getElementById('gerenciarMotoristasBox').classList.remove('hidden');
  carregarListaGerenciamento();
}

function fecharGerenciar() {
  document.getElementById('gerenciarMotoristasBox').classList.add('hidden');
}

async function incluirMotorista() {
  const nome = document.getElementById('novoMotorista').value.trim();
  const placa = document.getElementById('novaPlaca').value.trim();
  if (!nome || !placa) return alert('Preencha ambos os campos.');

  const { error } = await supabase.from('motoristas').insert([{ nome, placa }]);
  if (error) {
    alert('Erro ao incluir: ' + error.message);
    console.error(error);
    return;
  }
  alert('Motorista incluído.');
  document.getElementById('novoMotorista').value = '';
  document.getElementById('novaPlaca').value = '';
  carregarMotoristas();
  carregarListaGerenciamento();
}

async function carregarListaGerenciamento() {
  const { data: motoristas, error } = await supabase.from('motoristas').select('id,nome,placa').order('nome');
  if (error) {
    console.error(error);
    return;
  }
  const lista = document.getElementById('listaMotoristas');
  lista.innerHTML = '';

  (motoristas || []).forEach(({ id, nome, placa }) => {
    const div = document.createElement('div');
    div.classList.add('flex', 'justify-between', 'items-center', 'mb-1');

    const span = document.createElement('span');
    span.textContent = `${nome} - ${placa}`;

    const btn = document.createElement('button');
    btn.innerHTML = '🗑️';
    btn.classList.add('text-red-600', 'hover:text-red-800', 'ml-2', 'text-sm');
    btn.title = 'Excluir motorista';
    btn.onclick = async () => {
      const confirmar = confirm(`Deseja excluir o motorista "${nome}"?`);
      if (confirmar) {
        const { error: err } = await supabase.from('motoristas').delete().eq('id', id);
        if (err) {
          alert('Erro ao excluir: ' + err.message);
          console.error(err);
        }
        carregarMotoristas();
        carregarListaGerenciamento();
      }
    };

    div.appendChild(span);
    div.appendChild(btn);
    lista.appendChild(div);
  });
}

async function carregarListaRegistros() {
  const dataSelecionada = document.getElementById('data').value;
  const container = document.getElementById('listaRegistrosPorData');

  // evita erro 400 quando data está vazia
  if (!dataSelecionada) {
    if (container) container.innerHTML = '';
    return;
  }

  const { data: registros, error } = await supabase
    .from('controle_diario')
    .select('motorista, rota, km_rota1, km_rota2, km_adicional')
    .eq('data', dataSelecionada);

  container.innerHTML = '';

  if (error) {
    container.textContent = 'Erro ao buscar registros.';
    console.error(error);
    return;
  }

  if (!registros || registros.length === 0) {
    container.textContent = 'Nenhum registro encontrado para esta data.';
    return;
  }

  const ul = document.createElement('ul');
  registros.forEach(r => {
    const kmTotalCalc = toNum(r.km_rota1) + toNum(r.km_rota2) + toNum(r.km_adicional);
    const li = document.createElement('li');
    li.textContent = `Motorista: ${r.motorista}, Rota: ${r.rota}, KM Total: ${kmTotalCalc.toFixed(2)}`;
    ul.appendChild(li);
  });
  container.appendChild(ul);
}

// Cabeçalho de autenticação: mostra usuário e botão sair (se existir no HTML)
async function initAuthHeader() {
  const userInfo = document.getElementById('userInfo');
  const userName = document.getElementById('userName');
  const btnSair  = document.getElementById('btnSair');

  if (!userInfo || !userName || !btnSair) return; // página sem cabeçalho de auth

  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    let display = null;

    // Busca em usuarios_app por user_id (padrão do seu baseline)
    try {
      const { data: u } = await supabase
        .from('usuarios_app')
        .select('username,nome,email')
        .eq('user_id', user.id)
        .maybeSingle();

      if (u) {
        display = u.username || u.nome || u.email;
      }
    } catch (err) {
      console.error('Erro buscando usuarios_app:', err);
    }

    // Fallback: metadata do Auth
    if (!display && user.user_metadata) {
      display =
        user.user_metadata.username ||
        user.user_metadata.full_name ||
        user.user_metadata.name ||
        null;
    }

    // Fallback final: email
    userName.textContent = display || user.email;
    userInfo.classList.remove('hidden');
  }

  btnSair.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = 'index.html';
  });
}

// disponibiliza para HTML inline
window.abrirGerenciar = abrirGerenciar;
window.fecharGerenciar = fecharGerenciar;
window.incluirMotorista = incluirMotorista;
window.atualizarPlaca = atualizarPlaca;
