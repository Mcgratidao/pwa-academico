<template>
  <div id="app" class="mobile-container">
    <header :class="zonaAtiva === 'saude' ? 'header-green' : 'header-yellow'">
      <div class="header-content">
        <span class="day-label">{{ dataAtual }}</span>
        <h1>{{ zonaAtiva === 'saude' ? 'Saúde & Bem-estar' : 'Gestão Acadêmica' }}</h1>
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
            <h3 class="section-title">{{ idEditando ? 'Editar Disciplina' : 'Nova Disciplina' }}</h3>
            <button v-if="idEditando" @click="cancelarEdicao" class="btn-cancel-link">Cancelar</button>
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
            <div class="select-wrapper">
              <label class="small-label">Limite de Faltas</label>
              <select v-model.number="novaMateria.limiteFaltas" class="input-modern">
                <option :value="2">Matéria Curta (Limite: 2)</option>
                <option :value="5">Matéria Longa (Limite: 5)</option>
              </select>
            </div>
            <button @click="salvarMateria" :class="idEditando ? 'btn-update' : 'btn-primary-yellow'">
              {{ idEditando ? 'Confirmar' : 'Adicionar à Grade' }}
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
                 :class="['materia-card-pro', { 'selected': materiaSelecionada?.id === m.id }]">
              
              <div class="card-line-1">
                <div class="subject-meta">
                  <span class="day-badge">{{ diasSemanaPt[m.diaSemana] }}</span>
                  <h4 class="subject-name">{{ m.nome }}</h4>
                </div>
                <div class="action-icons">
                  <button @click.stop="prepararEdicao(m)" class="icon-btn edit">✏️</button>
                  <button @click.stop="excluirMateria(m.id)" class="icon-btn delete">🗑️</button>
                </div>
              </div>

              <div class="card-line-2">
                <div class="status-info">
                  <span class="faltas-count" :class="statusFalta(m)">
                    Faltas: <strong>{{ contarFaltas(m.id) }}</strong> / {{ m.limiteFaltas || 5 }}
                  </span>
                </div>
                <div class="progress-bar-bg">
                  <div class="progress-fill" 
                       :style="{ width: (contarFaltas(m.id) / (m.limiteFaltas || 5) * 100) + '%' }"
                       :class="statusFalta(m)">
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <section class="card calendar-card shadow-premium">
          <div class="calendar-nav">
            <h3>{{ materiaSelecionada ? materiaSelecionada.nome : 'Visão Geral' }}</h3>
            <button v-if="materiaSelecionada" @click="materiaSelecionada = null" class="btn-reset">Limpar Filtro</button>
          </div>
          <VDatePicker
            expanded transparent borderless
            :first-day-of-week="1"
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
          <div class="row-flex">
            <input v-model="novoSaude.horario" type="time" class="input-modern flex-1" />
            <button @click="salvarSaude" class="btn-primary-green flex-1">Salvar</button>
          </div>
        </section>

        <div v-for="s in listaSaude" :key="s.id"
             class="materia-card-pro"
             :class="{ 'health-selected': itemSaudeSelecionado?.id === s.id }"
             @click="itemSaudeSelecionado = s">
          <div class="card-line-1">
             <div class="subject-meta">
               <span class="day-badge health">{{ s.horario }}</span>
               <h4 class="subject-name">{{ s.nome }}</h4>
             </div>
             <button @click.stop="excluirSaude(s.id)" class="icon-btn delete">🗑️</button>
          </div>
        </div>
      </div>
    </main>

    <div v-if="dataFocada" class="modal-overlay" @click.self="dataFocada = null">
      <div class="modal-sheet animate-up">
        <div class="drag-handle"></div>
        <p class="modal-label">{{ dataFocada.id }}</p>
        <h2 class="modal-title">{{ zonaAtiva === 'academico' ? (materiaSelecionada?.nome || 'Atenção') : (itemSaudeSelecionado?.nome) }}</h2>

        <div class="modal-buttons">
          <template v-if="zonaAtiva === 'academico' && materiaSelecionada">
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
          <template v-else-if="zonaAtiva === 'saude' && itemSaudeSelecionado">
             <button @click="registrarSaude('Tomado')" class="m-btn btn-presenca">Concluído ✅</button>
             <button @click="registrarSaude('Esquecido')" class="m-btn btn-falta">Pulei ❌</button>
          </template>
        </div>
        <button @click="dataFocada = null" class="btn-close-text">Fechar</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* CONFIGURAÇÃO BASE */
