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
              <option :value="2">Limite: 2 Faltas (Curta)</option>
              <option :value="5">Limite: 5 Faltas (Longa)</option>
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
                <strong class="subject-title">{{ m.nome || 'Sem Nome' }}</strong>
                <span class="materia-day-chip">
                  {{ diasSemanaPt[m.diaSemana] ? diasSemanaPt[m.diaSemana].substring(0,3) : '---' }}
                </span>
              </div>

              <div class="m-card-row-bottom">
                <div class="falta-display">
                  <span class="falta-label">Faltas:</span>
                  <span class="falta-val" :class="statusFalta(m)">
                    {{ contarFaltas(m.id) }} / {{ m.limiteFaltas || 5 }}
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

      <div v-if="zonaAtiva === 'saude'">
        <section class="card border-green-soft shadow-premium">
          <h3 class="section-title">Novo Hábito</h3>
          <input v-model="novoSaude.nome" placeholder="Nome" class="input-modern" />
          <button @click="salvarSaude" class="btn-primary-green">Salvar</button>
        </section>
        
        <div v-for="s in listaSaude" :key="s.id" class="materia-card-new health-border">
          <div class="m-card-row-top">
             <strong>{{ s.nome }}</strong>
             <button @click.stop="excluirSaude(s.id)" class="tool-btn delete">🗑️</button>
          </div>
        </div>
      </div>
    </main>

    <div v-if="dataFocada" class="modal-overlay" @click.self="dataFocada = null">
      <div class="modal-sheet animate-up">
        <div class="drag-handle"></div>
        <p class="modal-label">{{ dataFocada.id }}</p>
        <h2>{{ materiaSelecionada?.nome || 'Registro' }}</h2>

        <div class="modal-buttons" v-if="materiaSelecionada">
          <button @click="registrar('Presença')" class="m-btn btn-presenca">Presença ✅</button>
          <div class="m-row-flex">
            <button @click="registrar('Falta')" class="m-btn btn-falta">Falta ❌</button>
            <button @click="registrar('EAD')" class="m-btn btn-ead">EAD 💻</button>
          </div>
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
const listaSaude = ref([]);
const registrosSaude = ref([]);
const materiaSelecionada = ref(null);
const dataFocada = ref(null);

const novaMateria = ref({ nome: '', diaSemana: '', semestre: 1, limiteFaltas: 5 });
const novoSaude = ref({ nome: '', horario: '', frequencia: 'diario' });

const buscarDados = async () => {
  try {
    const [m, p, s, rs] = await Promise.all([
      getDocs(collection(db, "materias")),
      getDocs(collection(db, "presencas")),
      getDocs(collection(db, "saude")),
      getDocs(collection(db, "registrosSaude"))
    ]);
    materias.value = m.docs.map(d => ({id: d.id, ...d.data()}));
    presencas.value = p.docs.map(d => ({id: d.id, ...d.data()}));
    listaSaude.value = s.docs.map(d => ({id: d.id, ...d.data()}));
    registrosSaude.value = rs.docs.map(d => ({id: d.id, ...d.data()}));
  } catch (e) { console.error("Erro Firebase:", e); }
};

const salvarMateria = async () => {
  if(!novaMateria.value.nome) return;
  try {
    if(idEditando.value) {
      await updateDoc(doc(db, "materias", idEditando.value), novaMateria.value);
      idEditando.value = null;
    } else {
      await addDoc(collection(db, "materias"), novaMateria.value);
    }
    novaMateria.value = { nome: '', diaSemana: '', semestre: 1, limiteFaltas: 5 };
    buscarDados();
  } catch (e) { alert("Erro ao salvar"); }
};

const prepararEdicao = (m) => { idEditando.value = m.id; novaMateria.value = { ...m }; window.scrollTo({top: 0, behavior: 'smooth'}); };
const cancelarEdicao = () => { idEditando.value = null; novaMateria.value = { nome: '', diaSemana: '', semestre: 1, limiteFaltas: 5 }; };

const registrar = async (tipo) => {
  if(!materiaSelecionada.value || !dataFocada.value) return;
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
  return 'f-gold';
};

const atributosGerais = computed(() => presencas.value.map(p => ({
  highlight: { color: p.tipo === 'Presença' ? 'green' : (p.tipo === 'EAD' ? 'blue' : 'red'), fillMode: 'light' },
  dates: p.dataOriginal.toDate ? p.dataOriginal.toDate() : new Date(p.dataOriginal)
})));

const atributosCalendario = (id) => presencas.value.filter(p => p.materiaId === id).map(p => ({
  highlight: { color: p.tipo === 'Presença' ? 'green' : (p.tipo === 'EAD' ? 'blue' : 'red'), fillMode: 'solid' },
  dates: p.dataOriginal.toDate ? p.dataOriginal.toDate() : new Date(p.dataOriginal)
}));

const abrirModal = (day) => dataFocada.value = day;
const mudarZona = (z) => { zonaAtiva.value = z; materiaSelecionada.value = null; };
const togglePasta = (s) => pastaAberta.value = pastaAberta.value === s ? null : s;

const excluirMateria = async (id) => {
  if(confirm('Excluir esta disciplina?')) {
    await deleteDoc(doc(db, "materias", id));
    buscarDados();
  }
};

const salvarSaude = async () => {
  if(!novoSaude.value.nome) return;
  await addDoc(collection(db, "saude"), novoSaude.value);
  novoSaude.value = { nome: '', horario: '', frequencia: 'diario' };
  buscarDados();
};

