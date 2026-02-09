<template>
  <div id="app" class="mobile-container">
    <header :class="zonaAtiva === 'saude' ? 'header-green' : 'header-yellow'">
      <div class="header-content">
        <span class="day-label">{{ dataAtual }}</span>
        <h1>{{ zonaAtiva === 'saude' ? 'Minha Saúde' : 'Meu Acadêmico' }}</h1>
        <div class="tabs-modern">
          <button @click="mudarZona('academico')" :class="{ active: zonaAtiva === 'academico' }">Estudos</button>
          <button @click="mudarZona('saude')" :class="{ active: zonaAtiva === 'saude' }">Saúde</button>
        </div>
      </div>
    </header>

    <main class="main-content fade-in">
      <div v-if="zonaAtiva === 'academico'">
        <section class="card shadow-premium border-accent">
          <div class="card-header">
            <h3 class="section-title">{{ idEditando ? 'Editar Matéria' : 'Nova Disciplina' }}</h3>
            <button v-if="idEditando" @click="cancelarEdicao" class="btn-cancel-text">Cancelar</button>
          </div>
          <div class="form-group">
            <input v-model="novaMateria.nome" placeholder="Nome da Disciplina" class="input-modern" />
            <div class="row-flex">
              <select v-model.number="novaMateria.semestre" class="input-modern flex-1">
                <option value="1">1º Semestre</option>
                <option value="2">2º Semestre</option>
              </select>
              <select v-model.number="novaMateria.diaSemana" class="input-modern flex-1">
                <option value="">Dia da Aula</option>
                <option v-for="(n, i) in diasSemanaPt" :key="i" :value="i">{{ n }}</option>
              </select>
            </div>
            <select v-model.number="novaMateria.limiteFaltas" class="input-modern">
              <option :value="2">Limite: 2 Faltas</option>
              <option :value="5">Limite: 5 Faltas</option>
            </select>
            <button @click="salvarMateria" :class="idEditando ? 'btn-update' : 'btn-primary-yellow'">
              {{ idEditando ? 'Salvar Alterações' : 'Adicionar Matéria' }}
            </button>
          </div>
        </section>

        <div v-for="sem in [1, 2]" :key="sem" class="semester-section">
          <div class="folder-pill" @click="togglePasta(sem)" :class="{ 'folder-active': pastaAberta === sem }">
            <span class="folder-text">📂 {{ sem }}º Semestre</span>
            <span class="count-badge">{{ filtrarPorSemestre(sem).length }}</span>
          </div>

          <div v-if="pastaAberta === sem" class="folder-list">
            <div v-for="m in filtrarPorSemestre(sem)" :key="m.id"
                 @click="materiaSelecionada = m"
                 :class="['materia-card-new', { 'materia-selected': materiaSelecionada?.id === m.id }]">
              
              <div class="m-card-row-top">
                <strong>{{ m.nome }}</strong>
                <span class="materia-day-chip">
                  {{ diasSemanaPt[m.diaSemana] ? diasSemanaPt[m.diaSemana].substring(0,3) : '---' }}
                </span>
              </div>

              <div class="m-card-row-bottom">
                <div class="falta-display">
                  <span class="falta-val" :class="statusFalta(m)">
                    {{ contarFaltas(m.id) }} / {{ m.limiteFaltas || 5 }} Faltas
                  </span>
                </div>
                
                <div class="materia-controls-horizontal">
                  <button @click.stop="prepararEdicao(m)" class="tool-btn edit">✏️</button>
                  <button @click.stop="excluirMateria(m.id)" class="tool-btn delete">🗑️</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <section class="card calendar-card shadow-premium">
          <div class="calendar-nav">
            <h3>{{ materiaSelecionada ? materiaSelecionada.nome : 'Calendário Geral' }}</h3>
            <button v-if="materiaSelecionada" @click="materiaSelecionada = null" class="btn-reset">Ver Geral</button>
          </div>
          <VDatePicker
            expanded transparent borderless
            :attributes="materiaSelecionada ? atributosCalendario(materiaSelecionada.id) : atributosGerais"
            @dayclick="abrirModal"
            :color="materiaSelecionada ? 'yellow' : 'orange'"
          />
        </section>
      </div>

      <div v-if="zonaAtiva === 'saude'">
        </div>
    </main>

    <div v-if="dataFocada" class="modal-overlay" @click.self="dataFocada = null">
      <div class="modal-sheet animate-up">
        <p class="modal-label">{{ dataFocada.id }}</p>
        <h2>{{ materiaSelecionada?.nome || 'Registro' }}</h2>
        <div class="modal-buttons" v-if="materiaSelecionada">
           <button @click="registrar('Presença')" class="m-btn btn-presenca">Presença ✅</button>
           <div class="m-row-flex">
              <button @click="registrar('Falta')" class="m-btn btn-falta">Falta ❌</button>
              <button @click="registrar('EAD')" class="m-btn btn-ead">EAD 💻</button>
           </div>
        </div>
        <button @click="dataFocada = null" class="btn-close-modal">Fechar</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { db } from './firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore";

