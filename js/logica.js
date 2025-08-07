// logica.js

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
const supabase = createClient(
  'https://ilsbyrvnrkutwynujfhs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlsc2J5cnZucmt1dHd5bnVqZmhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzNDAwNDEsImV4cCI6MjA2OTkxNjA0MX0.o56R-bf1Nt3PiqMZbG_ghEPYZzrPnEU-jCdYKkjylTQ'
);

let motoristas = {};

async function carregarMotoristas() {
  const { data, error } = await supabase.from('motoristas').select('*');
  if (error) return alert("Erro ao carregar motoristas: " + error.message);
  motoristas = {};
  document.getElementById("motorista").innerHTML = '<option value="">Selecione</option>';
  data.forEach(({ motorista, placa }) => {
    motoristas[motorista] = placa;
    const option = document.createElement("option");
    option.value = motorista;
    option.textContent = motorista;
    document.getElementById("motorista").appendChild(option);
  });
  atualizarListaMotoristas();
}

async function salvarMotorista(motorista, placa) {
  const { error } = await supabase.from('motoristas').insert([{ motorista, placa }]);
  if (error) alert("Erro ao salvar motorista: " + error.message);
}

async function deletarMotorista(motorista) {
  const { error } = await supabase.from('motoristas').delete().eq('motorista', motorista);
  if (error) alert("Erro ao excluir motorista: " + error.message);
}

window.incluirMotorista = async function () {
  const motorista = document.getElementById("novoMotorista").value.trim();
  const placa = document.getElementById("novaPlaca").value.trim();
  if (motorista && placa && confirm(`Deseja incluir "${motorista}" com placa "${placa}"?`)) {
    await salvarMotorista(motorista, placa);
    document.getElementById("novoMotorista").value = "";
    document.getElementById("novaPlaca").value = "";
    carregarMotoristas();
  }
};

window.excluirMotorista = async function (motorista) {
  if (confirm(`Deseja excluir "${motorista}"?`)) {
    await deletarMotorista(motorista);
    carregarMotoristas();
    document.getElementById("placa").value = "";
  }
};

function atualizarListaMotoristas() {
  const lista = document.getElementById("listaMotoristas");
  lista.innerHTML = "";
  for (const nome in motoristas) {
    const item = document.createElement("div");
    item.className = "flex justify-between items-center border-b py-1";
    item.innerHTML = `
      <div><strong>${nome}</strong> - Placa: ${motoristas[nome]}</div>
      <button onclick="excluirMotorista('${nome}')" class="text-red-600 hover:underline">Excluir</button>
    `;
    lista.appendChild(item);
  }
}

window.abrirGerenciar = () => document.getElementById("gerenciarMotoristasBox").classList.remove("hidden");
window.fecharGerenciar = () => document.getElementById("gerenciarMotoristasBox").classList.add("hidden");

window.atualizarPlaca = () => {
  const nome = document.getElementById("motorista").value;
  document.getElementById("placa").value = motoristas[nome] || "";
};

function calcularLitrosPorKm() {
  const km1 = parseFloat(document.getElementById("kmRota1")?.value) || 0;
  const km2 = parseFloat(document.getElementById("kmRota2")?.value) || 0;
  const kmAdic = parseFloat(document.getElementById("kmAdicional")?.value) || 0;
  const litros = (km1 + km2 + kmAdic) / 35;
  document.getElementById("combustivelConsumido").value = litros.toFixed(2);
  calcularValorTotal();
}

function calcularValorTotal() {
  const litros = parseFloat(document.getElementById("combustivelConsumido").value) || 0;
  const preco = parseFloat(document.getElementById("valorGasolina").value) || 0;
  document.getElementById("valorTotalGasto").value = (litros * preco).toFixed(2);
}

document.getElementById("btnSalvar").addEventListener("click", async () => {
  const data = {
    data: document.getElementById("data").value,
    motorista: document.getElementById("motorista").value,
    placa: document.getElementById("placa").value,
    rota: document.getElementById("rota").value,
    chegada1: document.getElementById("chegada1").value,
    chegada2: document.getElementById("chegada2").value,
    km_rota1: +document.getElementById("kmRota1").value || 0,
    km_rota2: +document.getElementById("kmRota2").value || 0,
    km_adicional: +document.getElementById("kmAdicional").value || 0,
    combustivel_consumido: +document.getElementById("combustivelConsumido").value || 0,
    valor_gasolina: +document.getElementById("valorGasolina").value || 0,
    valor_total_gasto: +document.getElementById("valorTotalGasto").value || 0,
  };

  const { error } = await supabase.from("controle_diario").insert([data]);
  if (error) {
    alert("Erro ao salvar: " + error.message);
  } else {
    alert("Dados salvos com sucesso!");

    document.getElementById("data").value = "";
    document.getElementById("motorista").value = "";
    document.getElementById("placa").value = "";
    document.getElementById("rota").value = "";
    document.getElementById("chegada1").value = "";
    document.getElementById("chegada2").value = "";
    document.getElementById("kmRota1").value = "";
    document.getElementById("kmRota2").value = "";
    document.getElementById("combustivelConsumido").value = "";
    document.getElementById("valorTotalGasto").value = "";
  }
});

window.addEventListener("DOMContentLoaded", () => {
  carregarMotoristas();
  ['kmRota1', 'kmRota2', 'kmAdicional'].forEach(id => {
    document.getElementById(id)?.addEventListener("input", calcularLitrosPorKm);
  });
  document.getElementById("valorGasolina")?.addEventListener("input", calcularValorTotal);
});
