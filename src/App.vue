<template>
  <div id="app" class="app-dark">
    <div class="app-container">
      <header :class="zonaAtiva === 'saude' ? 'header-green' : 'header-amber'">
        <div class="header-content">
          <span class="top-date">{{ dataAtual }}</span>
          <h1 class="main-title">{{ zonaAtiva === 'saude' ? 'Minha Saúde' : 'Meu Acadêmico' }}</h1>
          
          <div class="tab-nav">
            <button @click="mudarZona('academico')" :class="{ active: zonaAtiva === 'academico' }">Disciplinas</button>
            <button @click="mudarZona('saude')" :class="{ active: zonaAtiva === 'saude' }">Saúde</button>
          </div>
        </div>
      </header>

      <main class="main-scroll">
        <div v-if="zonaAtiva === 'academico'" class="animate-in">
          <section class="action-card">
            <h3 class="label-caps">Nova Disciplina</h3>
            <div class="form-grid">
              <input v-model="novaMateria.nome" placeholder="Ex: Cálculo I" class="dark-input full" />
              <div class="row">
                <select v-model.number="novaMateria.semestre" class="dark-input">
                  <option value="1">1º Semestre</option>
                  <option value="2">2º Semestre</option>
                </select>
                <select v-model.number="novaMateria.diaSemana" class="dark-input">
                  <option value="">Dia da Semana</option>
                  <option v-for="i in [1,2,3,4,5]" :key="i" :value="i">{{ diasSemanaPt[i] }}</option>
                </select>
              </div>
              <button @click="salvarMateria" class="btn-amber">{{ editandoId ? 'Atualizar' : 'Adicionar' }}</button>
            </div>
          </section>

          <div v-for="sem in [1, 2]" :key="sem" class="semestre-group">
            <div class="folder-header" @click="togglePasta(sem)">
              <span>📂 {{ sem }}º Semestre</span>
              <span class="count">{{ filtrarPorSemestre(sem).length }}</span>
            </div>

            <div v-if="pastaAberta === sem" class="materia-grid">
              <div v-for="m in filtrarPorSemestre(sem)" :key="m.id" 
                   class="materia-card" 
                   :class="{ 'selected': materiaSelecionada?.id === m.id }"
                   @click="materiaSelecionada = m">
                
                <div class="card-top">
                  <div class="info">
                    <span class="day-full">{{ diasSemanaPt[m.diaSemana] }}</span>
                    <h4 class="m-name">{{ m.nome }}</h4>
                  </div>
                  <div class="actions">
                    <button @click.stop="prepararEdicao(m)" class="icon-btn edit">✏️</button>
                    <button @click.stop="excluirMateria(m.id)" class="icon-btn trash">🗑️</button>
                  </div>
                </div>

                <div class="stats-row">
                  <div class="stat-item">
                    <span class="stat-label">Faltas</span>
                    <span class="stat-value" :class="{ 'warning': contarFaltas(m.id) >= 10 }">
                      {{ contarFaltas(m.id) }} <small>/ 15</small>
                    </span>
                  </div>
                  <div class="progress-bar">
                    <div class="progress-fill" :style="{ width: (contarFaltas(m.id) / 15 * 100) + '%' }"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <section class="calendar-card dark">
            <div class="cal-head">
              <h3>{{ materiaSelecionada ? materiaSelecionada.nome : 'Selecione uma matéria' }}</h3>
              <button v-if="materiaSelecionada" @click="materiaSelecionada = null" class="btn-clear">Geral</button>
            </div>
            <VDatePicker 
              expanded is-dark transparent borderless
              :first-day-of-week="1"
              :attributes="atributosFinais"
              @dayclick="abrirModal"
            />
          </section>
        </div>

        <div v-if="zonaAtiva === 'saude'" class="animate-in">
          <section class="action-card green-border">
             <input v-model="novoSaude.nome" placeholder="Novo hábito..." class="dark-input" />
             <button @click="salvarSaude" class="btn-green">Salvar</button>
          </section>
          </div>
      </main>
    </div>

    <div v-if="dataFocada" class="modal-overlay" @click.self="dataFocada = null">
      <div class="modal-sheet dark">
        <div class="handle"></div>
        <h3>Registrar Presença</h3>
        <p>{{ dataFocada.id }} - {{ materiaSelecionada?.nome }}</p>
        <div class="btn-group">
          <button @click="registrar('Presença')" class="m-btn p-btn">Presença ✅</button>
          <button @click="registrar('Falta')" class="m-btn f-btn">Falta ❌</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { db } from './firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore";

// Estados
const zonaAtiva = ref('academico');
const materias = ref([]);
const presencas = ref([]);
const listaSaude = ref([]);
const registrosSaude = ref([]);
const materiaSelecionada = ref(null);
const dataFocada = ref(null);
const pastaAberta = ref(1);
const editandoId = ref(null);

const diasSemanaPt = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const dataAtual = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' });
const novaMateria = ref({ nome: '', diaSemana: '', semestre: 1 });
const novoSaude = ref({ nome: '' });

// Funções Lógicas
const contarFaltas = (id) => presencas.value.filter(p => p.materiaId === id && p.tipo === 'Falta').length;

