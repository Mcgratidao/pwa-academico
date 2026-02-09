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
        <section class="card shadow-premium border-top-gold">
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
                <strong class="subject-title">{{ m.nome }}</strong>
                <span class="materia-day-chip">{{ diasSemanaPt[m.diaSemana]?.substring(0,3) }}</span>
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
    </main>

    <div v-if="dataFocada" class="modal-overlay" @click.self="dataFocada = null">
      <div class="modal-sheet animate-up">
        <div class="drag-handle"></div>
        <p class="modal-label">{{ dataFocada.id }}</p>
        <h2>{{ materiaSelecionada?.nome || 'Selecione uma matéria' }}</h2>

        <div class="modal-content-area">
          <template v-if="materiaSelecionada">
            <div v-if="dataFocada.date.getDay() === materiaSelecionada.diaSemana">
              <button @click="registrar('Presença')" class="m-btn btn-presenca">Presença ✅</button>
              <div class="m-row-flex">
                <button @click="registrar('Falta')" class="m-btn btn-falta">Falta ❌</button>
                <button @click="registrar('EAD')" class="m-btn btn-ead">EAD 💻</button>
              </div>
            </div>
            <div v-else class="block-warning">
              ⚠️ Esta aula ocorre apenas às <strong>{{ diasSemanaPt[materiaSelecionada.diaSemana] }}s</strong>.
            </div>
          </template>
          <p v-else class="text-center">Selecione uma matéria na lista para registrar.</p>
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

// Filtro Dinâmico: Remove registros de matérias que não existem mais
const atributosGerais = computed(() => {
  return presencas.value
    .filter(p => materias.value.some(m => m.id === p.materiaId)) // A mágica está aqui
    .map(p => ({
      highlight: { color: p.tipo === 'Presença' ? 'green' : (p.tipo === 'EAD' ? 'blue' : 'red'), fillMode: 'light' },
      dates: p.dataOriginal?.toDate ? p.dataOriginal.toDate() : new Date(p.dataOriginal)
    }));
});

const atributosCalendario = (id) => presencas.value.filter(p => p.materiaId === id).map(p => ({
  highlight: { color: p.tipo === 'Presença' ? 'green' : (p.tipo === 'EAD' ? 'blue' : 'red'), fillMode: 'solid' },
  dates: p.dataOriginal?.toDate ? p.dataOriginal.toDate() : new Date(p.dataOriginal)
}));

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

const excluirMateria = async (id) => {
  if(confirm('Excluir disciplina e histórico?')) {
    await deleteDoc(doc(db, "materias", id));
    // Limpeza de órfãos no Firebase (Opcional, mas bom)
    const orfas = presencas.value.filter(p => p.materiaId === id);
    for (const p of orfas) await deleteDoc(doc(db, "presencas", p.id));
    if(materiaSelecionada.value?.id === id) materiaSelecionada.value = null;
    buscarDados();
  }
};

const abrirModal = (day) => {
  // Só abre modal se estiver em "Modo Matéria" (clicou em uma disciplina antes)
  if (materiaSelecionada.value) dataFocada.value = day;
};

const statusFalta = (m) => {
  const f = contarFaltas(m.id);
  const lim = m.limiteFaltas || 5;
  return f >= lim ? 'f-red' : f >= lim - 1 ? 'f-orange' : 'f-gold';
};

const contarFaltas = (id) => presencas.value.filter(p => p.materiaId === id && p.tipo === 'Falta').length;
const filtrarPorSemestre = (sem) => materias.value.filter(m => m.semestre === sem);
const togglePasta = (s) => pastaAberta.value = pastaAberta.value === s ? null : s;
const prepararEdicao = (m) => { idEditando.value = m.id; novaMateria.value = { ...m }; window.scrollTo(0,0); };
const cancelarEdicao = () => { idEditando.value = null; novaMateria.value = { nome: '', diaSemana: '', semestre: 1, limiteFaltas: 5 }; };
const mudarZona = (z) => { zonaAtiva.value = z; materiaSelecionada.value = null; };

onMounted(buscarDados);
</script>

<style scoped>
.mobile-container { max-width: 480px; margin: 0 auto; min-height: 100vh; background: #FAF9F6; color: #1e293b; }
.main-content { padding: 16px; padding-bottom: 100px; }

/* Header Premium Amarelo */
.header-yellow { background: #FFDE21; padding: 40px 20px 30px; border-radius: 0 0 35px 35px; color: #451a03; }
.header-green { background: #065f46; padding: 40px 20px 30px; border-radius: 0 0 35px 35px; color: white; }

.tabs-modern { display: flex; background: rgba(0,0,0,0.08); padding: 5px; border-radius: 16px; margin-top: 15px; }
.tabs-modern button { flex: 1; border: none; padding: 10px; border-radius: 12px; font-weight: 800; background: transparent; color: inherit; }
.tabs-modern button.active { background: white; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }

/* Cards */
.card { background: white; border-radius: 24px; padding: 20px; margin-bottom: 20px; box-shadow: 0 8px 20px rgba(0,0,0,0.04); }
.border-top-gold { border-top: 6px solid #E0BC00; }

/* Card Disciplina 2 Linhas */
.materia-card-new { background: white; border-radius: 20px; padding: 16px; margin-top: 12px; border: 1px solid #e2e8f0; }
.materia-selected { border: 2px solid #E0BC00; background: #FFFEF5; }
.m-card-row-top { display: flex; justify-content: space-between; margin-bottom: 12px; }
.subject-title { font-size: 1.1rem; font-weight: 800; }
.materia-day-chip { background: #F1F5F9; font-size: 0.7rem; font-weight: 900; padding: 4px 10px; border-radius: 8px; color: #64748b; }
.m-card-row-bottom { display: flex; justify-content: space-between; align-items: center; }

/* Controles */
.tool-btn { width: 38px; height: 38px; border-radius: 10px; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.edit { background: #F0F9FF; color: #0369a1; }
.delete { background: #FEF2F2; color: #991b1b; }

/* Modal & Trava */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); backdrop-filter: blur(4px); display: flex; align-items: flex-end; z-index: 100; }
.modal-sheet { background: white; width: 100%; border-radius: 35px 35px 0 0; padding: 30px; box-sizing: border-box; }
.block-warning { background: #FFF7ED; color: #9a3412; padding: 20px; border-radius: 20px; text-align: center; border: 1px dashed #fdba74; margin-bottom: 15px; }
.m-btn { width: 100%; height: 58px; border-radius: 18px; border: none; font-weight: 800; color: white; margin-bottom: 12px; }
.btn-presenca { background: #065f46; }
.btn-falta { background: #dc2626; }
.btn-ead { background: #2563eb; }
.m-row-flex { display: flex; gap: 10px; }

/* Status Cores */
.f-gold { background: #FFFBEB; color: #E0BC00; }
.f-orange { background: #FFF7ED; color: #ea580c; }
.f-red { background: #FEF2F2; color: #dc2626; }

.input-modern { width: 100%; height: 50px; background: #F8FAF9; border: 2px solid #F1F5F9; border-radius: 15px; padding: 0 15px; margin-bottom: 10px; box-sizing: border-box; font-weight: 600; }
.btn-primary-yellow { width: 100%; height: 52px; background: #FFDE21; border: none; border-radius: 15px; font-weight: 900; color: #451a03; }

.fade-in { animation: fadeIn 0.3s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; } }
.animate-up { animation: slideUp 0.3s ease-out; }
@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
</style>

