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
            <h3 class="section-title">{{ idEditando ? 'Editar Matéria' : 'Nova Disciplina' }}</h3>
            <button v-if="idEditando" @click="cancelarEdicao" class="btn-cancel">Cancelar</button>
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
                <option v-for="i in [1, 2, 3, 4, 5]" :key="i" :value="i">{{ diasSemanaPt[i] }}</option>
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
                 :class="['materia-item', { 'materia-selected': materiaSelecionada?.id === m.id }]">
              <div class="materia-row">
                <div class="materia-info">
                  <span class="materia-day-chip">{{ diasSemanaPt[m.diaSemana].substring(0,3) }}</span>
                  <strong>{{ m.nome }}</strong>
                </div>
                <div class="materia-controls">
                  <div class="compact-falta" :class="statusFalta(m)">
                    {{ contarFaltas(m.id) }}/{{ m.limiteFaltas || 5 }}
                  </div>
                  <button @click.stop="prepararEdicao(m)" class="mini-btn edit">✏️</button>
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
            :attributes="materiaSelecionada ? atributosCalendario(materiaSelecionada.id) : atributosGerais"
            @dayclick="abrirModal"
            :color="materiaSelecionada ? 'yellow' : 'orange'"
            :class="{ 'calendario-travado': zonaAtiva === 'academico' && !materiaSelecionada }"
          />
        </section>
      </div>

      <div v-if="zonaAtiva === 'saude'">
        <section class="card border-green-soft shadow-premium">
          <h3 class="section-title">Novo Hábito</h3>
          <input v-model="novoSaude.nome" placeholder="Nome" class="input-modern" />
          <div class="row-flex">
            <input v-model="novoSaude.horario" type="time" class="input-modern flex-1" />
            <button @click="salvarSaude" class="btn-primary-green flex-1" style="height: 54px">Salvar</button>
          </div>
        </section>

        <div v-for="s in listaSaude" :key="s.id" 
             class="materia-item" 
             :class="{ 'health-selected': itemSaudeSelecionado?.id === s.id }"
             @click="itemSaudeSelecionado = s">
          <div class="materia-row">
            <div class="materia-info">
              <strong>{{ s.nome }}</strong>
              <small>{{ s.horario }}</small>
            </div>
            <button @click.stop="excluirSaude(s.id)" class="mini-btn delete">🗑️</button>
          </div>
        </div>

        <section v-if="itemSaudeSelecionado" class="card shadow-premium fade-in">
          <div class="calendar-nav">
            <h3>Histórico: {{ itemSaudeSelecionado.nome }}</h3>
            <button @click="itemSaudeSelecionado = null" class="btn-reset">X</button>
          </div>
          <VDatePicker expanded transparent borderless :first-day-of-week="1" :attributes="atributosSaude(itemSaudeSelecionado.id)" @dayclick="abrirModal" color="green" />
        </section>
      </div>
    </main>

    <div v-if="dataFocada" class="modal-overlay" @click.self="dataFocada = null">
      <div class="modal-sheet">
        <div class="drag-handle"></div>
        <h2>{{ zonaAtiva === 'academico' ? materiaSelecionada?.nome : itemSaudeSelecionado?.nome }}</h2>
        <div class="modal-buttons">
          <template v-if="zonaAtiva === 'academico' && materiaSelecionada">
            <div v-if="dataFocada.date.getDay() === materiaSelecionada.diaSemana">
              <button @click="registrar('Presença')" class="m-btn btn-presenca">Presença ✅</button>
              <div class="m-row" style="display:flex; gap:10px">
                <button @click="registrar('Falta')" class="m-btn btn-falta" style="flex:1">Falta ❌</button>
                <button @click="registrar('EAD')" class="m-btn btn-ead" style="flex:1">EAD 💻</button>
              </div>
            </div>
            <div v-else class="block-warning">
              ⚠️ Aula apenas às {{ diasSemanaPt[materiaSelecionada.diaSemana] }}s.
            </div>
          </template>

          <template v-else-if="zonaAtiva === 'saude' && itemSaudeSelecionado">
            <button @click="registrarSaude('Tomado')" class="m-btn btn-presenca">Concluído ✅</button>
            <button @click="registrarSaude('Esquecido')" class="m-btn btn-falta">Pulei ❌</button>
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