const prepararEdicao = (m) => {
  editandoId.value = m.id;
  novaMateria.value = { ...m };
  window.scrollTo({ top: 0, behavior: 'smooth' });
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

const atributosFinais = computed(() => {
  let attrs = [];
  const dots = materiaSelecionada.value ? atributosCalendario(materiaSelecionada.value.id) : atributosGerais.value;
  attrs.push(...dots);

  if (zonaAtiva.value === 'academico' && materiaSelecionada.value) {
    const diaAula = materiaSelecionada.value.diaSemana;
    attrs.push({
      content: { style: { color: '#475569', opacity: '0.4' } },
      dates: { weekdays: [1,2,3,4,5,6,7].filter(d => d !== diaAula + 1) }
    });
  }
  return attrs;
});

const abrirModal = (day) => {
  if (zonaAtiva.value === 'academico' && materiaSelecionada.value) {
    if (day.date.getDay() === materiaSelecionada.value.diaSemana) {
      dataFocada.value = day;
    }
  }
};

const buscarDados = async () => {
  const [m, p, s, rs] = await Promise.all([
    getDocs(collection(db, "materias")), getDocs(collection(db, "presencas")),
    getDocs(collection(db, "saude")), getDocs(collection(db, "registrosSaude"))
  ]);
  materias.value = m.docs.map(d => ({id: d.id, ...d.data()}));
  presencas.value = p.docs.map(d => ({id: d.id, ...d.data()}));
  listaSaude.value = s.docs.map(d => ({id: d.id, ...d.data()}));
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

const mudarZona = (z) => { zonaAtiva.value = z; materiaSelecionada.value = null; };
const filtrarPorSemestre = (sem) => materias.value.filter(m => m.semestre === sem);
const togglePasta = (s) => pastaAberta.value = pastaAberta.value === s ? null : s;
const excluirMateria = async (id) => { if(confirm('Excluir disciplina?')) { await deleteDoc(doc(db, "materias", id)); buscarDados(); } };

onMounted(buscarDados);
</script>

<style scoped>
/* CORES ESCURAS & ALINHAMENTO */
.app-dark {
  min-height: 100vh;
  background: #0f172a;
  color: #e2e8f0;
  display: flex;
  justify-content: center;
  font-family: 'Inter', sans-serif;
}

.app-container { width: 100%; max-width: 500px; background: #1e293b; min-height: 100vh; position: relative; }

/* HEADER */
.header-amber { background: #1e293b; border-bottom: 3px solid #f59e0b; padding: 40px 20px 25px; }
.top-date { font-size: 0.8rem; color: #94a3b8; font-weight: 600; text-transform: uppercase; }
.main-title { font-size: 1.8rem; margin: 10px 0; color: #fff; }

.tab-nav { display: flex; gap: 10px; background: rgba(15,23,42,0.5); padding: 5px; border-radius: 12px; }
.tab-nav button { flex: 1; border: none; padding: 10px; border-radius: 8px; background: transparent; color: #94a3b8; font-weight: bold; }
.tab-nav button.active { background: #f59e0b; color: #000; }

/* INPUTS */
.action-card { padding: 20px; background: #1e293b; border-bottom: 1px solid #334155; }
.dark-input { background: #0f172a; border: 1px solid #334155; color: #fff; padding: 12px; border-radius: 8px; width: 100%; box-sizing: border-box; }
.row { display: flex; gap: 10px; margin: 10px 0; }

.btn-amber { width: 100%; padding: 15px; background: #f59e0b; border: none; border-radius: 8px; font-weight: 800; cursor: pointer; }

/* MATERIA CARDS */
.materia-grid { padding: 15px; }
.materia-card { 
  background: #334155; border-radius: 16px; padding: 16px; margin-bottom: 12px;
  border-left: 5px solid #64748b; transition: 0.3s;
}
.materia-card.selected { border-left-color: #f59e0b; background: #475569; }

.card-top { display: flex; justify-content: space-between; align-items: flex-start; }
.day-full { font-size: 0.75rem; color: #f59e0b; font-weight: 800; }
.m-name { font-size: 1.1rem; margin-top: 4px; }

.actions { display: flex; gap: 8px; }
.icon-btn { background: rgba(0,0,0,0.2); border: none; padding: 6px; border-radius: 6px; cursor: pointer; }

/* DASHBOARD FALTAS */
.stats-row { margin-top: 15px; }
.stat-item { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 6px; }
.stat-label { font-size: 0.8rem; color: #94a3b8; }
.stat-value { font-weight: 800; font-size: 1rem; }
.stat-value.warning { color: #ef4444; }

.progress-bar { height: 6px; background: #0f172a; border-radius: 10px; overflow: hidden; }
.progress-fill { height: 100%; background: #f59e0b; border-radius: 10px; transition: 0.5s; }

/* FOLDER PILL */
.folder-header { 
  padding: 15px 20px; background: #0f172a; display: flex; justify-content: space-between;
  margin: 10px 0; border-top: 1px solid #334155; font-weight: bold; cursor: pointer;
}

/* CALENDAR */
.calendar-card { margin: 15px; padding: 20px; background: #1e293b; border-radius: 20px; border: 1px solid #334155; }
.cal-head { display: flex; justify-content: space-between; margin-bottom: 15px; }

/* MODAL */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: flex; align-items: flex-end; z-index: 100; }
.modal-sheet { background: #1e293b; width: 100%; padding: 30px; border-radius: 30px 30px 0 0; }
.btn-group { display: flex; gap: 10px; margin-top: 20px; }
.m-btn { flex: 1; padding: 18px; border-radius: 12px; border: none; font-weight: bold; color: #fff; }
.p-btn { background: #10b981; }
.f-btn { background: #ef4444; }

.animate-in { animation: fadeInUp 0.4s ease-out; }
@keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
</style>

