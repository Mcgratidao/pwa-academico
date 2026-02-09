<template>
  <div id="app" class="app-background">
    <div class="app-container">
      <header :class="zonaAtiva === 'saude' ? 'header-green' : 'header-sand'">
        <div class="header-content">
          <div class="header-top">
            <span class="date-badge">{{ dataAtual }}</span>
          </div>
          <h1 class="main-title">{{ zonaAtiva === 'saude' ? 'Bem-estar' : 'Acadêmico' }}</h1>
          
          <div class="tab-switcher">
            <button @click="mudarZona('academico')" :class="{ active: zonaAtiva === 'academico' }">Estudos</button>
            <button @click="mudarZona('saude')" :class="{ active: zonaAtiva === 'saude' }">Saúde</button>
          </div>
        </div>
      </header>

      <main class="content">
        <div v-if="zonaAtiva === 'academico'" class="slide-up">
          <section class="premium-card">
            <h3 class="card-label">Nova Disciplina</h3>
            <div class="input-stack">
              <input v-model="novaMateria.nome" placeholder="Nome da Matéria" class="minimal-input" />
              <div class="input-row">
                <select v-model.number="novaMateria.semestre" class="minimal-input half">
                  <option value="1">1º Semestre</option>
                  <option value="2">2º Semestre</option>
                </select>
                <select v-model.number="novaMateria.diaSemana" class="minimal-input half">
                  <option value="">Dia da Aula</option>
                  <option v-for="i in [1,2,3,4,5]" :key="i" :value="i">{{ diasSemanaPt[i] }}</option>
                </select>
              </div>
              <button @click="salvarMateria" class="btn-main-sand">Adicionar à Grade</button>
            </div>
          </section>

          <div v-for="sem in [1, 2]" :key="sem">
            <div class="semester-pill" @click="togglePasta(sem)">
              <span><i class="folder-icon">📂</i> {{ sem }}º Semestre</span>
              <span class="badge">{{ filtrarPorSemestre(sem).length }}</span>
            </div>
            
            <transition name="fade">
              <div v-if="pastaAberta === sem" class="materia-list">
                <div v-for="m in filtrarPorSemestre(sem)" :key="m.id" 
                     @click="materiaSelecionada = m"
                     :class="['materia-card', { 'selected': materiaSelecionada?.id === m.id }]">
                  <div class="materia-body">
                    <span class="day-dot">{{ diasSemanaPt[m.diaSemana].substring(0,1) }}</span>
                    <span class="materia-name">{{ m.nome }}</span>
                  </div>
                  <button @click.stop="excluirMateria(m.id)" class="btn-delete-subtle">✕</button>
                </div>
              </div>
            </transition>
          </div>

          <section class="premium-card calendar-section">
            <div class="calendar-header">
              <h3>{{ materiaSelecionada ? materiaSelecionada.nome : 'Calendário Geral' }}</h3>
              <button v-if="materiaSelecionada" @click="materiaSelecionada = null" class="btn-text">Ver tudo</button>
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

        <div v-if="zonaAtiva === 'saude'" class="slide-up">
          <section class="premium-card green-accent">
            <h3 class="card-label">Rastrear Hábito</h3>
            <input v-model="novoSaude.nome" placeholder="Nome do hábito ou remédio" class="minimal-input" />
            <button @click="salvarSaude" class="btn-main-green">Criar Hábito</button>
          </section>

          <div v-for="s in listaSaude" :key="s.id" 
               class="materia-card health" :class="{ 'selected-health': itemSaudeSelecionado?.id === s.id }"
               @click="itemSaudeSelecionado = s">
            <span class="materia-name">{{ s.nome }}</span>
            <button @click.stop="excluirSaude(s.id)" class="btn-delete-subtle">✕</button>
          </div>

          <section v-if="itemSaudeSelecionado" class="premium-card slide-up">
            <h3 class="card-label">Histórico: {{ itemSaudeSelecionado.nome }}</h3>
            <VDatePicker expanded transparent borderless :first-day-of-week="1" :attributes="atributosSaude(itemSaudeSelecionado.id)" @dayclick="abrirModal" color="green" />
          </section>
        </div>
      </main>
    </div>

    <div v-if="dataFocada" class="modal-overlay" @click.self="dataFocada = null">
      <div class="modal-content">
        <div class="modal-drag"></div>
        <p class="modal-subtitle">Registrar para o dia</p>
        <h2 class="modal-date">{{ dataFocada.id }}</h2>
        
        <div class="modal-actions">
          <template v-if="zonaAtiva === 'academico'">
            <button @click="registrar('Presença')" class="action-btn check">Presença</button>
            <button @click="registrar('Falta')" class="action-btn cross">Falta</button>
          </template>
          <template v-else>
            <button @click="registrarSaude('Tomado')" class="action-btn check">Concluído</button>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// (A lógica de script permanece a mesma da versão anterior, pois você confirmou que estava funcionando)
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

