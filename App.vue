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
          <div class="card-header">
            <h3 class="section-title">Nova Disciplina</h3>
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
                <option v-for="d in [1,2,3,4,5]" :key="d" :value="d">{{ diasSemanaPt[d] }}</option>
              </select>
            </div>
            <button @click="salvarMateria" class="btn-primary-yellow">Adicionar Matéria</button>
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
                 :class="['materia-item', { 'materia-selected': materiaSelecionada?.id === m.id }]">
              <div class="materia-row">
                <div class="materia-info">
                  <span class="materia-day-chip">{{ diasSemanaPt[m.diaSemana].substring(0,3) }}</span>
                  <strong>{{ m.nome }}</strong>
                </div>
                <button @click.stop="excluirMateria(m.id)" class="mini-btn delete">🗑️</button>
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
            :disabled-dates="datasDesativadas"
            :attributes="materiaSelecionada ? atributosCalendario(materiaSelecionada.id) : atributosGerais"
            @dayclick="abrirModal"
            :color="materiaSelecionada ? 'yellow' : 'orange'"
          />
        </section>
      </div>

      <div v-if="zonaAtiva === 'saude'">
        <section class="card border-green-soft shadow-premium">
          <h3 class="section-title">Novo Hábito</h3>
          <div class="form-group">
            <input v-model="novoSaude.nome" placeholder="Remédio ou Hábito" class="input-modern" />
            <button @click="salvarSaude" class="btn-primary-green">Salvar</button>
          </div>
        </section>

        <div v-for="s in listaSaude" :key="s.id" 
             class="materia-item" 
             :class="{ 'health-selected': itemSaudeSelecionado?.id === s.id }"
             @click="itemSaudeSelecionado = s">
          <div class="materia-row">
            <strong>{{ s.nome }}</strong>
            <button @click.stop="excluirSaude(s.id)" class="mini-btn delete">🗑️</button>
          </div>
        </div>

        <section v-if="itemSaudeSelecionado" class="card shadow-premium fade-in">
          <h3 class="section-title">Histórico: {{ itemSaudeSelecionado.nome }}</h3>
          <VDatePicker 
            expanded transparent borderless 
            :attributes="atributosSaude(itemSaudeSelecionado.id)" 
            @dayclick="abrirModal" 
            color="green" 
          />
        </section>
      </div>
    </main>

    <div v-if="dataFocada" class="modal-overlay" @click.self="dataFocada = null">
      <div class="modal-sheet">
        <div class="drag-handle"></div>
        <h2>{{ zonaAtiva === 'academico' ? materiaSelecionada?.nome : itemSaudeSelecionado?.nome }}</h2>
        <p>{{ dataFocada.id }}</p>
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
const pastaAberta = ref(1);
const dataAtual = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' });
const diasSemanaPt = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const materias = ref([]);
const presencas = ref([]);
const listaSaude = ref([]);
const registrosSaude = ref([]);
const materiaSelecionada = ref(null);
const itemSaudeSelecionado = ref(null);
const dataFocada = ref(null);

const novaMateria = ref({ nome: '', diaSemana: '', semestre: 1 });
const novoSaude = ref({ nome: '' });

// REGRAS DE CINZA: Só aplica se for aba acadêmica e tiver matéria selecionada
const datasDesativadas = computed(() => {
  if (zonaAtiva.value === 'academico' && materiaSelecionada.value) {
    const diaAula = materiaSelecionada.value.diaSemana;
    const diasParaBloquear = [1, 2, 3, 4, 5, 6, 7].filter(d => d !== (diaAula + 1));
    return [{ weekdays: diasParaBloquear }];
  }
  return [];
});

// REGRAS DE CLIQUE: Destravado para Saúde e para o dia correto da aula
const abrirModal = (day) => {
  if (zonaAtiva.value === 'saude') {
    dataFocada.value = day;
    return;
  }
  if (zonaAtiva.value === 'academico') {
    if (!materiaSelecionada.value) return; // Trava o Geral
    if (day.date.getDay() === materiaSelecionada.value.diaSemana) {
      dataFocada.value = day;
    }
  }
};

// FIREBASE
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

const excluirMateria = async (id) => { if(confirm('Excluir?')) { await deleteDoc(doc(db, "materias", id)); buscarDados(); } };
const excluirSaude = async (id) => { if(confirm('Excluir?')) { await deleteDoc(doc(db, "saude", id)); buscarDados(); } };

const filtrarPorSemestre = (sem) => materias.value.filter(m => m.semestre === sem);
const mudarZona = (z) => { zonaAtiva.value = z; materiaSelecionada.value = null; itemSaudeSelecionado.value = null; };
const togglePasta = (s) => pastaAberta.value = pastaAberta.value === s ? null : s;

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

onMounted(buscarDados);
</script>

<style scoped>
.mobile-container { max-width: 480px; margin: 0 auto; min-height: 100vh; background: #f8fafc; font-family: sans-serif; }
.header-yellow { background: #fbbf24; padding: 25px; border-radius: 0 0 25px 25px; }
.header-green { background: #10b981; padding: 25px; border-radius: 0 0 25px 25px; color: white; }
.tabs-modern { display: flex; background: rgba(0,0,0,0.08); padding: 4px; border-radius: 12px; margin-top: 15px; }
.tabs-modern button { flex: 1; border: none; padding: 10px; border-radius: 10px; font-weight: bold; background: transparent; }
.tabs-modern button.active { background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
.main-content { padding: 15px; padding-bottom: 50px; }
.card { background: white; border-radius: 18px; padding: 18px; margin-bottom: 15px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
.input-modern { width: 100%; height: 45px; background: #f1f5f9; border: none; border-radius: 10px; padding: 0 12px; margin-bottom: 10px; box-sizing: border-box; }
.row-flex { display: flex; gap: 8px; }
.flex-1 { flex: 1; }
.btn-primary-yellow { width: 100%; height: 45px; background: #fbbf24; border: none; border-radius: 10px; font-weight: bold; }
.btn-primary-green { width: 100%; height: 45px; background: #10b981; border: none; border-radius: 10px; font-weight: bold; color: white; }
.materia-item { background: white; border-radius: 12px; padding: 12px; margin-top: 8px; border: 1px solid #eef2f6; display: flex; justify-content: space-between; align-items: center; }
.materia-selected { border: 2px solid #fbbf24; background: #fffdf5; }
.health-selected { border: 2px solid #10b981; }
.materia-day-chip { background: #f1f5f9; font-size: 0.7rem; font-weight: bold; padding: 4px 8px; border-radius: 6px; margin-right: 10px; }
.folder-pill { background: white; padding: 14px; border-radius: 12px; display: flex; justify-content: space-between; margin-top: 10px; border: 1px solid #e2e8f0; }
.count-badge { background: #334155; color: white; padding: 2px 8px; border-radius: 6px; font-size: 0.7rem; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: flex-end; z-index: 100; }
.modal-sheet { background: white; width: 100%; border-radius: 20px 20px 0 0; padding: 25px; text-align: center; }
.m-btn { width: 100%; height: 50px; border-radius: 12px; border: none; font-weight: bold; color: white; margin-bottom: 8px; }
.btn-presenca { background: #10b981; }
.btn-falta { background: #ef4444; }
.btn-close-modal { background: none; border: none; color: #94a3b8; margin-top: 10px; }
.mini-btn.delete { background: #fff1f2; color: #ef4444; border: none; padding: 6px; border-radius: 6px; }
:deep(.vc-disabled) { opacity: 0.2; pointer-events: none; filter: grayscale(1); }
</style>

