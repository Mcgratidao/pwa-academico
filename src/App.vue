<template>
  <div id="app" class="app-light-clean">
    <div class="app-container">
      <header :class="zonaAtiva === 'saude' ? 'header-green-dark' : 'header-amber-dark'">
        <div class="header-content">
          <span class="top-date">{{ dataAtual }}</span>
          <h1 class="main-title">{{ zonaAtiva === 'saude' ? 'Saúde & Bem-estar' : 'Gestão Acadêmica' }}</h1>
          
          <div class="tab-nav">
            <button @click="mudarZona('academico')" :class="{ active: zonaAtiva === 'academico' }">Disciplinas</button>
            <button @click="mudarZona('saude')" :class="{ active: zonaAtiva === 'saude' }">Saúde</button>
          </div>
        </div>
      </header>

      <main class="main-content">
        <div v-if="zonaAtiva === 'academico'" class="fade-in">
          <section class="card-form">
            <h3 class="label-caps">{{ editandoId ? 'Editar Disciplina' : 'Nova Disciplina' }}</h3>
            <div class="form-grid">
              <input v-model="novaMateria.nome" placeholder="Ex: Engenharia de Software" class="input-clean" />
              <div class="row">
                <select v-model.number="novaMateria.semestre" class="input-clean">
                  <option value="1">1º Semestre</option>
                  <option value="2">2º Semestre</option>
                </select>
                <select v-model.number="novaMateria.diaSemana" class="input-clean">
                  <option value="">Dia da Aula</option>
                  <option v-for="i in [1,2,3,4,5]" :key="i" :value="i">{{ diasSemanaPt[i] }}</option>
                </select>
              </div>
              <div class="btn-group-form">
                <button @click="salvarMateria" class="btn-primary-amber">{{ editandoId ? 'Salvar Alterações' : 'Adicionar Matéria' }}</button>
                <button v-if="editandoId" @click="cancelarEdicao" class="btn-cancel">Cancelar</button>
              </div>
            </div>
          </section>

          <div v-for="sem in [1, 2]" :key="sem">
            <div class="folder-pill" @click="togglePasta(sem)">
              <span>📂 {{ sem }}º Semestre</span>
              <span class="badge-count">{{ filtrarPorSemestre(sem).length }}</span>
            </div>

            <div v-if="pastaAberta === sem" class="materia-list">
              <div v-for="m in filtrarPorSemestre(sem)" :key="m.id" 
                   class="materia-card-pro" 
                   :class="{ 'is-selected': materiaSelecionada?.id === m.id }"
                   @click="materiaSelecionada = m">
                
                <div class="card-main-info">
                  <div class="text-group">
                    <span class="day-label-full">{{ diasSemanaPt[m.diaSemana] }}</span>
                    <h4 class="materia-title">{{ m.nome }}</h4>
                  </div>
                  <div class="card-actions">
                    <button @click.stop="prepararEdicao(m)" class="btn-icon">✏️</button>
                    <button @click.stop="excluirMateria(m.id)" class="btn-icon">🗑️</button>
                  </div>
                </div>

                <div class="stats-container">
                  <div class="stats-header">
                    <span class="stats-info">Faltas: <strong>{{ contarFaltas(m.id) }}</strong> / 15</span>
                    <span class="stats-percent">{{ Math.round((contarFaltas(m.id)/15)*100) }}%</span>
                  </div>
                  <div class="progress-bar-bg">
                    <div class="progress-bar-fill" :style="{ width: (contarFaltas(m.id) / 15 * 100) + '%' }"
                         :class="{ 'danger': contarFaltas(m.id) >= 12 }"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <section class="card-calendar">
            <div class="cal-header">
              <h3>{{ materiaSelecionada ? materiaSelecionada.nome : 'Selecione uma matéria' }}</h3>
              <button v-if="materiaSelecionada" @click="materiaSelecionada = null" class="btn-text-only">Ver Geral</button>
            </div>
            <VDatePicker 
              expanded transparent borderless
              :first-day-of-week="1"
              :attributes="atributosFinais"
              @dayclick="abrirModal"
              :color="materiaSelecionada ? 'yellow' : 'gray'"
            />
          </section>
        </div>

        <div v-if="zonaAtiva === 'saude'" class="fade-in">
          <section class="card-form border-green">
            <h3 class="label-caps">Novo Registro de Saúde</h3>
            <input v-model="novoSaude.nome" placeholder="Ex: Multivitamínico" class="input-clean" />
            <button @click="salvarSaude" class="btn-primary-green">Salvar Hábito</button>
          </section>
          
          <div v-for="s in listaSaude" :key="s.id" 
               class="materia-card-pro health" 
               :class="{ 'is-selected-health': itemSaudeSelecionado?.id === s.id }"
               @click="itemSaudeSelecionado = s">
            <div class="card-main-info">
               <h4 class="materia-title">{{ s.nome }}</h4>
               <button @click.stop="excluirSaude(s.id)" class="btn-icon">🗑️</button>
            </div>
          </div>
        </div>
      </main>
    </div>

    <div v-if="dataFocada" class="modal-backdrop" @click.self="dataFocada = null">
      <div class="modal-sheet">
        <div class="modal-handle"></div>
        <p class="modal-label">Registrar para o dia</p>
        <h2 class="modal-date-title">{{ dataFocada.id }}</h2>
        <div class="modal-grid-btns">
          <template v-if="zonaAtiva === 'academico'">
            <button @click="registrar('Presença')" class="btn-modal check">Presença</button>
            <button @click="registrar('Falta')" class="btn-modal cross">Falta</button>
          </template>
          <template v-else>
            <button @click="registrarSaude('Tomado')" class="btn-modal check">Concluído</button>
          </template>
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
const registrosSaude = ref([]);
const materiaSelecionada = ref(null);
const itemSaudeSelecionado = ref(null);
const dataFocada = ref(null);
const pastaAberta = ref(1);
const editandoId = ref(null);

