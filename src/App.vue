<template>
  <div id="app" class="mobile-container">
    <header :class="zonaAtiva === 'saude' ? 'header-green' : 'header-yellow'">
      <div class="header-content">
        <span class="day-label">{{ dataAtual }}</span>
        <h1>{{ zonaAtiva === 'saude' ? 'Saúde' : 'Acadêmico' }}</h1>
        <div class="tabs-modern">
          <button @click="mudarZona('academico')" :class="{ active: zonaAtiva === 'academico' }">Estudos</button>
          <button @click="mudarZona('saude')" :class="{ active: zonaAtiva === 'saude' }">Saúde</button>
        </div>
      </div>
    </header>

    <main class="main-content fade-in">
      <div v-if="zonaAtiva === 'academico'">
        <section class="card shadow-premium border-top-accent">
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
                <span class="materia-day-chip">{{ diasSemanaPt[m.diaSemana] }}</span>
              </div>

              <div class="m-card-row-bottom">
                <div class="falta-display">
                  <span class="falta-label">Faltas:</span>
                  <span class="falta-val" :class="statusFalta(m)">{{ contarFaltas(m.id) }}</span>
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
            :first-day-of-week="1"
            :attributes="materiaSelecionada ? atributosCalendario(materiaSelecionada.id) : atributosGerais"
            @dayclick="abrirModal"
            :color="materiaSelecionada ? 'yellow' : 'orange'"
          />
        </section>
      </div>
    </main>

    <div v-if="dataFocada" class="modal-overlay" @click.self="dataFocada = null">
      <div class="modal-sheet animate-up">
        <div class="drag-handle"></div>
        <p class="modal-label">{{ dataFocada.id }}</p>
        <h2>{{ materiaSelecionada?.nome }}</h2>

        <div class="modal-buttons">
          <template v-if="dataFocada.date.getDay() === materiaSelecionada.diaSemana">
            <button @click="registrar('Presença')" class="m-btn btn-presenca">Presença ✅</button>
            <div class="m-row-flex">
              <button @click="registrar('Falta')" class="m-btn btn-falta">Falta ❌</button>
              <button @click="registrar('EAD')" class="m-btn btn-ead">EAD 💻</button>
            </div>
          </template>

          <template v-else>
            <div class="block-warning">
              <p>O registro só é permitido às <strong>{{ diasSemanaPt[materiaSelecionada.diaSemana] }}s</strong>.</p>
            </div>
            <button class="m-btn btn-disabled" disabled>Presença Bloqueada</button>
            <div class="m-row-flex">
              <button class="m-btn btn-disabled flex-1" disabled>Falta</button>
              <button class="m-btn btn-disabled flex-1" disabled>EAD</button>
            </div>
          </template>
        </div>
        <button @click="dataFocada = null" class="btn-close-modal">Voltar</button>
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
const materiaSelecionada = ref(null);
const dataFocada = ref(null);
const novaMateria = ref({ nome: '', diaSemana: '', semestre: 1 });

const mudarZona = (z) => { zonaAtiva.value = z; materiaSelecionada.value = null; };
const togglePasta = (s) => pastaAberta.value = pastaAberta.value === s ? null : s;

const buscarDados = async () => {
  const [m, p] = await Promise.all([
    getDocs(collection(db, "materias")),
    getDocs(collection(db, "presencas"))
  ]);
  materias.value = m.docs.map(d => ({id: d.id, ...d.data()}));
  presencas.value = p.docs.map(d => ({
    id: d.id, 
    ...d.data(),
    // Garante que a data do Firebase seja convertida corretamente para Date JS
    dataOriginal: d.data().dataOriginal?.toDate ? d.data().dataOriginal.toDate() : new Date(d.data().dataOriginal)
  }));
};

const salvarMateria = async () => {
  if(!novaMateria.value.nome || novaMateria.value.diaSemana === '') return;
  if(idEditando.value) {
    await updateDoc(doc(db, "materias", idEditando.value), novaMateria.value);
    idEditando.value = null;
  } else {
    await addDoc(collection(db, "materias"), novaMateria.value);
  }
  novaMateria.value = { nome: '', diaSemana: '', semestre: 1 };
  buscarDados();
};

const registrar = async (tipo) => {
  if(!materiaSelecionada.value) return;
  await addDoc(collection(db, "presencas"), { 
    materiaId: materiaSelecionada.value.id, 
    data: dataFocada.value.id, 
    dataOriginal: dataFocada.value.date, 
    tipo 
  });
  dataFocada.value = null;
  buscarDados();
};

