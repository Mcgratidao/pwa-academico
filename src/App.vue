<template>
  <div id="app" class="app-wrapper">
    <header :class="['main-header', zonaAtiva === 'saude' ? 'bg-green-dark' : 'bg-amber-dark']">
      <div class="header-content">
        <p class="current-date">{{ dataAtual }}</p>
        <h1 class="title">{{ zonaAtiva === 'saude' ? 'Saúde' : 'Gestão Acadêmica' }}</h1>
        <div class="tab-container">
          <button @click="mudarZona('academico')" :class="{ active: zonaAtiva === 'academico' }">Estudos</button>
          <button @click="mudarZona('saude')" :class="{ active: zonaAtiva === 'saude' }">Saúde</button>
        </div>
      </div>
    </header>

    <main class="content-body">
      <div v-if="zonaAtiva === 'academico'" class="fade-anim">
        <section class="card-glass">
          <h3 class="card-label">{{ idEditando ? 'Editar Disciplina' : 'Nova Disciplina' }}</h3>
          <div class="form-grid">
            <input v-model="novaMateria.nome" placeholder="Nome da Matéria" class="input-pro" />
            <div class="flex-row">
              <select v-model.number="novaMateria.diaSemana" class="input-pro">
                <option value="">Dia da Aula</option>
                <option v-for="(dia, idx) in diasSemanaPt" :key="idx" :value="idx">{{ dia }}</option>
              </select>
              <select v-model.number="novaMateria.limiteFaltas" class="input-pro">
                <option :value="2">Limite: 2</option>
                <option :value="5">Limite: 5</option>
              </select>
            </div>
            <button @click="salvarMateria" class="btn-main-amber">
              {{ idEditando ? 'Salvar Alterações' : 'Adicionar Matéria' }}
            </button>
            <button v-if="idEditando" @click="cancelarEdicao" class="btn-cancel">Cancelar</button>
          </div>
        </section>

        <div v-for="m in materias" :key="m.id" class="materia-card" 
             :class="{ 'materia-selected': materiaSelecionada?.id === m.id }"
             @click="materiaSelecionada = m">
          
          <div class="line-1">
            <div class="info-meta">
              <span class="badge-day">{{ diasSemanaPt[m.diaSemana] }}</span>
              <h4 class="subject-name">{{ m.nome }}</h4>
            </div>
            <div class="action-btns">
              <button @click.stop="prepararEdicao(m)" class="btn-tool">✏️</button>
              <button @click.stop="excluirMateria(m.id)" class="btn-tool">🗑️</button>
            </div>
          </div>

          <div class="line-2">
            <div class="faltas-info">
              <span>Faltas: <strong>{{ contarFaltas(m.id) }}</strong> / {{ m.limiteFaltas || 5 }}</span>
            </div>
            <div class="progress-track">
              <div class="progress-bar" 
                   :style="{ width: (contarFaltas(m.id) / (m.limiteFaltas || 5) * 100) + '%' }"
                   :class="statusCor(m)">
              </div>
            </div>
          </div>
        </div>

        <section class="card-calendar">
          <h3 class="cal-title">{{ materiaSelecionada ? materiaSelecionada.nome : 'Calendário Geral' }}</h3>
          <VDatePicker 
            expanded borderless transparent
            :attributes="materiaSelecionada ? atributosCalendario(materiaSelecionada.id) : atributosGerais"
            @dayclick="abrirModal"
            color="yellow"
          />
        </section>
      </div>

      <div v-if="zonaAtiva === 'saude'" class="fade-anim">
        <section class="card-glass">
          <input v-model="novoSaude.nome" placeholder="Novo hábito..." class="input-pro" />
          <button @click="salvarSaude" class="btn-main-green">Salvar</button>
        </section>
        <div v-for="s in listaSaude" :key="s.id" class="materia-card health-border">
          <div class="line-1">
            <h4 class="subject-name">{{ s.nome }}</h4>
            <button @click.stop="excluirSaude(s.id)" class="btn-tool">🗑️</button>
          </div>
        </div>
      </div>
    </main>

    <div v-if="dataFocada" class="modal-backdrop" @click.self="dataFocada = null">
      <div class="modal-box">
        <p>{{ dataFocada.id }}</p>
        <h3>{{ materiaSelecionada?.nome }}</h3>
        <div class="modal-grid">
          <button @click="registrar('Presença')" class="btn-p">Presença ✅</button>
          <button @click="registrar('Falta')" class="btn-f">Falta ❌</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { db } from './firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore";

const zonaAtiva = ref('academico');
const materias = ref([]);
const presencas = ref([]);
const listaSaude = ref([]);
const materiaSelecionada = ref(null);
const dataFocada = ref(null);
const idEditando = ref(null);

const dataAtual = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' });
const diasSemanaPt = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const novaMateria = ref({ nome: '', diaSemana: '', limiteFaltas: 5, semestre: 1 });
const novoSaude = ref({ nome: '' });

// Funções de Dados
const buscarDados = async () => {
  try {
    const [m, p, s] = await Promise.all([
      getDocs(collection(db, "materias")),
      getDocs(collection(db, "presencas")),
      getDocs(collection(db, "saude"))
    ]);
    materias.value = m.docs.map(d => ({id: d.id, ...d.data()}));
    presencas.value = p.docs.map(d => ({id: d.id, ...d.data()}));
    listaSaude.value = s.docs.map(d => ({id: d.id, ...d.data()}));
  } catch (e) { console.error("Erro ao buscar:", e); }
};

const salvarMateria = async () => {
  if (!novaMateria.value.nome) return;
  if (idEditando.value) {
    await updateDoc(doc(db, "materias", idEditando.value), novaMateria.value);
    idEditando.value = null;
  } else {
    await addDoc(collection(db, "materias"), novaMateria.value);
  }
  novaMateria.value = { nome: '', diaSemana: '', limiteFaltas: 5, semestre: 1 };
  buscarDados();
};

