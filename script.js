//constantes
const app = document.getElementById('app');
const startScreen = document.getElementById('start-screen');
const gameScreen  = document.getElementById('game-screen');
const endScreen   = document.getElementById('end-screen');

const pageTitle = document.getElementById('page-title');
const title = document.getElementById('game-title');
const startBtn = document.getElementById('start-btn');

const scoreLabel = document.getElementById('score-label');

const targets = document.getElementById('targets');
const draggablesTitle  = document.getElementById('draggables-title');
const draggables     = document.getElementById('draggables');

const endBtn           = document.getElementById('end-btn');
const endtitle       = document.getElementById('end-title');
const endMessage     = document.getElementById('end-message');
const finalScoreLabel  = document.getElementById('final-score-label');
const restartBtn       = document.getElementById('restart-btn');

let state = {
  data: null,
  score: 0,
  total: 0,
  originalPositions: new Map(),
};

//ajuda
function showError(message){
  app.innerHTML = '';
  const err = document.createElement('div');
  err.style.padding = '24px';
  err.style.textAlign = 'center';
  err.style.color = '#8b0000';
  err.style.fontWeight = '700';
  err.textContent = message || 'Erro ao carregar o jogo.';
  app.appendChild(err);
}

function saveOriginalPosition(element){
  const parent = element.parentNode;
  const children = Array.from(parent.children);
  const index = children.indexOf(element);
  state.originalPositions.set(element.id, { parent, index });
}

function restoreOriginalPosition(element){
  const meta = state.originalPositions.get(element.id);
  if(!meta) return;
  const { parent, index } = meta;
  const children = Array.from(parent.children);
  if(index >= children.length) parent.appendChild(element);
  else parent.insertBefore(element, parent.children[index]);
}

function showFeedback(text, type = 'info'){
  let fb = document.querySelector('.feedback');
  if(!fb){
    fb = document.createElement('div');
    fb.className = 'feedback';
    document.querySelector('.draggables-wrapper')?.appendChild(fb);
  }
  fb.textContent = text || '';
  fb.classList.remove('ok','bad');
  if(type === 'ok') fb.classList.add('ok');
  if(type === 'bad') fb.classList.add('bad');
  clearTimeout(fb._t);
  fb._t = setTimeout(()=> { fb.textContent = ''; }, 1400);
}