const atributosFinais = computed(() => {
  let attrs = [];
  const dots = materiaSelecionada.value ? atributosCalendario(materiaSelecionada.value.id) : atributosGerais.value;
  attrs.push(...dots);

  if (zonaAtiva.value === 'academico' && materiaSelecionada.value) {
    const diaAula = materiaSelecionada.value.diaSemana;
    attrs.push({
      content: { style: { color: '#e2e8f0', opacity: '0.3', fontWeight: '300' } },
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
/* BASE */
.app-background {
  min-height: 100vh;
  background-color: #FAFAF5; /* Bege Areia muito claro */
  display: flex;
  justify-content: center;
  color: #403D39;
  font-family: 'Inter', -apple-system, sans-serif;
}

.app-container {
  width: 100%;
  max-width: 480px;
  background: #FFFFFF;
  min-height: 100vh;
  box-shadow: 0 0 40px rgba(0,0,0,0.02);
}

/* HEADER */
.header-sand {
  background: #F4F1DE; /* Areia suave */
  padding: 40px 25px 30px;
  border-radius: 0 0 40px 40px;
  border-bottom: 2px solid #E9E5D6;
}

.header-green {
  background: #E9F5F0; /* Verde menta pálido */
  padding: 40px 25px 30px;
  border-radius: 0 0 40px 40px;
  border-bottom: 2px solid #D1E7DD;
}

.date-badge {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #8D8D8D;
}

.main-title {
  font-size: 1.8rem;
  font-weight: 800;
  margin: 10px 0 20px;
  letter-spacing: -1px;
}

/* TABS */
.tab-switcher {
  display: flex;
  background: rgba(0,0,0,0.04);
  padding: 5px;
  border-radius: 15px;
}

.tab-switcher button {
  flex: 1; border: none; padding: 12px; border-radius: 12px;
  font-weight: 700; background: transparent; color: #8D8D8D; transition: 0.3s;
}

.tab-switcher button.active {
  background: #FFFFFF; color: #403D39; box-shadow: 0 4px 10px rgba(0,0,0,0.05);
}

/* CARDS */
.content { padding: 25px; }

.premium-card {
  background: #FFFFFF;
  border: 1px solid #F0F0F0;
  border-radius: 25px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.02);
}

.card-label { font-size: 0.85rem; font-weight: 700; color: #8D8D8D; margin-bottom: 15px; }

.minimal-input {
  width: 100%; height: 50px; background: #F8F9FA; border: 1px solid #EDEDED;
  border-radius: 15px; padding: 0 15px; margin-bottom: 10px; font-size: 1rem;
  box-sizing: border-box; transition: 0.3s;
}

.minimal-input:focus { border-color: #D4A373; outline: none; background: #FFF; }

.input-row { display: flex; gap: 10px; }
.half { width: 50%; }

.btn-main-sand {
  width: 100%; height: 50px; background: #D4A373; color: white;
  border: none; border-radius: 15px; font-weight: 700; cursor: pointer;
}

.btn-main-green {
  width: 100%; height: 50px; background: #10b981; color: white;
  border: none; border-radius: 15px; font-weight: 700; cursor: pointer;
}

/* LISTS */
.semester-pill {
  display: flex; justify-content: space-between; align-items: center;
  padding: 15px 20px; background: #FDFCFB; border-radius: 18px;
  margin-top: 10px; border: 1px solid #F0F0F0; cursor: pointer; font-weight: 700;
}

.badge { background: #403D39; color: white; padding: 2px 10px; border-radius: 8px; font-size: 0.8rem; }

.materia-card {
  background: white; padding: 15px; border-radius: 18px; margin-top: 8px;
  border: 1px solid #F0F0F0; display: flex; justify-content: space-between; align-items: center;
}

.materia-card.selected { border: 2px solid #D4A373; background: #FFFBF5; }

.day-dot {
  width: 24px; height: 24px; background: #F4F1DE; border-radius: 6px;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 0.7rem; font-weight: 900; margin-right: 12px;
}

/* CALENDAR */
:deep(.vc-yellow) { --vc-accent-500: #D4A373; }

/* MODAL */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(64, 61, 57, 0.4);
  display: flex; align-items: flex-end; z-index: 1000; backdrop-filter: blur(4px);
}

.modal-content {
  background: white; width: 100%; border-radius: 35px 35px 0 0;
  padding: 30px; box-sizing: border-box; text-align: center;
}

.modal-drag { width: 40px; height: 5px; background: #E0E0E0; border-radius: 10px; margin: 0 auto 20px; }

.action-btn {
  width: 100%; height: 60px; border-radius: 20px; border: none;
  font-weight: 700; font-size: 1rem; margin-bottom: 10px; cursor: pointer;
}

.action-btn.check { background: #10b981; color: white; }
.action-btn.cross { background: #FF4D4D; color: white; }

.btn-delete-subtle { background: transparent; border: none; color: #CCC; font-size: 1.2rem; cursor: pointer; }

.slide-up { animation: slideUp 0.4s ease-out; }
@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
</style>