.mobile-container { max-width: 480px; margin: 0 auto; min-height: 100vh; background: #fdfdfb; color: #2d3436; font-family: 'Inter', sans-serif; }
.main-content { padding: 20px; padding-bottom: 120px; }

/* HEADERS */
.header-yellow { background: #d4a017; padding: 40px 20px 30px; border-radius: 0 0 35px 35px; color: white; box-shadow: 0 10px 20px rgba(212,160,23,0.15); }
.header-green { background: #0b6e4f; padding: 40px 20px 30px; border-radius: 0 0 35px 35px; color: white; box-shadow: 0 10px 20px rgba(11,110,79,0.15); }
.day-label { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; opacity: 0.9; }
h1 { font-size: 1.6rem; font-weight: 900; margin: 5px 0 20px; }

/* TABS */
.tabs-modern { display: flex; background: rgba(255,255,255,0.15); padding: 5px; border-radius: 18px; }
.tabs-modern button { flex: 1; border: none; padding: 12px; border-radius: 14px; font-weight: 800; background: transparent; color: white; transition: 0.3s; }
.tabs-modern button.active { background: white; color: #2d3436; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }

/* CARDS E FORMULÁRIO */
.card { background: white; border-radius: 25px; padding: 20px; margin-bottom: 20px; border: 1px solid #f0f0e8; }
.shadow-premium { box-shadow: 0 15px 30px rgba(0,0,0,0.03); }
.input-modern { width: 100%; height: 52px; background: #f4f4f0; border: 1px solid #e8e8e0; border-radius: 15px; padding: 0 15px; margin-bottom: 12px; box-sizing: border-box; font-size: 1rem; }
.btn-primary-yellow { width: 100%; height: 55px; background: #d4a017; border: none; border-radius: 15px; font-weight: 900; color: white; cursor: pointer; }
.btn-update { width: 100%; height: 55px; background: #2d3436; border: none; border-radius: 15px; font-weight: 900; color: white; cursor: pointer; }

/* NOVO CARD DESIGN (DUAS LINHAS) */
.materia-card-pro { 
  background: white; border-radius: 20px; padding: 18px; margin-top: 12px; 
  border: 1px solid #eee; transition: 0.3s; cursor: pointer;
}
.materia-card-pro.selected { border: 2px solid #d4a017; background: #fffcf0; transform: scale(1.02); }

.card-line-1 { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px; }
.subject-meta { display: flex; flex-direction: column; gap: 4px; }
.day-badge { font-size: 0.65rem; font-weight: 900; text-transform: uppercase; color: #d4a017; background: #fff9e6; padding: 4px 8px; border-radius: 6px; width: fit-content; }
.day-badge.health { color: #0b6e4f; background: #e8f5f0; }
.subject-name { font-size: 1.1rem; font-weight: 800; color: #2d3436; margin: 0; }

.action-icons { display: flex; gap: 8px; }
.icon-btn { width: 36px; height: 36px; border-radius: 10px; border: none; background: #f8f8f5; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; cursor: pointer; }
.icon-btn.delete:hover { background: #fee2e2; color: #dc2626; }

.card-line-2 { display: flex; flex-direction: column; gap: 8px; }
.faltas-count { font-size: 0.85rem; font-weight: 600; color: #636e72; }
.faltas-count strong { color: #2d3436; }

/* BARRA DE PROGRESSO */
.progress-bar-bg { width: 100%; height: 6px; background: #f0f0e8; border-radius: 10px; overflow: hidden; }
.progress-fill { height: 100%; transition: 0.5s ease-out; }

/* CORES DE STATUS */
.f-gray { color: #636e72; background-color: #b2bec3; }
.f-orange { color: #d35400; background-color: #e67e22; }
.f-red { color: #c0392b; background-color: #e74c3c; }

/* PASTAS */
.folder-pill { background: #f8f8f5; padding: 18px; border-radius: 20px; display: flex; justify-content: space-between; margin-top: 12px; cursor: pointer; border: 1px solid #eee; font-weight: 800; }
.count-badge { background: #2d3436; color: white; padding: 4px 10px; border-radius: 10px; font-size: 0.75rem; }

/* MODAL */
.modal-sheet { background: white; width: 100%; border-radius: 35px 35px 0 0; padding: 30px; box-sizing: border-box; }
.m-row-flex { display: flex; gap: 10px; width: 100%; }
.m-btn { flex: 1; height: 60px; border-radius: 18px; border: none; font-weight: 800; color: white; margin-bottom: 10px; font-size: 1rem; }
.btn-presenca { background: #0b6e4f; width: 100%; }
.btn-falta { background: #c0392b; }
.btn-ead { background: #2980b9; }

.animate-up { animation: slideUp 0.3s ease-out; }
@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
</style>

