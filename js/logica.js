// logica.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient(
  'https://ilsbyrvnrkutwynujfhs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlsc2J5cnZucmt1dHd5bnVqZmhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzNDAwNDEsImV4cCI6MjA2OTkxNjA0MX0.o56R-bf1Nt3PiqMZbG_ghEPYZzrPnEU-jCdYKkjylTQ'
);


'
);

let motoristas = {};

window.abrirGerenciar = function () {
  document.getElementById("gerenciarMotoristasBox").classList.remove("hidden");
  carregarMotoristas();
};

window.fecharGerenciar = function () {
  document.getElementById("gerenciarMotoristasBox").classList.add("hidden");
};

window.atualizarPlaca = function () {
  const select = document.getElementById("motorista");
  const placa = motoristas[select.value];
  document.getElementById("placa").value = placa || "";
};

window.incluirMotorista = async function () {
  const nome = document.getElementById("novoMotorista").value.trim();
  const placa = document.getElementById("novaPlaca").value.trim();
  if (!nome || !placa) return alert("Preencha todos os campos.");
  if (!confirm(`Deseja incluir ${nome} com placa ${placa}?`)) return;

  await supabase.from("motoristas").insert([{ nome, placa }]);
  document.getElementById("novoMotorista").value = "";
  document.getElementById("novaPlaca").value = "";
  carregarMotoristas();
  atualizarListaMotoristas();
};

window.excluirMotorista = async function (nome) {
  if (!confirm(`Deseja excluir ${nome}?`)) return;
  await supabase.from("motoristas").delete().eq("nome", nome);
  carregarMotoristas();
  atualizarListaMotoristas();
};

async function carregarMotoristas() {
  const { data, error } = await supabase.from("motoristas").select("*");
  if (error) return alert("Erro ao carregar motoristas: " + error.message);

  const select = document.getElementById("motorista");
  if (select) {
    select.innerHTML = "<option value=''>Selecione</option>";
  }
  const lista = document.getElementById("listaMotoristas");
  if (lista) lista.innerHTML = "";

  motoristas = {};
  data.forEach(m => {
    motoristas[m.nome] = m.placa;
    if (select) {
      const opt = document.createElement("option");
      opt.value = m.nome;
      opt.textContent = m.nome;
      select.appendChild(opt);
    }
    if (lista) {
      const div = document.createElement("div");
      div.className = "flex justify-between items-center border-b py-1";
      div.innerHTML = `<span><strong>${m.nome}</strong> - Placa: ${m.placa}</span>
        <button onclick="excluirMotorista('${m.nome}')" class="text-sm text-red-600 hover:underline">Excluir</button>`;
      lista.appendChild(div);
    }
  });
}

function atualizarListaMotoristas() {
  const lista = document.getElementById("listaMotoristas");
  if (!lista) return;
  lista.innerHTML = "";
  Object.keys(motoristas).forEach(nome => {
    const div = document.createElement("div");
    div.className = "flex justify-between items-center border-b py-1";
    div.innerHTML = `<span><strong>${nome}</strong> - Placa: ${motoristas[nome]}</span>
      <button onclick="excluirMotorista('${nome}')" class="text-sm text-red-600 hover:underline">Excluir</button>`;
    lista.appendChild(div);
  });
}

// Rotas fixas
window.onload = () => {
  carregarMotoristas();
  const rotaSelect = document.getElementById("rota");
  if (rotaSelect && rotaSelect.tagName.toLowerCase() === 'select') {
    const rotas = ["A", "B", "C", "D", "E", "F", "G", "H","A/D","B/G"];
    rotas.forEach(r => {
      const opt = document.createElement("option");
      opt.value = r;
      opt.textContent = r;
      rotaSelect.appendChild(opt);
    });
  }

  document.getElementById("valorGasolina").value = 5.99;
  document.getElementById("kmAdicional").value = 10;
};