const diasSemanaPt = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const dataAtual = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' });
const novaMateria = ref({ nome: '', diaSemana: '', semestre: 1 });
const novoSaude = ref({ nome: '' });

const contarFaltas = (id) => presencas.value.filter(p => p.materiaId === id && p.tipo === 'Falta').length;

const prepararEdicao = (m) => {
  editandoId.value = m.id;
  novaMateria.value = { ...m };
};
const cancelarEdicao = () => {
  editandoId.value = null;
  novaMateria.value = { nome: '', diaSemana: '', semestre: 1 };
};

const salvarMateria = async () => {
  if(!novaMateria.value.nome || novaMateria.value.diaSemana === '') return;
  if(editandoId.value) {
    await updateDoc(doc(db, "materias", editandoId.value), novaMateria.value);
    editandoId.value = null;
  } else {
    await addDoc(collection(db, "materias"), novaMateria.value);
  }
  novaMateria.value = { nome: '', diaSemana: '', semestre: 1 };
  buscarDados();
};

const salvarSaude = async () => {
  if(!novoSaude.value.nome) return;
  await addDoc(collection(db, "saude"), novoSaude.value);
  novoSaude.value = { nome: '' };
  buscarDados();
};

const buscarDados = async () => {
  const [m, p, s, rs] = await Promise.all([
    getDocs(collection(db, "materias")), getDocs(collection(db, "presencas")),
    getDocs(collection(db, "saude")), getDocs(collection(db, "registrosSaude"))
  ]);
  materias.value = m.docs.map(d => ({id: d.id, ...d.data()}));
  presencas.value = p.docs.map(d => ({id: d.id, ...d.data()}));
  listaSaude.value = s.docs.map(d => ({id: d.id, ...d.data()}));
  registrosSaude.value = rs.docs.map(d => ({id: d.id, ...d.data()}));
};

const registrar = async (tipo) => {
  await addDoc(collection(db, "presencas"), { 
    materiaId: materiaSelecionada.value.id, 
    data: dataFocada.value.id, 
    dataOriginal: dataFocada.value.date, 
    tipo 
  });
  dataFocada.value = null;
  buscarDados();
};

const registrarSaude = async (tipo) => {
  await addDoc(collection(db, "registrosSaude"), { 
    itemId: itemSaudeSelecionado.value.id, 
    data: dataFocada.value.id, 
    dataOriginal: dataFocada.value.date, 
    tipo 
  });
  dataFocada.value = null;
  buscarDados();
};

const atributosFinais = computed(() => {
  let attrs = [];
  const pData = presencas.value.map(p => ({
    highlight: { color: p.tipo === 'Presença' ? 'green' : 'red', fillMode: 'solid' },
    dates: p.dataOriginal.toDate ? p.dataOriginal.toDate() : new Date(p.dataOriginal),
    popover: { label: p.tipo }
  }));
  
  if (materiaSelecionada.value) {
    const filtradas = presencas.value.filter(p => p.materiaId === materiaSelecionada.value.id);
    attrs = filtradas.map(p => ({
      highlight: { color: p.tipo === 'Presença' ? 'green' : 'red', fillMode: 'solid' },
      dates: p.dataOriginal.toDate ? p.dataOriginal.toDate() : new Date(p.dataOriginal)
    }));
    attrs.push({
      content: { style: { color: '#cbd5e1', opacity: '0.4' } },
      dates: { weekdays: [1,2,3,4,5,6,7].filter(d => d !== materiaSelecionada.value.diaSemana + 1) }
    });
  } else {
    attrs = pData;
  }
  return attrs;
});

