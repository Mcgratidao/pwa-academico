<template>
  <div id="app" class="app-container">
    <div class="glass-wrapper">
      <header :class="zonaAtiva === 'saude' ? 'header-green' : 'header-dark-amber'">
        <div class="header-content">
          <div class="top-row">
            <span class="day-label">{{ dataAtual }}</span>
            <div class="status-dot"></div>
          </div>
          <h1>{{ zonaAtiva === 'saude' ? 'Minha Saúde' : 'Meu Acadêmico' }}</h1>
          <div class="tabs-modern">
            <button @click="mudarZona('academico')" :class="{ active: zonaAtiva === 'academico' }">Estudos</button>
            <button @click="mudarZona('saude')" :class="{ active: zonaAtiva === 'saude' }">Saúde</button>
          </div>
        </div>
      </header>

      <main class="main-content">
        <div v-if="zonaAtiva === 'academico'" class="fade-in">
          <section class="card glass-card">
            <h3 class="section-title">Nova Disciplina</h3>
            <div class="form-group">
              <input v-model="novaMateria.nome" placeholder="Nome da Disciplina" class="input-dark" />
              <div class="row-flex">
                <select v-model.number="novaMateria.semestre" class="input-dark flex-1">
                  <option value="1">1º Semestre</option>
                  <option value="2">2º Semestre</option>
                </select>
                <select v-model.number="novaMateria.diaSemana" class="input-dark flex-1">
                  <option value="">Dia da Aula</option>
                  <option v-for="i in [1,2,3,4,5]" :key="i" :value="i">{{ diasSemanaPt[i] }}</option>
                </select>
              </div>
              <button @click="salvarMateria" class="btn-primary-amber">Adicionar Matéria</button>
            </div>
          </section>

          <div v-for="sem in [1, 2]" :key="sem" class="semester-section">
            <div class="folder-pill" @click="togglePasta(sem)" :class="{ 'folder-active': pastaAberta === sem }">
              <span>📂 {{ sem }}º Semestre</span>
              <span class="count-badge">{{ filtrarPorSemestre(sem).length }}</span>
            </div>
            <div v-if="pastaAberta === sem" class="folder-list">
              <div v-for="m in filtrarPorSemestre(sem)" :key="m.id"
                   @click="materiaSelecionada = m"
                   :class="['materia-item', { 'materia-selected': materiaSelecionada?.id === m.id }]">
                <div class="materia-row">
                  <div class="materia-info">
                    <span class="materia-day-chip">{{ diasSemanaPt[m.diaSemana].substring(0,3) }}</span>
                    <strong>{{ m.nome }}</strong>
                  </div>
                  <button @click.stop="excluirMateria(m.id)" class="mini-btn-delete">🗑️</button>
                </div>
              </div>
            </div>
          </div>

          <section class="card calendar-card glass-card">
            <div class="calendar-nav">
              <h3>{{ materiaSelecionada ? materiaSelecionada.nome : 'Visão Geral' }}</h3>
              <button v-if="materiaSelecionada" @click="materiaSelecionada = null" class="btn-reset">Limpar Filtro</button>
            </div>
            <VDatePicker
              expanded borderless transparent
              is-dark
              :first-day-of-week="1"
              :attributes="atributosFinais"
              @dayclick="abrirModal"
              :color="materiaSelecionada ? 'yellow' : 'orange'"
            />
          </section>
        </div>

        <div v-if="zonaAtiva === 'saude'" class="fade-in">
          <section class="card glass-card border-green-glow">
            <h3 class="section-title">Novo Hábito</h3>
            <div class="form-group">
              <input v-model="novoSaude.nome" placeholder="Ex: Vitaminas" class="input-dark" />
              <button @click="salvarSaude" class="btn-primary-green">Salvar Hábito</button>
            </div>
          </section>

          <div v-for="s in listaSaude" :key="s.id"
               class="materia-item item-saude" :class="{ 'health-selected': itemSaudeSelecionado?.id === s.id }"
               @click="itemSaudeSelecionado = s">
            <div class="materia-row">
              <strong>{{ s.nome }}</strong>
              <button @click.stop="excluirSaude(s.id)" class="mini-btn-delete">🗑️</button>
            </div>
          </div>

          <section v-if="itemSaudeSelecionado" class="card glass-card fade-in">
            <h3 class="section-title">Histórico: {{ itemSaudeSelecionado.nome }}</h3>
            <VDatePicker
              expanded borderless transparent
              is-dark
              :first-day-of-week="1"
              :attributes="atributosSaude(itemSaudeSelecionado.id)"
              @dayclick="abrirModal"
              color="green"
            />
          </section>
        </div>
      </main>
    </div>

    <div v-if="dataFocada" class="modal-overlay" @click.self="dataFocada = null">
      <div class="modal-sheet dark-sheet">
        <div class="drag-handle"></div>
        <h2 class="modal-title">{{ zonaAtiva === 'academico' ? materiaSelecionada?.nome : itemSaudeSelecionado?.nome }}</h2>
        <p class="modal-date">{{ dataFocada.id }}</p>
        <div class="modal-buttons">
          <template v-if="zonaAtiva === 'academico'">
            <button @click="registrar('Presença')" class="m-btn btn-presenca">Presença ✅</button>
            <button @click="registrar('Falta')" class="m-btn btn-falta">Falta ❌</button>
          </template>
          <template v-else>
            <button @click="registrarSaude('Tomado')" class="m-btn btn-presenca">Concluído ✅</button>
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
import { collection, addDoc, getDocs, deleteDoc, doc } from "firebase/firestore";