const zonaAtiva = ref('academico');
const pastaAberta = ref(1);
const idEditando = ref(null);
const dataAtual = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' });
const diasSemanaPt = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const materias = ref([]);
const presencas = ref([]);
const listaSaude = ref([]);
const registrosSaude = ref([]);
const materiaSelecionada = ref(null);
const dataFocada = ref(null);

const novaMateria = ref({ nome: '', diaSemana: '', semestre: 1, limiteFaltas: 5 });

const buscarDados = async () => {
  try {
    const [m, p, s, rs] = await Promise.all([
      getDocs(collection(db, "materias")),
      getDocs(collection(db, "presencas")),
      getDocs(collection(db, "saude")),
      getDocs(collection(db, "registrosSaude"))
    ]);
    materias.value = m.docs.map(d => ({id: d.id, ...d.data()}));
    presencas.value = p.docs.map(d => ({id: d.id, ...d.data()}));
    listaSaude.value = s.docs.map(d => ({id: d.id, ...d.data()}));
    registrosSaude.value = rs.docs.map(d => ({id: d.id, ...d.data()}));
  } catch (e) { console.error(e); }
};

const salvarMateria = async () => {
  if(!novaMateria.value.nome) return;
  if(idEditando.value) {
    await updateDoc(doc(db, "materias", idEditando.value), novaMateria.value);
    idEditando.value = null;
  } else {
    await addDoc(collection(db, "materias"), novaMateria.value);
  }
  novaMateria.value = { nome: '', diaSemana: '', semestre: 1, limiteFaltas: 5 };
  buscarDados();
};

const prepararEdicao = (m) => { idEditando.value = m.id; novaMateria.value = { ...m }; };
const cancelarEdicao = () => { idEditando.value = null; novaMateria.value = { nome: '', diaSemana: '', semestre: 1, limiteFaltas: 5 }; };

const registrar = async (tipo) => {
  if(!materiaSelecionada.value) return;
  await addDoc(collection(db, "presencas"), { materiaId: materiaSelecionada.value.id, data: dataFocada.value.id, dataOriginal: dataFocada.value.date, tipo });
  dataFocada.value = null;
  buscarDados();
};

const filtrarPorSemestre = (sem) => materias.value.filter(m => m.semestre === sem);
const contarFaltas = (id) => presencas.value.filter(p => p.materiaId === id && p.tipo === 'Falta').length;

const statusFalta = (m) => {
  const f = contarFaltas(m.id);
  const lim = m.limiteFaltas || 5;
  if (f >= lim) return 'f-red';
  if (f >= lim - 1) return 'f-orange';
  return 'f-gray';
};

const atributosGerais = computed(() => presencas.value.map(p => ({
  highlight: { color: p.tipo === 'Presença' ? 'green' : (p.tipo === 'EAD' ? 'blue' : 'red'), fillMode: 'light' },
  dates: p.dataOriginal.toDate ? p.dataOriginal.toDate() : new Date(p.dataOriginal)
})));