const excluirSaude = async (id) => {
  if(confirm('Excluir?')) { await deleteDoc(doc(db, "saude", id)); buscarDados(); }
};

onMounted(buscarDados);
</script>

<style scoped>
/* BASE */
.mobile-container { max-width: 480px; margin: 0 auto; min-height: 100vh; background: #FAF9F6; color: #1e293b; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
.main-content { padding: 16px; padding-bottom: 100px; }

/* HEADER COM AS CORES SOLICITADAS */
.header-yellow { background: #FFDE21; padding: 40px 20px 30px; border-radius: 0 0 35px 35px; color: #451a03; box-shadow: 0 4px 20px rgba(255, 222, 33, 0.3); }
.header-green { background: #065f46; padding: 40px 20px 30px; border-radius: 0 0 35px 35px; color: white; }
.day-label { font-size: 0.75rem; font-weight: 800; opacity: 0.7; text-transform: uppercase; letter-spacing: 1px; }
h1 { font-size: 1.8rem; font-weight: 900; margin-top: 5px; }

.tabs-modern { display: flex; background: rgba(0,0,0,0.08); padding: 5px; border-radius: 16px; margin-top: 20px; }
.tabs-modern button { flex: 1; border: none; padding: 12px; border-radius: 12px; font-weight: 800; background: transparent; color: inherit; transition: 0.3s; }
.tabs-modern button.active { background: white; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }

/* CARDS E ESTILO PREMIUM */
.card { background: white; border-radius: 24px; padding: 24px; margin-bottom: 20px; box-shadow: 0 8px 20px rgba(0,0,0,0.04); border: 1px solid #f1f5f9; }
.border-top-gold { border-top: 6px solid #E0BC00; }

/* NOVO CARD DE MATÉRIA EM 2 LINHAS */
.materia-card-new { 
  background: white; border-radius: 20px; padding: 18px; margin-top: 12px; 
  border: 1px solid #e2e8f0; position: relative; transition: all 0.2s ease;
}
.materia-selected { border: 2px solid #E0BC00; background: #FFFEF5; transform: scale(1.02); box-shadow: 0 10px 20px rgba(224, 188, 0, 0.1); }

.m-card-row-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px; }
.subject-title { font-size: 1.15rem; color: #0f172a; font-weight: 800; line-height: 1.2; }
.materia-day-chip { background: #F1F5F9; font-size: 0.7rem; font-weight: 900; padding: 5px 12px; border-radius: 10px; color: #64748b; border: 1px solid #e2e8f0; }

.m-card-row-bottom { display: flex; justify-content: space-between; align-items: center; }
.falta-label { font-size: 0.8rem; color: #94a3b8; font-weight: 600; margin-right: 5px; }
.falta-val { font-size: 0.9rem; font-weight: 800; padding: 4px 12px; border-radius: 8px; }

.materia-controls-horizontal { display: flex; gap: 10px; }
.tool-btn { width: 40px; height: 40px; border-radius: 12px; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; }
.tool-btn.edit { background: #F0F9FF; color: #0369a1; }
.tool-btn.delete { background: #FEF2F2; color: #991b1b; }

/* CORES DE STATUS */
.f-gold { background: #FFFBEB; color: #E0BC00; }
.f-orange { background: #FFF7ED; color: #ea580c; }
.f-red { background: #FEF2F2; color: #dc2626; }

/* INPUTS */
.input-modern { width: 100%; height: 52px; background: #F8FAF9; border: 2px solid #F1F5F9; border-radius: 15px; padding: 0 16px; margin-bottom: 12px; box-sizing: border-box; font-size: 1rem; font-weight: 600; }
.input-modern:focus { border-color: #FFDE21; outline: none; background: white; }
.btn-primary-yellow { width: 100%; height: 55px; background: #FFDE21; border: none; border-radius: 15px; font-weight: 900; color: #451a03; cursor: pointer; box-shadow: 0 4px 12px rgba(255, 222, 33, 0.4); }
.btn-update { width: 100%; height: 55px; background: #0f172a; color: white; border: none; border-radius: 15px; font-weight: 800; }

/* SEMESTRES */
.folder-pill { background: white; padding: 18px; border-radius: 20px; display: flex; justify-content: space-between; margin-top: 12px; border: 1px solid #e2e8f0; cursor: pointer; font-weight: 800; }
.count-badge { background: #0f172a; color: white; padding: 3px 10px; border-radius: 10px; font-size: 0.75rem; }

/* MODAL */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); backdrop-filter: blur(4px); display: flex; align-items: flex-end; z-index: 100; }
.modal-sheet { background: white; width: 100%; border-radius: 35px 35px 0 0; padding: 30px; box-sizing: border-box; box-shadow: 0 -10px 40px rgba(0,0,0,0.1); }
.drag-handle { width: 40px; height: 5px; background: #e2e8f0; border-radius: 10px; margin: 0 auto 20px; }
.m-btn { width: 100%; height: 60px; border-radius: 20px; border: none; font-weight: 800; color: white; margin-bottom: 12px; font-size: 1.05rem; }
.btn-presenca { background: #065f46; }
.btn-falta { background: #dc2626; }
.btn-ead { background: #2563eb; }
.m-row-flex { display: flex; gap: 12px; }

.fade-in { animation: fadeIn 0.4s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.animate-up { animation: slideUp 0.3s ease-out; }
@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
</style>