const zonaAtiva = ref('academico');
const materias = ref([]);
const presencas = ref([]);
const listaSaude = ref([]);
const registrosSaude = ref([]);
const materiaSelecionada = ref(null);
const itemSaudeSelecionado = ref(null);
const dataFocada = ref(null);
const pastaAberta = ref(1);

const diasSemanaPt = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const dataAtual = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' });
const novaMateria = ref({ nome: '', diaSemana: '', semestre: 1 });
const novoSaude = ref({ nome: '' });

// Lógica de Cores e Calendário
const atributosFinais = computed(() => {
  let attrs = [];
  const dots = materiaSelecionada.value ? atributosCalendario(materiaSelecionada.value.id) : atributosGerais.value;
  attrs.push(...dots);

  if (zonaAtiva.value === 'academico' && materiaSelecionada.value) {
    const diaAula = materiaSelecionada.value.diaSemana;
    attrs.push({
      content: { style: { color: '#4b5563', opacity: '0.3' } },
      dates: { weekdays: [1,2,3,4,5,6,7].filter(d => d !== diaAula + 1) }
    });
  }
  return attrs;
});

const abrirModal = (day) => {
  if (zonaAtiva.value === 'saude' && itemSaudeSelecionado.value) {
    dataFocada.value = day;
    return;
  }
  if (zonaAtiva.value === 'academico' && materiaSelecionada.value) {
    if (day.date.getDay() === materiaSelecionada.value.diaSemana) {
      dataFocada.value = day;
    }
  }
};

const mudarZona = (z) => {
  zonaAtiva.value = z;
  materiaSelecionada.value = null;
  itemSaudeSelecionado.value = null;
};

// Database Methods
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

const salvarMateria = async () => {
  if(!novaMateria.value.nome || novaMateria.value.diaSemana === '') return;
  await addDoc(collection(db, "materias"), novaMateria.value);
  novaMateria.value = { nome: '', diaSemana: '', semestre: 1 };
  buscarDados();
};

const salvarSaude = async () => {
  if(!novoSaude.value.nome) return;
  await addDoc(collection(db, "saude"), novoSaude.value);
  novoSaude.value = { nome: '' };
  buscarDados();
};

const registrar = async (tipo) => {
  await addDoc(collection(db, "presencas"), { materiaId: materiaSelecionada.value.id, data: dataFocada.value.id, dataOriginal: dataFocada.value.date, tipo });
  dataFocada.value = null;
  buscarDados();
};

const registrarSaude = async (tipo) => {
  await addDoc(collection(db, "registrosSaude"), { itemId: itemSaudeSelecionado.value.id, data: dataFocada.value.id, dataOriginal: dataFocada.value.date, tipo });
  dataFocada.value = null;
  buscarDados();
};

const atributosGerais = computed(() => presencas.value.map(p => ({
  highlight: { color: p.tipo === 'Presença' ? 'green' : 'red', fillMode: 'light' },
  dates: p.dataOriginal.toDate ? p.dataOriginal.toDate() : new Date(p.dataOriginal)
})));

const atributosCalendario = (id) => presencas.value.filter(p => p.materiaId === id).map(p => ({
  highlight: { color: p.tipo === 'Presença' ? 'green' : 'red', fillMode: 'solid' },
  dates: p.dataOriginal.toDate ? p.dataOriginal.toDate() : new Date(p.dataOriginal)
}));

const atributosSaude = (id) => registrosSaude.value.filter(r => r.itemId === id).map(r => ({
  highlight: { color: 'green', fillMode: 'solid' },
  dates: r.dataOriginal.toDate ? r.dataOriginal.toDate() : new Date(r.dataOriginal)
}));