const abrirModal = (day) => {
  if (zonaAtiva.value === 'saude' && itemSaudeSelecionado.value) {
    dataFocada.value = day;
  } else if (zonaAtiva.value === 'academico' && materiaSelecionada.value) {
    if (day.date.getDay() === materiaSelecionada.value.diaSemana) {
      dataFocada.value = day;
    }
  }
};

const mudarZona = (z) => { zonaAtiva.value = z; materiaSelecionada.value = null; itemSaudeSelecionado.value = null; };
const filtrarPorSemestre = (sem) => materias.value.filter(m => m.semestre === sem);
const togglePasta = (s) => pastaAberta.value = pastaAberta.value === s ? null : s;
const excluirMateria = async (id) => { if(confirm('Excluir?')) { await deleteDoc(doc(db, "materias", id)); buscarDados(); } };
const excluirSaude = async (id) => { if(confirm('Excluir?')) { await deleteDoc(doc(db, "saude", id)); buscarDados(); } };

onMounted(buscarDados);
</script>

<style scoped>
.app-light-clean { min-height: 100vh; background: #F8F9FA; display: flex; justify-content: center; font-family: 'Inter', sans-serif; color: #334155; }
.app-container { width: 100%; max-width: 480px; background: white; min-height: 100vh; box-shadow: 0 0 30px rgba(0,0,0,0.05); }

/* HEADER COLORS - ESCURAS MAS NO TEMA CLARO */
.header-amber-dark { background: #B45309; color: white; padding: 40px 20px 30px; border-radius: 0 0 40px 40px; }
.header-green-dark { background: #065F46; color: white; padding: 40px 20px 30px; border-radius: 0 0 40px 40px; }

.top-date { font-size: 0.8rem; opacity: 0.8; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
.main-title { font-size: 1.8rem; margin: 10px 0 20px; font-weight: 800; }

.tab-nav { display: flex; background: rgba(255,255,255,0.1); padding: 4px; border-radius: 12px; }
.tab-nav button { flex: 1; border: none; padding: 10px; border-radius: 10px; background: transparent; color: white; font-weight: bold; cursor: pointer; }
.tab-nav button.active { background: white; color: #334155; }

/* FORMS & INPUTS */
.main-content { padding: 20px; }
.card-form { background: white; border: 1px solid #E2E8F0; border-radius: 20px; padding: 20px; margin-bottom: 20px; }
.label-caps { font-size: 0.75rem; font-weight: 800; color: #94A3B8; text-transform: uppercase; margin-bottom: 15px; }
.input-clean { width: 100%; height: 48px; background: #F1F5F9; border: 1px solid #E2E8F0; border-radius: 12px; padding: 0 15px; margin-bottom: 10px; box-sizing: border-box; font-size: 1rem; }
.row { display: flex; gap: 10px; }

.btn-primary-amber { width: 100%; height: 50px; background: #B45309; color: white; border: none; border-radius: 12px; font-weight: 700; cursor: pointer; }
.btn-primary-green { width: 100%; height: 50px; background: #065F46; color: white; border: none; border-radius: 12px; font-weight: 700; cursor: pointer; }

/* MATERIA CARD PRO */
.materia-card-pro { background: white; border: 1px solid #E2E8F0; border-radius: 18px; padding: 16px; margin-top: 12px; transition: 0.2s; cursor: pointer; }
.materia-card-pro.is-selected { border: 2px solid #B45309; background: #FFFBEB; }
.card-main-info { display: flex; justify-content: space-between; align-items: flex-start; }
.day-label-full { font-size: 0.75rem; color: #B45309; font-weight: 800; }
.materia-title { font-size: 1.1rem; font-weight: 700; margin: 2px 0 10px; }
.btn-icon { background: #F1F5F9; border: none; padding: 8px; border-radius: 8px; cursor: pointer; margin-left: 5px; }

/* PROGRESS BAR */
.stats-header { display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 5px; }
.progress-bar-bg { height: 8px; background: #E2E8F0; border-radius: 10px; overflow: hidden; }
.progress-bar-fill { height: 100%; background: #D97706; transition: 0.5s; }
.progress-bar-fill.danger { background: #DC2626; }

/* FOLDER PILLS */
.folder-pill { display: flex; justify-content: space-between; padding: 15px; background: #F8F9FA; border-radius: 15px; margin-top: 10px; font-weight: 700; cursor: pointer; border: 1px solid #E2E8F0; }

/* MODAL */
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: flex-end; z-index: 100; }
.modal-sheet { background: white; width: 100%; border-radius: 30px 30px 0 0; padding: 30px; box-sizing: border-box; }
.modal-grid-btns { display: flex; gap: 10px; margin-top: 20px; }
.btn-modal { flex: 1; height: 60px; border-radius: 15px; border: none; font-weight: 700; color: white; }
.btn-modal.check { background: #059669; }
.btn-modal.cross { background: #DC2626; }

.fade-in { animation: fadeIn 0.3s ease; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
</style>

