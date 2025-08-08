<script type="module">
  import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
  const supabase = createClient(
    'https://ilsbyrvnrkutwynujfhs.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlsc2J5cnZucmt1dHd5bnVqZmhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzNDAwNDEsImV4cCI6MjA2OTkxNjA0MX0.o56R-bf1Nt3PiqMZbG_ghEPYZzrPnEU-jCdYKkjylTQ'
  );

  let motoristas = {};
  let idEdicao = null;

  async function carregarMotoristas() {
    const { data, error } = await supabase.from('motoristas').select('*');
    if (error) return alert("Erro ao carregar motoristas: " + error.message);
    motoristas = {};
    document.getElementById("motorista").innerHTML = '<option value="">Selecione</option>';
    data.forEach(({ nome, placa }) => {
      motoristas[nome] = placa;
      const option = document.createElement("option");
      option.value = nome;
      option.textContent = nome;
      document.getElementById("motorista").appendChild(option);
    });
    atualizarListaMotoristas();
  }

  async function salvarMotorista(nome, placa) {
    const { error } = await supabase.from('motoristas').insert([{ nome, placa }]);
    if (error) alert("Erro ao salvar motorista: " + error.message);
  }

  async function deletarMotorista(nome) {
    const { error } = await supabase.from('motoristas').delete().eq('nome', nome);
    if (error) alert("Erro ao excluir motorista: " + error.message);
  }

  window.incluirMotorista = async function () {
    const nome = document.getElementById("novoMotorista").value.trim();
    const placa = document.getElementById("novaPlaca").value.trim();
    if (nome && placa && confirm(`Deseja incluir "${nome}" com placa "${placa}"?`)) {
      await salvarMotorista(nome, placa);
      document.getElementById("novoMotorista").value = "";
      document.getElementById("novaPlaca").value = "";
      carregarMotoristas();
    }
  };

  window.excluirMotorista = async function (nome) {
    if (confirm(`Deseja excluir "${nome}"?`)) {
      await deletarMotorista(nome);
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

  async function buscarRegistrosPorData(dataSelecionada) {
    const { data, error } = await supabase
      .from("controle_diario")
      .select("*")
      .eq("data", dataSelecionada)
      .order("motorista", { ascending: true });

    const container = document.getElementById("listaRegistrosPorData");
    if (error || !data) {
      container.innerHTML = "<p class='text-red-600'>Erro ao carregar registros.</p>";
      return;
    }

    if (data.length === 0) {
      container.innerHTML = "<p class='text-gray-600'>Nenhum registro encontrado para a data selecionada.</p>";
      return;
    }

    const linhas = data.map(r => `
      <tr class="border-t">
        <td class="px-2 py-1">${r.motorista}</td>
        <td class="px-2 py-1">${r.placa}</td>
        <td class="px-2 py-1">${r.rota}</td>
        <td class="px-2 py-1">${r.km_rota1}</td>
        <td class="px-2 py-1">${r.km_rota2}</td>
        <td class="px-2 py-1">${r.km_adicional}</td>
        <td class="px-2 py-1">${r.combustivel_consumido.toFixed(2)}</td>
        <td class="px-2 py-1">R$ ${r.valor_total_gasto.toFixed(2)}</td>
      </tr>
    `).join("");

    container.innerHTML = `
      <div class="overflow-x-auto">
        <table class="min-w-full text-sm text-left border">
          <thead class="bg-blue-100 font-semibold">
            <tr>
              <th class="px-2 py-1">Motorista</th>
              <th class="px-2 py-1">Placa</th>
              <th class="px-2 py-1">Rota</th>
              <th class="px-2 py-1">KM Rota 1</th>
              <th class="px-2 py-1">KM Rota 2</th>
              <th class="px-2 py-1">Adicional</th>
              <th class="px-2 py-1">Litros</th>
              <th class="px-2 py-1">Total</th>
            </tr>
          </thead>
          <tbody>${linhas}</tbody>
        </table>
      </div>
    `;
  }

  document.getElementById("btnSalvar").addEventListener("click", async () => {
    const dataSelecionada = document.getElementById("data").value;
    const motorista = document.getElementById("motorista").value;

    const { data: registrosExistentes, error: erroBusca } = await supabase
      .from("controle_diario")
      .select("*")
      .eq("data", dataSelecionada)
      .eq("motorista", motorista);

    if (erroBusca) {
      alert("Erro ao verificar duplicidade: " + erroBusca.message);
      return;
    }

    if (registrosExistentes.length > 0) {
      const desejaEditar = confirm(`Este motorista já foi cadastrado no dia ${dataSelecionada}.\n\nDeseja editar o registro existente?`);
      if (desejaEditar) {
        const registro = registrosExistentes[0];
        idEdicao = registro.id;
        document.getElementById("placa").value = registro.placa;
        document.getElementById("rota").value = registro.rota;
        document.getElementById("chegada1").value = registro.chegada1;
        document.getElementById("chegada2").value = registro.chegada2;
        document.getElementById("kmRota1").value = registro.km_rota1;
        document.getElementById("kmRota2").value = registro.km_rota2;
        document.getElementById("combustivelConsumido").value = registro.combustivel_consumido;
        document.getElementById("valorGasolina").value = registro.valor_gasolina;
        document.getElementById("valorTotalGasto").value = registro.valor_total_gasto;
        document.getElementById("btnSalvar").textContent = "Atualizar";
      } else {
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
      return;
    }

    const dados = {
      data: dataSelecionada,
      motorista,
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

    let resultado;
    if (idEdicao) {
      resultado = await supabase.from("controle_diario").update(dados).eq("id", idEdicao);
      alert("Registro atualizado com sucesso!");
      idEdicao = null;
      document.getElementById("btnSalvar").textContent = "Salvar";
    } else {
      resultado = await supabase.from("controle_diario").insert([dados]);
      alert("Dados salvos com sucesso!");
    }

    if (resultado.error) {
      alert("Erro ao salvar: " + resultado.error.message);
      return;
    }

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
  });

  window.addEventListener("DOMContentLoaded", () => {
    carregarMotoristas();
    ['kmRota1', 'kmRota2', 'kmAdicional'].forEach(id => {
      document.getElementById(id)?.addEventListener("input", calcularLitrosPorKm);
    });
    document.getElementById("valorGasolina")?.addEventListener("input", calcularValorTotal);
    document.getElementById("data").addEventListener("change", () => {
      const dataSelecionada = document.getElementById("data").value;
      if (dataSelecionada) buscarRegistrosPorData(dataSelecionada);
    });
  });
</script>

