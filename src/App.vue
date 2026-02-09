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
            <select v-model.number="novaMateria.limiteFaltas" class="input-modern">
              <option :value="2">Matéria Curta (Limite: 2)</option>
              <option :value="5">Matéria Longa (Limite: 5)</option>
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
                <span class="materia-day-chip">{{ diasSemanaPt[m.diaSemana] }}</span>
              </div>
              <div class="m-card-row-bottom">
                <div class="falta-display">
                  <span class="falta-label">Faltas:</span>
                  <span class="falta-val" :class="statusFalta(m)">{{ contarFaltas(m.id) }} / {{ m.limiteFaltas || 5 }}</span>
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
          <template v-if="materiaSelecionada && dataFocada.date.getDay() === materiaSelecionada.diaSemana">
            <button @click="registrar('Presença')" class="m-btn btn-presenca">Presença ✅</button>
            <div class="m-row-flex">
              <button @click="registrar('Falta')" class="m-btn btn-falta">Falta ❌</button>
              <button @click="registrar('EAD')" class="m-btn btn-ead">EAD 💻</button>
            </div>
          </template>
          
          <template v-else>
            <div class="block-warning">
              ⚠️ Esta aula ocorre apenas às <strong>{{ diasSemanaPt[materiaSelecionada?.diaSemana] }}s</strong>.
            </div>
            <button class="m-btn btn-disabled" disabled>Registro Bloqueado</button>
          </template>
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
const materiaSelecionada = ref(null);
const dataFocada = ref(null);
const novaMateria = ref({ nome: '', diaSemana: '', semestre: 1, limiteFaltas: 5 });

const mudarZona = (z) => { zonaAtiva.value = z; materiaSelecionada.value = null; };
const togglePasta = (s) => pastaAberta.value = pastaAberta.value === s ? null : s;

const buscarDados = async () => {
  const [m, p] = await Promise.all([
    getDocs(collection(db, "materias")),
    getDocs(collection(db, "presencas"))
  ]);
  materias.value = m.docs.map(d => ({id: d.id, ...d.data()}));
  presencas.value = p.docs.map(d => ({id: d.id, ...d.data()}));
};

const salvarMateria = async () => {
  if(!novaMateria.value.nome || novaMateria.value.diaSemana === '') return;
  if(idEditando.value) {
    await updateDoc(doc(db, "materias", idEditando.value), novaMateria.value);
    idEditando.value = null;
  } else {
    await addDoc(collection(db, "materias"), novaMateria.value);
  }
  novaMateria.value = { nome: '', diaSemana: '', semestre: 1, limiteFaltas: 5 };
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
  const lim = m.limiteFaltas || 5;
  if (f >= lim) return 'f-red';
  if (f >= lim - 1) return 'f-orange';
  return 'f-accent';
};

const converterData = (d) => d.toDate ? d.toDate() : new Date(d);

const atributosGerais = computed(() => presencas.value.map(p => ({
  highlight: { color: p.tipo === 'Presença' ? 'green' : (p.tipo === 'EAD' ? 'blue' : 'red'), fillMode: 'light' },
  dates: converterData(p.dataOriginal)
})));

const atributosCalendario = (id) => presencas.value.filter(p => p.materiaId === id).map(p => ({
  highlight: { color: p.tipo === 'Presença' ? 'green' : (p.tipo === 'EAD' ? 'blue' : 'red'), fillMode: 'solid' },
  dates: converterData(p.dataOriginal)
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
const cancelarEdicao = () => { idEditando.value = null; novaMateria.value = { nome: '', diaSemana: '', semestre: 1, limiteFaltas: 5 }; };

onMounted(buscarDados);
</script>

<style scoped>
/* CORES DO TEMA ATUALIZADAS (Amarelo Ouro sem Marrom) */
.mobile-container { max-width: 480px; margin: 0 auto; min-height: 100vh; background: #f8fafc; color: #1e293b; font-family: 'Inter', sans-serif; }

.header-yellow { background: #FFB300; padding: 40px 20px 30px; border-radius: 0 0 35px 35px; color: white; }
.header-green { background: #065f46; padding: 40px 20px 30px; border-radius: 0 0 35px 35px; color: white; }

.btn-primary-yellow { width: 100%; height: 54px; background: #FFB300; border: none; border-radius: 14px; font-weight: 800; color: white; cursor: pointer; }
.border-top-accent { border-top: 4px solid #FFB300; }
.materia-selected { border: 2px solid #FFB300; transform: translateY(-2px); }

/* ESTILO DOS BOTÕES BLOQUEADOS */
.btn-disabled { background: #cbd5e1 !important; color: #94a3b8 !important; cursor: not-allowed; }
.block-warning { background: #fff1f2; color: #e11d48; padding: 12px; border-radius: 12px; margin-bottom: 15px; font-size: 0.9rem; text-align: center; border: 1px solid #fecdd3; }

/* DEMAIS ESTILOS MANTIDOS */
.card { background: white; border-radius: 24px; padding: 24px; margin-bottom: 20px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05); }
.materia-card-new { background: white; border-radius: 20px; padding: 16px; margin-top: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; position: relative; transition: 0.2s; }
.m-card-row-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.materia-day-chip { font-size: 0.7rem; font-weight: 800; background: #f1f5f9; color: #64748b; padding: 4px 10px; border-radius: 8px; }
.m-btn { width: 100%; height: 58px; border-radius: 18px; border: none; font-weight: 800; color: white; margin-bottom: 12px; cursor: pointer; }
.btn-presenca { background: #065f46; }
.btn-falta { background: #dc2626; }
.btn-ead { background: #2563eb; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: flex-end; z-index: 1000; }
.modal-sheet { background: white; width: 100%; border-radius: 30px 30px 0 0; padding: 30px; }
.input-modern { width: 100%; height: 50px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 0 16px; margin-bottom: 12px; box-sizing: border-box; }
.row-flex { display: flex; gap: 10px; }
.flex-1 { flex: 1; }
</style>