const atributosCalendario = (id) => presencas.value.filter(p => p.materiaId === id).map(p => ({
  highlight: { color: p.tipo === 'Presença' ? 'green' : (p.tipo === 'EAD' ? 'blue' : 'red'), fillMode: 'solid' },
  dates: p.dataOriginal.toDate ? p.dataOriginal.toDate() : new Date(p.dataOriginal)
}));

const abrirModal = (day) => dataFocada.value = day;
const mudarZona = (z) => { zonaAtiva.value = z; materiaSelecionada.value = null; };
const togglePasta = (s) => pastaAberta.value = pastaAberta.value === s ? null : s;

const excluirMateria = async (id) => {
  if(confirm('Excluir?')) {
    await deleteDoc(doc(db, "materias", id));
    buscarDados();
  }
};

onMounted(buscarDados);
</script>

<style scoped>
.mobile-container { max-width: 480px; margin: 0 auto; min-height: 100vh; background: #f1f5f9; color: #1e293b; font-family: sans-serif; }
.main-content { padding: 15px; padding-bottom: 100px; }

/* HEADERS */
.header-yellow { background: #b45309; padding: 30px 20px; border-radius: 0 0 30px 30px; color: white; }
.header-green { background: #065f46; padding: 30px 20px; border-radius: 0 0 30px 30px; color: white; }

.tabs-modern { display: flex; background: rgba(0,0,0,0.2); padding: 4px; border-radius: 12px; margin-top: 15px; }
.tabs-modern button { flex: 1; border: none; padding: 10px; border-radius: 10px; font-weight: bold; background: transparent; color: white; }
.tabs-modern button.active { background: white; color: #1e293b; }

/* CARDS */
.card { background: white; border-radius: 20px; padding: 20px; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
.border-accent { border-top: 4px solid #b45309; }

/* NOVO CARD EM 2 LINHAS */
.materia-card-new { 
  background: white; border-radius: 18px; padding: 16px; margin-top: 10px; 
  border: 1px solid #e2e8f0; transition: 0.2s;
}
.materia-selected { border: 2px solid #b45309; background: #fffbeb; }

.m-card-row-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.m-card-row-top strong { font-size: 1.1rem; }
.materia-day-chip { background: #f1f5f9; font-size: 0.7rem; font-weight: 800; padding: 4px 10px; border-radius: 8px; color: #64748b; }

.m-card-row-bottom { display: flex; justify-content: space-between; align-items: center; }
.falta-val { font-size: 0.85rem; font-weight: 700; padding: 4px 10px; border-radius: 8px; }

.materia-controls-horizontal { display: flex; gap: 8px; }
.tool-btn { width: 36px; height: 36px; border-radius: 10px; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.edit { background: #eff6ff; color: #3b82f6; }
.delete { background: #fff1f2; color: #ef4444; }

/* INPUTS */
.input-modern { width: 100%; height: 48px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 0 15px; margin-bottom: 10px; box-sizing: border-box; }
.row-flex { display: flex; gap: 10px; }
.flex-1 { flex: 1; }
.btn-primary-yellow { width: 100%; height: 50px; background: #b45309; border: none; border-radius: 12px; font-weight: bold; color: white; }

/* MODAL */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: flex-end; z-index: 100; }
.modal-sheet { background: white; width: 100%; border-radius: 25px 25px 0 0; padding: 25px; box-sizing: border-box; }
.m-btn { width: 100%; height: 55px; border-radius: 15px; border: none; font-weight: bold; color: white; margin-bottom: 10px; }
.m-row-flex { display: flex; gap: 10px; }
.btn-presenca { background: #065f46; }
.btn-falta { background: #dc2626; }
.btn-ead { background: #2563eb; }

/* FOLDERS */
.folder-pill { background: #fff; padding: 15px; border-radius: 15px; display: flex; justify-content: space-between; margin-top: 10px; border: 1px solid #e2e8f0; }
.count-badge { background: #1e293b; color: white; padding: 2px 8px; border-radius: 8px; font-size: 0.7rem; }

.f-gray { background: #f1f5f9; color: #64748b; }
.f-orange { background: #fef3c7; color: #d97706; }
.f-red { background: #fee2e2; color: #dc2626; }

.fade-in { animation: fadeIn 0.3s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>