// --- LOGICA ORIGINAL RESTAURADA ---
const zonaAtiva = ref('academico');
const pastaAberta = ref(1);
const idEditando = ref(null);
const dataAtual = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' });
const diasSemanaPt = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const materias = ref([]);
const presencas = ref([]);
const listaSaude = ref([]);
const registrosSaude = ref([]);
const materiaSelecionada = ref(null);
const itemSaudeSelecionado = ref(null);
const dataFocada = ref(null);

const novaMateria = ref({ nome: '', diaSemana: '', semestre: 1, limiteFaltas: 5 });
const novoSaude = ref({ nome: '', horario: '', frequencia: 'diario' });

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

const abrirModal = (day) => {
  // MUDANÇA 3: No Geral (Acadêmico), o clique não faz nada. Na Saúde, funciona sempre.
  if (zonaAtiva.value === 'academico' && !materiaSelecionada.value) return;
  dataFocada.value = day;
};

// Funções de salvar/excluir idênticas à sua versão original
const salvarMateria = async () => {
  if(!novaMateria.value.nome || novaMateria.value.diaSemana === '') return;
  if(idEditando.value) { await updateDoc(doc(db, "materias", idEditando.value), novaMateria.value); idEditando.value = null; }
  else { await addDoc(collection(db, "materias"), novaMateria.value); }
  novaMateria.value = { nome: '', diaSemana: '', semestre: 1, limiteFaltas: 5 };
  buscarDados();
};

