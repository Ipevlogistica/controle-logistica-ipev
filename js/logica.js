import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js';

const supabaseUrl = 'https://ilsbyrvnrkutwynujfhs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlsc2J5cnZucmt1dHd5bnVqZmhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzNDAwNDEsImV4cCI6MjA2OTkxNjA0MX0.o56R-bf1Nt3PiqMZbG_ghEPYZzrPnEU-jCdYKkjylTQ';
const supabase = createClient(supabaseUrl, supabaseKey);

document.addEventListener('DOMContentLoaded', async () => {
  await carregarMotoristas();
  carregarListaRegistros();
  document.getElementById('data').value = '';
  document.getElementById('kmAdicional').value = 10;
  document.getElementById('valorGasolina').value = 5.99;

  document.getElementById('formulario').addEventListener('submit', async (e) => {
    e.preventDefault();

    const data = document.getElementById('data').value;
    const motorista = document.getElementById('motorista').value;

    if (!data || !motorista) {
      alert('Preencha todos os campos obrigatórios.');
      return;
    }

    const { data: registrosExistentes, error: erroConsulta } = await supabase
      .from('controle_diario')
      .select('*')
      .eq('data', data)
      .eq('motorista', motorista);

    if (erroConsulta) {
      alert('Erro ao verificar duplicidade.');
      console.error(erroConsulta);
      return;
    }

    if (registrosExistentes && registrosExistentes.length > 0) {
      const desejaEditar = confirm('Este motorista já foi cadastrado nesta data. Deseja editar o registro?');
      if (!desejaEditar) {
        document.getElementById('formulario').reset();
        document.getElementById('kmAdicional').value = 10;
        document.getElementById('valorGasolina').value = 5.99;
        return;
      } else {
        const { error: erroExclusao } = await supabase
          .from('controle_diario')
          .delete()
          .eq('data', data)
          .eq('motorista', motorista);

        if (erroExclusao) {
          alert('Erro ao atualizar registro existente.');
          console.error(erroExclusao);
          return;
        }
      }
    }

    const placa = document.getElementById('placa').value;
    const rota = document.getElementById('rota').value;
    const kmAdicional = parseFloat(document.getElementById('kmAdicional').value);
    const valorGasolina = parseFloat(document.getElementById('valorGasolina').value);
    const km1 = parseFloat(document.getElementById('km1').value);
    const km2 = parseFloat(document.getElementById('km2').value);
    const chegada1 = document.getElementById('chegada1').value;
    const chegada2 = document.getElementById('chegada2').value;

    const kmTotal = (km1 + km2 + kmAdicional).toFixed(2);
    const litros = (kmTotal / 35).toFixed(2);
    const valorTotal = (litros * valorGasolina).toFixed(2);

    const { error: erroInsercao } = await supabase.from('controle_diario').insert([
      { data, motorista, placa, rota, kmAdicional, valorGasolina, km1, km2, chegada1, chegada2, litros, valorTotal, kmTotal }
    ]);

    if (erroInsercao) {
      alert('Erro ao salvar registro.');
      console.error(erroInsercao);
      return;
    }

    alert('Registro salvo com sucesso!');
    document.getElementById('formulario').reset();
    document.getElementById('kmAdicional').value = 10;
    document.getElementById('valorGasolina').value = 5.99;
    carregarListaRegistros();
  });

  document.getElementById('motorista').addEventListener('change', atualizarPlaca);

  document.getElementById('data').addEventListener('change', () => {
    carregarListaRegistros();
  });
});

async function carregarMotoristas() {
  const select = document.getElementById('motorista');
  select.innerHTML = '';

  const optionInicial = document.createElement('option');
  optionInicial.value = '';
  optionInicial.textContent = 'Selecione';
  select.appendChild(optionInicial);

  const { data: motoristas } = await supabase.from('motoristas').select('*');
  motoristas.forEach(({ nome }) => {
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

  supabase.from('motoristas')
    .select('placa')
    .eq('nome', motoristaSelecionado)
    .then(({ data }) => {
      document.getElementById('placa').value = data[0]?.placa || '';
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
  const nome = document.getElementById('novoMotorista').value;
  const placa = document.getElementById('novaPlaca').value;
  if (!nome || !placa) return alert('Preencha ambos os campos.');

  await supabase.from('motoristas').insert([{ nome, placa }]);
  alert('Motorista incluído.');
  document.getElementById('novoMotorista').value = '';
  document.getElementById('novaPlaca').value = '';
  carregarMotoristas();
  carregarListaGerenciamento();
}

async function carregarListaGerenciamento() {
  const { data: motoristas } = await supabase.from('motoristas').select('*');
  const lista = document.getElementById('listaMotoristas');
  lista.innerHTML = '';

  motoristas.forEach(({ id, nome, placa }) => {
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
        await supabase.from('motoristas').delete().eq('id', id);
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
  const { data: registros, error } = await supabase
    .from('controle_diario')
    .select('motorista, rota, kmTotal')
    .eq('data', dataSelecionada);

  const container = document.getElementById('listaRegistrosPorData');
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
    const li = document.createElement('li');
    li.textContent = `Motorista: ${r.motorista}, Rota: ${r.rota}, KM Total: ${r.kmTotal}`;
    ul.appendChild(li);
  });
  container.appendChild(ul);
}

window.abrirGerenciar = abrirGerenciar;
window.fecharGerenciar = fecharGerenciar;
window.incluirMotorista = incluirMotorista;
