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
        <section class="card shadow-premium">
          <h3 class="section-title">{{ idEditando ? 'Editar Matéria' : 'Nova Disciplina' }}</h3>
          <div class="form-group">
            <input v-model="novaMateria.nome" placeholder="Nome da Disciplina" class="input-modern" />
            <div class="row-flex">
              <select v-model.number="novaMateria.semestre" class="input-modern flex-1">
                <option value="1">1º Semestre</option>
                <option value="2">2º Semestre</option>
              </select>
              <select v-model.number="novaMateria.diaSemana" class="input-modern flex-1">
                <option value="">Dia da Aula</option>
                <option v-for="i in [1,2,3,4,5]" :key="i" :value="i">{{ diasSemanaPt[i] }}</option>
              </select>
            </div>
            <button @click="salvarMateria" :class="idEditando ? 'btn-update' : 'btn-primary-yellow'">
              {{ idEditando ? 'Salvar Matéria' : 'Adicionar Matéria' }}
            </button>
          </div>
        </section>

        <div v-for="sem in [1, 2]" :key="sem">
          <div class="folder-pill" @click="togglePasta(sem)">
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
                <div class="materia-controls">
                  <div class="compact-falta" :class="statusFalta(m)">{{ contarFaltas(m.id) }}/5</div>
                  <button @click.stop="excluirMateria(m.id)" class="mini-btn delete">🗑️</button>
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
            :disabled-dates="regrasBloqueio"
            :attributes="materiaSelecionada ? atributosCalendario(materiaSelecionada.id) : atributosGerais"
            @dayclick="abrirModal"
            :color="materiaSelecionada ? 'yellow' : 'orange'"
          />
        </section>
      </div>

      <div v-if="zonaAtiva === 'saude'">
        <section class="card shadow-premium">
          <h3 class="section-title">Novo Hábito</h3>
          <input v-model="novoSaude.nome" placeholder="Nome" class="input-modern" />
          <button @click="salvarSaude" class="btn-primary-green">Salvar</button>
        </section>

        <div v-for="s in listaSaude" :key="s.id" 
             class="materia-item" :class="{ 'health-selected': itemSaudeSelecionado?.id === s.id }"
             @click="itemSaudeSelecionado = s">
          <div class="materia-row">
            <strong>{{ s.nome }}</strong>
            <button @click.stop="excluirSaude(s.id)" class="mini-btn delete">🗑️</button>
          </div>
        </div>

        <section v-if="itemSaudeSelecionado" class="card shadow-premium fade-in">
          <VDatePicker expanded transparent borderless :first-day-of-week="1" :attributes="atributosSaude(itemSaudeSelecionado.id)" @dayclick="abrirModal" color="green" />
        </section>
      </div>
    </main>

    <div v-if="dataFocada" class="modal-overlay" @click.self="dataFocada = null">
      <div class="modal-sheet">
        <h2>{{ zonaAtiva === 'academico' ? materiaSelecionada?.nome : itemSaudeSelecionado?.nome }}</h2>
        <div class="modal-buttons">
          <template v-if="zonaAtiva === 'academico'">
            <button @click="registrar('Presença')" class="m-btn btn-presenca">Presença ✅</button>
            <button @click="registrar('Falta')" class="m-btn btn-falta">Falta ❌</button>
          </template>
          <template v-else>
            <button @click="registrarSaude('Tomado')" class="m-btn btn-presenca">Concluído ✅</button>
          </template>
        </div>
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
const novaMateria = ref({ nome: '', diaSemana: '', semestre: 1 });
const novoSaude = ref({ nome: '' });

// --- LÓGICA DE BLOQUEIO ---
const regrasBloqueio = computed(() => {
  // 1. No Calendário Geral: NADA é bloqueado (fica normal)
  if (!materiaSelecionada.value && zonaAtiva.value === 'academico') return [];
  
  // 2. No Calendário de Matéria: Bloqueia tudo que NÃO for o dia da aula
  if (materiaSelecionada.value && zonaAtiva.value === 'academico') {
    const diaAula = materiaSelecionada.value.diaSemana;
    const diasParaBloquear = [0,1,2,3,4,5,6].filter(d => d !== diaAula);
    return [{ weekdays: diasParaBloquear.map(d => d + 1) }]; // +1 porque o VCalendar usa 1-7
  }
  return [];
});