const prepararEdicao = (m) => { idEditando.value = m.id; novaMateria.value = { ...m }; };
const cancelarEdicao = () => { idEditando.value = null; novaMateria.value = { nome: '', diaSemana: '', limiteFaltas: 5, semestre: 1 }; };

const registrar = async (tipo) => {
  if (!materiaSelecionada.value) return;
  await addDoc(collection(db, "presencas"), { 
    materiaId: materiaSelecionada.value.id, 
    data: dataFocada.value.id, 
    dataOriginal: dataFocada.value.date, 
    tipo 
  });
  dataFocada.value = null;
  buscarDados();
};

const contarFaltas = (id) => presencas.value.filter(p => p.materiaId === id && p.tipo === 'Falta').length;
const statusCor = (m) => {
  const f = contarFaltas(m.id);
  const lim = m.limiteFaltas || 5;
  if (f >= lim) return 'bg-red';
  if (f >= lim - 1) return 'bg-orange';
  return 'bg-amber';
};

// Calendário
const atributosGerais = computed(() => presencas.value.map(p => ({
  highlight: { color: p.tipo === 'Presença' ? 'green' : 'red', fillMode: 'light' },
  dates: p.dataOriginal.toDate ? p.dataOriginal.toDate() : new Date(p.dataOriginal)
})));

const atributosCalendario = (id) => presencas.value.filter(p => p.materiaId === id).map(p => ({
  highlight: { color: p.tipo === 'Presença' ? 'green' : 'red', fillMode: 'solid' },
  dates: p.dataOriginal.toDate ? p.dataOriginal.toDate() : new Date(p.dataOriginal)
}));

const abrirModal = (day) => {
  if (zonaAtiva.value === 'academico' && !materiaSelecionada.value) return;
  dataFocada.value = day;
};

const mudarZona = (z) => { zonaAtiva.value = z; materiaSelecionada.value = null; };
const excluirMateria = async (id) => { if(confirm('Excluir?')) { await deleteDoc(doc(db, "materias", id)); buscarDados(); } };

onMounted(buscarDados);
</script>

<style scoped>
.app-wrapper { max-width: 480px; margin: 0 auto; min-height: 100vh; background: #FAF9F6; font-family: sans-serif; color: #333; }

/* HEADERS - CORES SÓBRIAS */
.bg-amber-dark { background: #B45309; } /* Ocre */
.bg-green-dark { background: #064E3B; } /* Verde Musgo */
.main-header { padding: 40px 20px 30px; border-radius: 0 0 30px 30px; color: white; }
.current-date { font-size: 0.8rem; opacity: 0.8; text-transform: uppercase; font-weight: bold; }
.title { font-size: 1.8rem; margin: 5px 0 20px; }

.tab-container { display: flex; background: rgba(0,0,0,0.2); padding: 4px; border-radius: 12px; }
.tab-container button { flex: 1; border: none; background: transparent; color: white; padding: 10px; font-weight: bold; border-radius: 10px; }
.tab-container button.active { background: white; color: #333; }

/* CARDS */
.content-body { padding: 15px; }
.card-glass { background: white; padding: 20px; border-radius: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); margin-bottom: 20px; }
.input-pro { width: 100%; height: 45px; background: #F3F4F6; border: 1px solid #E5E7EB; border-radius: 10px; padding: 0 12px; margin-bottom: 10px; box-sizing: border-box; }
.flex-row { display: flex; gap: 10px; }
.btn-main-amber { width: 100%; padding: 14px; background: #B45309; color: white; border: none; border-radius: 10px; font-weight: bold; }
.btn-main-green { width: 100%; padding: 14px; background: #064E3B; color: white; border: none; border-radius: 10px; font-weight: bold; }

/* DESIGN EM 2 LINHAS */
.materia-card { background: white; border-radius: 18px; padding: 16px; margin-bottom: 12px; border: 1px solid #E5E7EB; }
.materia-selected { border: 2px solid #B45309; background: #FFFBEB; }

.line-1 { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.badge-day { font-size: 0.7rem; background: #FEF3C7; color: #B45309; padding: 4px 8px; border-radius: 6px; font-weight: bold; }
.subject-name { font-size: 1.1rem; margin: 4px 0 0; }
.btn-tool { background: #F3F4F6; border: none; padding: 8px; border-radius: 8px; cursor: pointer; margin-left: 5px; }

.line-2 { display: flex; flex-direction: column; gap: 8px; }
.faltas-info { font-size: 0.85rem; }
.progress-track { width: 100%; height: 8px; background: #E5E7EB; border-radius: 4px; overflow: hidden; }
.progress-bar { height: 100%; transition: 0.4s; }

/* CORES BARRA */
.bg-amber { background: #B45309; }
.bg-orange { background: #F59E0B; }
.bg-red { background: #EF4444; }

/* CALENDÁRIO */
.card-calendar { background: white; padding: 15px; border-radius: 20px; border: 1px solid #E5E7EB; margin-top: 20px; }
.cal-title { font-size: 1rem; margin-bottom: 15px; text-align: center; }

/* MODAL */
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal-box { background: white; width: 85%; padding: 25px; border-radius: 20px; text-align: center; }
.modal-grid { display: flex; gap: 10px; margin-top: 20px; }
.btn-p { flex: 1; padding: 15px; background: #064E3B; color: white; border: none; border-radius: 12px; font-weight: bold; }
.btn-f { flex: 1; padding: 15px; background: #EF4444; color: white; border: none; border-radius: 12px; font-weight: bold; }

.fade-anim { animation: fadeIn 0.3s ease; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
</style>