const filtrarPorSemestre = (sem) => materias.value.filter(m => m.semestre === sem);
const contarFaltas = (id) => presencas.value.filter(p => p.materiaId === id && p.tipo === 'Falta').length;

const statusFalta = (m) => {
  const f = contarFaltas(m.id);
  return f >= 4 ? 'f-red' : (f >= 2 ? 'f-orange' : 'f-accent');
};

const atributosGerais = computed(() => presencas.value.map(p => ({
  highlight: { color: p.tipo === 'Presença' ? 'green' : (p.tipo === 'EAD' ? 'blue' : 'red'), fillMode: 'light' },
  dates: p.dataOriginal
})));

const atributosCalendario = (id) => presencas.value.filter(p => p.materiaId === id).map(p => ({
  highlight: { color: p.tipo === 'Presença' ? 'green' : (p.tipo === 'EAD' ? 'blue' : 'red'), fillMode: 'solid' },
  dates: p.dataOriginal
}));

const abrirModal = (day) => {
  if (zonaAtiva.value === 'academico' && !materiaSelecionada.value) return;
  dataFocada.value = day;
};

const excluirMateria = async (id) => {
  if(confirm('Excluir?')) {
    await deleteDoc(doc(db, "materias", id));
    buscarDados();
  }
};

const prepararEdicao = (m) => { idEditando.value = m.id; novaMateria.value = { ...m }; };
const cancelarEdicao = () => { idEditando.value = null; novaMateria.value = { nome: '', diaSemana: '', semestre: 1 }; };

onMounted(buscarDados);
</script>

<style scoped>
/* CORES DO TEMA ATUALIZADAS */
:root {
  --amarelo-ouro: #FFB300;
  --amarelo-hover: #FFA000;
  --verde-saude: #065f46;
}

.mobile-container { max-width: 480px; margin: 0 auto; min-height: 100vh; background: #f8fafc; color: #1e293b; font-family: 'Inter', sans-serif; }

/* HEADER - AGORA AMARELO OURO */
.header-yellow { background: var(--amarelo-ouro); padding: 40px 20px 30px; border-radius: 0 0 35px 35px; color: #fff; box-shadow: 0 10px 20px rgba(255, 179, 0, 0.2); }
.header-green { background: var(--verde-saude); padding: 40px 20px 30px; border-radius: 0 0 35px 35px; color: white; }

.tabs-modern button.active { background: white; color: #1e293b; }

/* CARDS E BOTÕES */
.border-top-accent { border-top: 4px solid var(--amarelo-ouro); }
.btn-primary-yellow { width: 100%; height: 54px; background: var(--amarelo-ouro); border: none; border-radius: 14px; font-weight: 800; color: white; cursor: pointer; transition: 0.3s; }
.btn-primary-yellow:hover { background: var(--amarelo-hover); }

.materia-selected { border: 2px solid var(--amarelo-ouro); transform: translateY(-2px); }

/* ESTILO DOS BOTÕES DESABILITADOS (CINZA) */
.btn-disabled {
  background: #e2e8f0 !important;
  color: #94a3b8 !important;
  cursor: not-allowed !important;
  border: 1px solid #cbd5e1 !important;
}

.block-warning {
  background: #fff1f2;
  color: #e11d48;
  padding: 12px;
  border-radius: 12px;
  margin-bottom: 15px;
  font-size: 0.9rem;
  text-align: center;
  border: 1px solid #fecdd3;
}

/* MODAL */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: flex-end; z-index: 999; }
.modal-sheet { background: white; width: 100%; border-radius: 30px 30px 0 0; padding: 30px; }
.m-btn { width: 100%; height: 58px; border-radius: 18px; border: none; font-weight: 800; color: white; margin-bottom: 12px; cursor: pointer; }
.btn-presenca { background: #059669; }
.btn-falta { background: #dc2626; }
.btn-ead { background: #2563eb; }
.btn-close-modal { width: 100%; padding: 15px; background: none; border: none; color: #64748b; font-weight: 600; cursor: pointer; }

/* REGRAS GERAIS */
.card { background: white; border-radius: 24px; padding: 20px; margin-bottom: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
.row-flex { display: flex; gap: 10px; margin-bottom: 10px; }
.flex-1 { flex: 1; }
.input-modern { width: 100%; height: 48px; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 12px; padding: 0 12px; box-sizing: border-box; }
</style>