//construção interface
function buildFromJSON(data){
  state.data = data;

  const tituloPagina = data.tituloPagina || '';
  const telaInicial = data.telaInicial || {};
  const telaJogo = data.telaJogo || {};
  const telaFinal = data.telaFinal || {};

  if(pageTitle) pageTitle.textContent = tituloPagina;
  if(typeof document !== 'undefined') document.title = tituloPagina;

  //tela inicial
  if(title) title.textContent = (telaInicial.tituloJogo || '');
  if(startBtn) startBtn.textContent = (telaInicial.botaoIniciar || '');

  //(placar / textos)
  const scoreLabelText = telaJogo.labelPlacar || '';
  if(scoreLabel){
    scoreLabel.innerHTML = '';
    if(scoreLabelText) {
      scoreLabel.appendChild(document.createTextNode(scoreLabelText + ': '));
    }
    const scoreSpan = document.createElement('span');
    scoreSpan.id = 'score';
    scoreSpan.textContent = '0';
    scoreLabel.appendChild(scoreSpan);
  }

  if(draggablesTitle) draggablesTitle.textContent = (telaJogo.tituloDraggables || '');
  if(endBtn) endBtn.textContent = (telaJogo.botaoTerminar || '');

  //tela final
  if(endtitle) endtitle.textContent = (telaFinal.titulo || '');
  if(endMessage) endMessage.textContent = (telaFinal.mensagem || '');
  if(finalScoreLabel){
    finalScoreLabel.innerHTML = '';
    const lbl = telaFinal.labelPontuacaoFinal || '';
    if(lbl) finalScoreLabel.appendChild(document.createTextNode(lbl + ': '));
    const strong = document.createElement('strong');
    strong.id = 'final-score';
    strong.textContent = '0';
    finalScoreLabel.appendChild(strong);
  }
  if(restartBtn) restartBtn.textContent = (telaFinal.botaoReiniciar || '');

  //opcoes e score
  const opcoes = Array.isArray(data.opcoes) ? data.opcoes : [];
  state.score = 0;
  state.total = opcoes.length;
  const scoreEl = document.getElementById('score');
  if(scoreEl) scoreEl.textContent = String(state.score);

  //reset
  targets.innerHTML = '';
  draggables.innerHTML = '';
  state.originalPositions.clear();

  //targets
  opcoes.forEach((etapa, idx) => {
    const t = document.createElement('div');
    t.className = 'target';
    t.dataset.name = etapa.nome;
    t.id = 'target-' + idx;
    t.tabIndex = 0;
    t.setAttribute('aria-label', etapa.nome || ('alvo-' + idx));
    t.textContent = etapa.nome || '';

    t.addEventListener('dragover', (ev) => ev.preventDefault());

    const onDrop = (ev) => {
      ev.preventDefault();
      const draggedId = ev.dataTransfer.getData('text/plain');
      const dragged = document.getElementById(draggedId);
      if(!dragged || dragged.draggable === false) return;

      if(dragged.dataset.name === t.dataset.name){
        //correto
        t.classList.add('correct');
        t.appendChild(dragged);
        dragged.draggable = false;
        state.score += 1;
        const scoreElement2 = document.getElementById('score');
        if(scoreElement2) scoreElement2.textContent = String(state.score);
        showFeedback('Correto!', 'ok');

        //bloquear este alvo
        t.removeEventListener('drop', onDrop);
        t.removeEventListener('dragover', (e)=>e.preventDefault);
        checkEnd();
      } else {
        //incorreto
        showFeedback('Incorreto. Tente novamente.', 'bad');
        setTimeout(()=> restoreOriginalPosition(dragged), 300);
      }
    };

    t.addEventListener('drop', onDrop);
    targets.appendChild(t);
  });

  //embaralhar opcoes
  const shuffled = opcoes
    .map((e, i) => ({ ...e, id: 'd-' + i }))
    .sort(()=> Math.random() - 0.5);

  shuffled.forEach(item => {
    const d = document.createElement('div');
    d.className = 'draggable';
    d.id = item.id;
    d.draggable = true;
    d.dataset.name = item.nome || '';
    d.textContent = item.descricao || '';
    d.setAttribute('role','button');
    d.setAttribute('tabindex','0');

    draggables.appendChild(d);
    saveOriginalPosition(d);

    d.addEventListener('dragstart', (ev) => {
      ev.dataTransfer.setData('text/plain', d.id);
      d.classList.add('dragging');
    });
    d.addEventListener('dragend', () => d.classList.remove('dragging'));

    d.addEventListener('touchstart', function(ev){
      if(ev.touches.length !== 1) return;
      d._touching = true;
      d._startX = ev.touches[0].clientX;
      d._startY = ev.touches[0].clientY;
      d.style.position = 'absolute';
      d.style.zIndex = 1000;
      d.classList.add('dragging');
      document.body.appendChild(d);
      d._move = function(e){
        if(!d._touching) return;
        e.preventDefault();
        let x = e.touches[0].clientX, y = e.touches[0].clientY;
        d.style.left = (x - d.offsetWidth/2) + 'px';
        d.style.top = (y - d.offsetHeight/2) + 'px';
      };
      document.addEventListener('touchmove', d._move, {passive:false});
    });

    d.addEventListener('touchend', function(ev){
      if(!d._touching) return;
      d._touching = false;
      d.classList.remove('dragging');
      d.style.position = '';
      d.style.left = '';
      d.style.top = '';
      d.style.zIndex = '';
      document.removeEventListener('touchmove', d._move);
      let x = ev.changedTouches[0].clientX, y = ev.changedTouches[0].clientY;
      let el = document.elementFromPoint(x, y);
      while(el && !el.classList.contains('target') && el !== document.body) el = el.parentNode;
      if(el && el.classList.contains('target') && el.dataset.name){
        if(d.dataset.name === el.dataset.name){
          el.classList.add('correct');
          el.appendChild(d);
          d.draggable = false;
          state.score += 1;
          const scoreElement2 = document.getElementById('score');
          if(scoreElement2) scoreElement2.textContent = String(state.score);
          showFeedback('Correto!', 'ok');
          el.replaceWith(el.cloneNode(true));
          checkEnd();
        } else {
          showFeedback('Incorreto. Tente novamente.', 'bad');
          setTimeout(()=> restoreOriginalPosition(d), 300);
        }
      } else {
        restoreOriginalPosition(d);
      }
    });
  });
}

//mostrar/ocultar telas
function showStart(){
  startScreen.classList.remove('hidden');
  gameScreen.classList.add('hidden');
  endScreen.classList.add('hidden');
}

function showGame(){
  startScreen.classList.add('hidden');
  gameScreen.classList.remove('hidden');
  endScreen.classList.add('hidden');
}

function showEnd(){
  startScreen.classList.add('hidden');
  gameScreen.classList.add('hidden');
  endScreen.classList.remove('hidden');
  const finalScore = document.getElementById('final-score');
  if(finalScore) finalScore.textContent = String(state.score);
}

function checkEnd(){
  if(state.score >= state.total){
    setTimeout(()=> showEnd(), 450);
  }
}

//botoes de acao
startBtn.addEventListener('click', ()=> showGame());
endBtn.addEventListener('click', ()=> showEnd());
restartBtn.addEventListener('click', ()=> {
  init();
  showStart();
});

async function init(){
  try{
    const res = await fetch('jogo.json', { cache: 'no-store' });
    if(!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();

    if(!data || !Array.isArray(data.opcoes) || data.opcoes.length === 0){
      throw new Error('Formato inválido');
    }

    buildFromJSON(data);
    showStart();
  }catch(err){
    console.error('Erro ao carregar', err);
    showError('Não foi possível carregar "jogo.json". Verifique o arquivo e tente novamente.');
  }
}

init();