const salvarSaude = async () => {
  if(!novoSaude.value.nome) return;
  await addDoc(collection(db, "saude"), novoSaude.value);
  novoSaude.value = { nome: '', horario: '', frequencia: 'diario' };
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

const filtrarPorSemestre = (sem) => materias.value.filter(m => m.semestre === sem);
const contarFaltas = (id) => presencas.value.filter(p => p.materiaId === id && p.tipo === 'Falta').length;
const statusFalta = (m) => {
  const f = contarFaltas(m.id);
  const lim = m.limiteFaltas || 5;
  return f >= lim ? 'f-red' : (f >= lim - 1 ? 'f-orange' : 'f-gray');
};

const mudarZona = (z) => { zonaAtiva.value = z; materiaSelecionada.value = null; itemSaudeSelecionado.value = null; };
const togglePasta = (s) => pastaAberta.value = pastaAberta.value === s ? null : s;
const prepararEdicao = (m) => { idEditando.value = m.id; novaMateria.value = { ...m }; };
const cancelarEdicao = () => { idEditando.value = null; novaMateria.value = { nome: '', diaSemana: '', semestre: 1, limiteFaltas: 5 }; };

const excluirMateria = async (id) => { if(confirm('Excluir?')) { await deleteDoc(doc(db, "materias", id)); buscarDados(); } };
const excluirSaude = async (id) => { if(confirm('Excluir?')) { await deleteDoc(doc(db, "saude", id)); buscarDados(); } };

const atributosGerais = computed(() => presencas.value.map(p => ({
  highlight: { color: p.tipo === 'Presença' ? 'green' : (p.tipo === 'EAD' ? 'blue' : 'red'), fillMode: 'light' },
  dates: p.dataOriginal.toDate ? p.dataOriginal.toDate() : new Date(p.dataOriginal)
})));

const atributosCalendario = (id) => presencas.value.filter(p => p.materiaId === id).map(p => ({
  highlight: { color: p.tipo === 'Presença' ? 'green' : (p.tipo === 'EAD' ? 'blue' : 'red'), fillMode: 'solid' },
  dates: p.dataOriginal.toDate ? p.dataOriginal.toDate() : new Date(p.dataOriginal)
}));

const atributosSaude = (id) => registrosSaude.value.filter(r => r.itemId === id).map(r => ({
  highlight: { color: r.tipo === 'Tomado' ? 'green' : 'red', fillMode: 'solid' },
  dates: r.dataOriginal.toDate ? r.dataOriginal.toDate() : new Date(r.dataOriginal)
}));

onMounted(buscarDados);
</script>

<style scoped>
/* ESTILO ORIGINAL RESTAURADO */
.mobile-container { max-width: 480px; margin: 0 auto; min-height: 100vh; background: #f8fafc; color: #334155; font-family: sans-serif; }
.main-content { padding: 15px; padding-bottom: 100px; }
.header-yellow { background: #fbbf24; padding: 30px 20px; border-radius: 0 0 30px 30px; }
.header-green { background: #10b981; padding: 30px 20px; border-radius: 0 0 30px 30px; color: white; }
.tabs-modern { display: flex; background: rgba(0,0,0,0.1); padding: 4px; border-radius: 15px; margin-top: 15px; }
.tabs-modern button { flex: 1; border: none; padding: 10px; border-radius: 12px; font-weight: bold; background: transparent; color: inherit;}
.tabs-modern button.active { background: white; }
.card { background: white; border-radius: 20px; padding: 20px; margin-bottom: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
.input-modern { width: 100%; height: 48px; background: #f1f5f9; border: none; border-radius: 12px; padding: 0 15px; margin-bottom: 10px; box-sizing: border-box; }
.row-flex { display: flex; gap: 10px; }
.flex-1 { flex: 1; }
.btn-primary-yellow { width: 100%; height: 50px; background: #fbbf24; border: none; border-radius: 12px; font-weight: bold; }
.btn-primary-green { width: 100%; height: 50px; background: #10b981; border: none; border-radius: 12px; font-weight: bold; color: white; }
.materia-item { background: white; border-radius: 15px; padding: 12px 16px; margin-top: 8px; border: 1px solid #f1f5f9; cursor: pointer;}
.materia-selected { border: 2px solid #fbbf24; background: #fffdf5; }
.materia-row { display: flex; justify-content: space-between; align-items: center; }
.materia-day-chip { background: #f1f5f9; font-size: 0.7rem; font-weight: 800; padding: 4px 8px; border-radius: 6px; margin-right: 8px; }
.compact-falta { font-size: 0.8rem; font-weight: 800; padding: 6px 10px; border-radius: 10px; }
.f-gray { background: #f1f5f9; }
.f-orange { background: #fef3c7; color: #d97706; }
.f-red { background: #fee2e2; color: #dc2626; }
.mini-btn { border: none; border-radius: 8px; padding: 8px; cursor: pointer; margin-left: 4px; }
.folder-pill { background: #fff; padding: 15px; border-radius: 15px; display: flex; justify-content: space-between; margin-top: 10px; cursor: pointer; border: 1px solid #e2e8f0; }
.count-badge { background: #334155; color: white; padding: 2px 8px; border-radius: 8px; font-size: 0.7rem; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: flex-end; z-index: 100; }
.modal-sheet { background: white; width: 100%; border-radius: 25px 25px 0 0; padding: 25px; box-sizing: border-box; }
.m-btn { width: 100%; height: 55px; border-radius: 15px; border: none; font-weight: bold; color: white; margin-bottom: 10px; }
.btn-presenca { background: #10b981; }
.btn-falta { background: #ef4444; }
.btn-ead { background: #3b82f6; }
.btn-close-modal { width: 100%; background: none; border: none; color: #94a3b8; margin-top: 10px; }
.block-warning { background: #fff7ed; color: #c2410c; padding: 15px; border-radius: 12px; text-align: center; border: 1px dashed #fdba74; }

/* TRUQUE PARA BLOQUEAR CLIQUE NO GERAL SEM TRAVAR O COMPONENTE */
.calendario-travado { pointer-events: none; opacity: 0.8; }

/* DEIXAR DIAS QUE NÃO SÃO DA AULA CINZAS QUANDO SELECIONADO */
:deep(.vc-day:not(.vc-day-weekday-{{materiaSelecionada?.diaSemana + 1}})) {
  filter: grayscale(1);
  opacity: 0.3;
}
</style>

