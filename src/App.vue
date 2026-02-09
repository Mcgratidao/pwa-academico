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
          <h3 class="section-title">Nova Disciplina</h3>
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
            <button @click="salvarMateria" class="btn-primary-yellow">Adicionar Matéria</button>
          </div>
        </section>

        <div v-for="sem in [1, 2]" :key="sem" class="semester-section">
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
            :attributes="atributosFinais"
            @dayclick="abrirModal"
            :color="materiaSelecionada ? 'yellow' : 'orange'"
          />
        </section>
      </div>

      <div v-if="zonaAtiva === 'saude'">
        <section class="card shadow-premium border-green-soft">
          <h3 class="section-title">Novo Hábito</h3>
          <div class="form-group">
            <input v-model="novoSaude.nome" placeholder="Ex: Vitaminas" class="input-modern" />
            <button @click="salvarSaude" class="btn-primary-green">Salvar</button>
          </div>
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
          <h3 class="section-title">Histórico: {{ itemSaudeSelecionado.nome }}</h3>
          <VDatePicker 
            expanded transparent borderless 
            :first-day-of-week="1" 
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
        <button @click="dataFocada = null" class="btn-close-modal">Cancelar</button>
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

// COMBINAÇÃO DE ATRIBUTOS (Presenças + Dias Cinzas)
const atributosFinais = computed(() => {
  let attrs = [];
  
  // 1. Mostrar as bolinhas de presença/falta
  const dots = materiaSelecionada.value 
    ? atributosCalendario(materiaSelecionada.value.id) 
    : atributosGerais.value;
  attrs.push(...dots);

  // 2. Se houver matéria selecionada, deixa os outros dias cinzas (APENAS VISUAL)
  if (zonaAtiva.value === 'academico' && materiaSelecionada.value) {
    const diaAula = materiaSelecionada.value.diaSemana;
    attrs.push({
      content: { style: { color: '#cbd5e1', opacity: '0.4' } },
      dates: { weekdays: [1,2,3,4,5,6,7].filter(d => d !== diaAula + 1) }
    });
  }
  
  return attrs;
});

const abrirModal = (day) => {
  // Se for saúde, abre sempre
  if (zonaAtiva.value === 'saude' && itemSaudeSelecionado.value) {
    dataFocada.value = day;
    return;
  }
  // Se for acadêmico, só abre se tiver matéria E for o dia certo
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

// DATABASE
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
.mobile-container { max-width: 480px; margin: 0 auto; min-height: 100vh; background: #f8fafc; font-family: sans-serif; color: #334155; }
.main-content { padding: 15px; padding-bottom: 80px; }
.header-yellow { background: #fbbf24; padding: 25px; border-radius: 0 0 30px 30px; }
.header-green { background: #10b981; padding: 25px; border-radius: 0 0 30px 30px; color: white; }
.tabs-modern { display: flex; gap: 5px; background: rgba(0,0,0,0.06); padding: 5px; border-radius: 14px; margin-top: 15px; }
.tabs-modern button { flex: 1; border: none; padding: 10px; border-radius: 10px; font-weight: bold; background: transparent; transition: 0.2s; }
.tabs-modern button.active { background: white; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
.card { background: white; border-radius: 20px; padding: 20px; margin-bottom: 15px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
.input-modern { width: 100%; height: 48px; background: #f1f5f9; border: none; border-radius: 12px; padding: 0 15px; margin-bottom: 10px; box-sizing: border-box; }
.row-flex { display: flex; gap: 10px; }
.flex-1 { flex: 1; }
.btn-primary-yellow { width: 100%; height: 48px; background: #fbbf24; border: none; border-radius: 12px; font-weight: bold; cursor: pointer; }
.btn-primary-green { width: 100%; height: 48px; background: #10b981; border: none; border-radius: 12px; font-weight: bold; color: white; cursor: pointer; }
.materia-item { background: white; border-radius: 15px; padding: 14px; margin-top: 10px; border: 1px solid #f1f5f9; cursor: pointer; }
.materia-selected { border: 2px solid #fbbf24; background: #fffdf5; }
.health-selected { border: 2px solid #10b981; background: #f0fdf4; }
.materia-row { display: flex; justify-content: space-between; align-items: center; }
.materia-day-chip { background: #f1f5f9; font-size: 0.7rem; font-weight: 800; padding: 4px 8px; border-radius: 6px; margin-right: 10px; }
.folder-pill { background: white; padding: 15px; border-radius: 15px; display: flex; justify-content: space-between; margin-top: 10px; cursor: pointer; border: 1px solid #e2e8f0; font-weight: bold; }
.count-badge { background: #334155; color: white; padding: 2px 10px; border-radius: 8px; font-size: 0.8rem; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: flex-end; z-index: 100; backdrop-filter: blur(2px); }
.modal-sheet { background: white; width: 100%; border-radius: 25px 25px 0 0; padding: 25px; box-sizing: border-box; animation: slideUp 0.3s ease-out; }
.m-btn { width: 100%; height: 55px; border-radius: 16px; border: none; font-weight: bold; color: white; margin-bottom: 10px; font-size: 1rem; }
.btn-presenca { background: #10b981; }
.btn-falta { background: #ef4444; }
.btn-close-modal { width: 100%; background: none; border: none; color: #94a3b8; font-weight: bold; margin-top: 5px; }
.mini-btn.delete { background: #fff1f2; color: #ef4444; border: none; padding: 8px; border-radius: 8px; }
@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
</style>