const abrirModal = (day) => {
  // Bloqueio de clique no Calendário Geral
  if (zonaAtiva.value === 'academico' && !materiaSelecionada.value) return;
  
  // Se estiver bloqueado visualmente, não abre o popup
  if (regrasBloqueio.value.length > 0) {
    const diaClicado = day.date.getDay();
    if (diaClicado !== materiaSelecionada.value.diaSemana) return;
  }
  
  dataFocada.value = day;
};

// --- DATABASE ---
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

const registrar = async (tipo) => {
  await addDoc(collection(db, "presencas"), { materiaId: materiaSelecionada.value.id, data: dataFocada.value.id, dataOriginal: dataFocada.value.date, tipo });
  dataFocada.value = null;
  buscarDados();
};

const atributosGerais = computed(() => {
  return presencas.value.filter(p => materias.value.some(m => m.id === p.materiaId)).map(p => ({
    highlight: { color: p.tipo === 'Presença' ? 'green' : 'red', fillMode: 'light' },
    dates: p.dataOriginal.toDate ? p.dataOriginal.toDate() : new Date(p.dataOriginal)
  }));
});

const atributosCalendario = (id) => presencas.value.filter(p => p.materiaId === id).map(p => ({
  highlight: { color: p.tipo === 'Presença' ? 'green' : 'red', fillMode: 'solid' },
  dates: p.dataOriginal.toDate ? p.dataOriginal.toDate() : new Date(p.dataOriginal)
}));

const filtrarPorSemestre = (sem) => materias.value.filter(m => m.semestre === sem);
const contarFaltas = (id) => presencas.value.filter(p => p.materiaId === id && p.tipo === 'Falta').length;
const statusFalta = (m) => contarFaltas(m.id) >= 4 ? 'f-red' : 'f-gray';
const togglePasta = (s) => pastaAberta.value = pastaAberta.value === s ? null : s;
const excluirMateria = async (id) => { if(confirm('Excluir?')) { await deleteDoc(doc(db, "materias", id)); buscarDados(); } };

onMounted(buscarDados);
</script>

<style scoped>
.mobile-container { max-width: 480px; margin: 0 auto; min-height: 100vh; background: #f8fafc; font-family: sans-serif; }
.main-content { padding: 15px; padding-bottom: 80px; }
.header-yellow { background: #fbbf24; padding: 25px; border-radius: 0 0 25px 25px; }
.header-green { background: #10b981; padding: 25px; border-radius: 0 0 25px 25px; color: white; }
.tabs-modern { display: flex; gap: 5px; background: rgba(0,0,0,0.05); padding: 5px; border-radius: 12px; margin-top: 15px; }
.tabs-modern button { flex: 1; border: none; padding: 8px; border-radius: 8px; font-weight: bold; background: transparent; }
.tabs-modern button.active { background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
.card { background: white; border-radius: 18px; padding: 18px; margin-bottom: 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
.input-modern { width: 100%; height: 45px; background: #f1f5f9; border: none; border-radius: 10px; padding: 0 12px; margin-bottom: 10px; box-sizing: border-box; }
.btn-primary-yellow { width: 100%; height: 45px; background: #fbbf24; border: none; border-radius: 10px; font-weight: bold; }
.materia-item { background: white; border-radius: 12px; padding: 12px; margin-top: 8px; border: 1px solid #f1f5f9; }
.materia-selected { border: 2px solid #fbbf24; background: #fffdf5; }
.materia-row { display: flex; justify-content: space-between; align-items: center; }
.folder-pill { background: white; padding: 12px; border-radius: 12px; display: flex; justify-content: space-between; margin-top: 10px; cursor: pointer; border: 1px solid #e2e8f0; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: flex-end; z-index: 100; }
.modal-sheet { background: white; width: 100%; border-radius: 20px 20px 0 0; padding: 20px; box-sizing: border-box; }
.m-btn { width: 100%; height: 50px; border-radius: 12px; border: none; font-weight: bold; color: white; margin-bottom: 10px; }
.btn-presenca { background: #10b981; }
.btn-falta { background: #ef4444; }

/* Estilo para datas desativadas: Ficam cinzas e sem clique */
:deep(.vc-disabled) {
  opacity: 0.2;
  pointer-events: none;
  filter: grayscale(1);
}
</style>