const filtrarPorSemestre = (sem) => materias.value.filter(m => m.semestre === sem);
const togglePasta = (s) => pastaAberta.value = pastaAberta.value === s ? null : s;
const excluirMateria = async (id) => { if(confirm('Excluir?')) { await deleteDoc(doc(db, "materias", id)); buscarDados(); } };
const excluirSaude = async (id) => { if(confirm('Excluir?')) { await deleteDoc(doc(db, "saude", id)); buscarDados(); } };

onMounted(buscarDados);
</script>

<style scoped>
/* RESET & BASE */
.app-container {
  min-height: 100vh;
  background: #0f172a; /* Azul quase preto */
  background-image: radial-gradient(at 0% 0%, rgba(251, 191, 36, 0.05) 0, transparent 50%), 
                    radial-gradient(at 100% 100%, rgba(16, 185, 129, 0.05) 0, transparent 50%);
  display: flex;
  justify-content: center;
  font-family: 'Inter', system-ui, sans-serif;
}

.glass-wrapper {
  width: 100%;
  max-width: 500px;
  background: rgba(15, 23, 42, 0.8);
  min-height: 100vh;
  box-shadow: 0 0 50px rgba(0,0,0,0.5);
}

/* HEADER DARK AMBER */
.header-dark-amber {
  background: #1e293b;
  border-bottom: 2px solid #fbbf24;
  padding: 30px 25px;
  border-radius: 0 0 35px 35px;
  color: #f1f5f9;
}

.header-green {
  background: #064e3b;
  border-bottom: 2px solid #10b981;
  padding: 30px 25px;
  border-radius: 0 0 35px 35px;
  color: #ecfdf5;
}

.top-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.status-dot { width: 8px; height: 8px; background: #fbbf24; border-radius: 50%; box-shadow: 0 0 10px #fbbf24; }

.tabs-modern {
  display: flex;
  background: rgba(0,0,0,0.2);
  padding: 4px;
  border-radius: 16px;
  margin-top: 20px;
}

.tabs-modern button {
  flex: 1; border: none; padding: 12px; border-radius: 12px;
  font-weight: 700; color: #94a3b8; background: transparent; transition: 0.3s;
}

.tabs-modern button.active {
  background: #fbbf24; color: #1e293b;
}

/* CARDS & INPUTS */
.main-content { padding: 20px; padding-bottom: 100px; }

.card {
  background: #1e293b;
  border-radius: 24px;
  padding: 22px;
  margin-bottom: 20px;
  border: 1px solid rgba(255,255,255,0.05);
}

.input-dark {
  width: 100%; height: 52px; background: #0f172a; border: 1px solid #334155;
  border-radius: 14px; padding: 0 16px; margin-bottom: 12px; color: white;
  box-sizing: border-box; font-size: 1rem;
}

.btn-primary-amber {
  width: 100%; height: 52px; background: #fbbf24; color: #1e293b;
  border: none; border-radius: 14px; font-weight: 800; cursor: pointer;
}

.btn-primary-green {
  width: 100%; height: 52px; background: #10b981; color: white;
  border: none; border-radius: 14px; font-weight: 800; cursor: pointer;
}

/* LIST ITEMS */
.materia-item {
  background: #1e293b; border-radius: 18px; padding: 16px;
  margin-top: 12px; border: 1px solid rgba(255,255,255,0.05); transition: 0.2s;
}

.materia-selected { border: 2px solid #fbbf24; background: #2d3748; }

.materia-day-chip {
  background: #334155; color: #fbbf24; font-size: 0.75rem;
  padding: 4px 10px; border-radius: 8px; margin-right: 12px; font-weight: 900;
}

.folder-pill {
  background: #1e293b; padding: 18px; border-radius: 20px;
  display: flex; justify-content: space-between; margin-top: 15px;
  border: 1px solid rgba(255,255,255,0.1); color: #e2e8f0; font-weight: 600;
}

.count-badge { background: #fbbf24; color: #1e293b; padding: 2px 12px; border-radius: 10px; }

/* MODAL / BOTTOM SHEET */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.8);
  display: flex; align-items: flex-end; z-index: 1000; backdrop-filter: blur(8px);
}

.dark-sheet {
  background: #1e293b; width: 100%; border-radius: 35px 35px 0 0;
  padding: 30px; border-top: 1px solid rgba(255,255,255,0.1);
}

.m-btn { width: 100%; height: 60px; border-radius: 20px; border: none; font-weight: 800; color: white; margin-bottom: 12px; font-size: 1.1rem; }
.btn-presenca { background: #10b981; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3); }
.btn-falta { background: #ef4444; box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3); }

/* CALENDAR CUSTOMIZATION */
:deep(.vc-container.vc-is-dark) {
  --vc-bg: transparent;
  --vc-border: transparent;
}

.mini-btn-delete { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: none; padding: 10px; border-radius: 12px; }

.fade-in { animation: fadeIn 0.4s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>

