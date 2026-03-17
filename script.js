'use strict';

/* ======================
   AUDIO & PRESET DEV
====================== */
const sound_point = new Audio('assets/point.mp3');
const sound_die   = new Audio('assets/die.mp3');
const sound_flap  = new Audio('assets/flap3.mp3');
const bg_music    = new Audio('assets/8bi.mp3');
bg_music.loop = true;

// Ubah di sini kalau perlu (khusus developer)
const AUDIO = { bgm: 0.5, sfx: 1 };
bg_music.volume = AUDIO.bgm;
[sound_point, sound_die, sound_flap].forEach(a => a.volume = AUDIO.sfx);

// Preset kesulitan (khusus developer)
const PRESETS = {
  easy:   { speed: 8,  gravity: 0.26, flap: 7.8, gap: 42, spawn: 130 },
  medium: { speed: 10, gravity: 0.30, flap: 7.6, gap: 35, spawn: 120 },
  hard:   { speed: 13, gravity: 0.34, flap: 7.4, gap: 28, spawn: 110 },
};

/* ======================
   ELEMEN DOM
====================== */
const backgroundEl = document.querySelector('.background');
const bird    = document.querySelector('.bird');
const img     = document.getElementById('bird-1');
const scoreEl = document.querySelector('.score_val');
const msgEl   = document.querySelector('.message');
const scoreTitle = document.querySelector('.score_title');

const overlay = document.getElementById('menuOverlay');
const screenMain    = document.getElementById('screen-main');
const screenDiff    = document.getElementById('screen-difficulty');
const screenCredits = document.getElementById('screen-credits');

// Tombol menu
const btnMainPlay     = document.getElementById('btnMainPlay');
const btnMainCredits  = document.getElementById('btnMainCredits');
const btnBackMainDiff = document.getElementById('btnBackMainFromDiff');
const btnBackMainCred = document.getElementById('btnBackMainFromCredits');

/* ======================
   STATE GAME
====================== */
let game_state = 'Start';
let move_speed = 10;
let grativy    = 0.3;  // ejaan tetap mengikuti kode awalmu
let flap_force = 7.6;
let pipe_gap   = 35;
let spawn_every= 120;
let lastDiff   = 'medium'; // default

function applyPreset(name) {
  const p = PRESETS[name] || PRESETS.medium;
  move_speed = p.speed;
  grativy    = p.gravity;
  flap_force = p.flap;
  pipe_gap   = p.gap;
  spawn_every= p.spawn;
  lastDiff   = name;
}

/* ======================
   MENU NAVIGATION
====================== */
function showOverlay(){ overlay.style.display = 'grid'; }
function hideOverlay(){ overlay.style.display = 'none'; }
function showScreen(target) {
  [screenMain, screenDiff, screenCredits].forEach(s => s.classList.add('hidden'));
  target.classList.remove('hidden');
  showOverlay();
}

// ke layar difficulty & kredit
btnMainPlay.addEventListener('click',   () => showScreen(screenDiff));
btnMainCredits.addEventListener('click',() => showScreen(screenCredits));
btnBackMainDiff.addEventListener('click', () => showScreen(screenMain));
btnBackMainCred.addEventListener('click', () => showScreen(screenMain));

// pilih difficulty → start game
Array.from(document.querySelectorAll('[data-diff]')).forEach(btn => {
  btn.addEventListener('click', () => {
    applyPreset(btn.dataset.diff);
    startGame();
  });
});

/* ======================
   KONTROL
====================== */
let bird_dy = 0;

// Flap
document.addEventListener('keydown', (e) => {
  // Restart saat End
  if (e.key === 'Enter' && game_state === 'End') {
    e.preventDefault();
    startGame();
    return;
  }
  if (game_state !== 'Play') return;
  if (e.key === 'ArrowUp' || e.key === ' ' || e.code === 'Space') {
    img.src = 'Bird.png';
    bird_dy = -flap_force;
    try { sound_flap.currentTime = 0; sound_flap.play(); } catch {}
  }
});
document.addEventListener('keyup', (e) => {
  if (game_state !== 'Play') return;
  if (e.key === 'ArrowUp' || e.key === ' ' || e.code === 'Space') {
    img.src = 'Bird-2.png';
  }
});

/* ======================
   UTIL
====================== */
function clearPipes(){ document.querySelectorAll('.pipe_sprite').forEach(e => e.remove()); }
function resetBird(){ bird.style.top = '40vh'; bird.style.left = '20vw'; bird_dy = 0; }

function startGame(){
  clearPipes();
  resetBird();
  img.style.display = 'block';
  msgEl.innerHTML = '';
  msgEl.classList.remove('messageStyle');
  scoreTitle.textContent = 'Score : ';
  scoreEl.textContent = '0';
  game_state = 'Play';
  hideOverlay();
  try { bg_music.currentTime = 0; bg_music.play(); } catch {}
  play();
}

function endGame(text='Game Over'){
  game_state = 'End';
  msgEl.innerHTML = `<span style="color: var(--danger)">${text}</span><br>Tekan <b>Enter</b> untuk Restart`;
  msgEl.classList.add('messageStyle');
  img.style.display = 'none';
  try { sound_die.play(); } catch {}
  try { bg_music.pause(); } catch {}
  // Tetap di layar game; pemain bisa tekan Enter untuk retry (pakai difficulty terakhir).
}

/* ======================
   GAME LOOP
====================== */
let raf_move, raf_grav, raf_pipe;

function play(){
  let pipe_seperation = 0; // mengikuti ejaan variabelmu

  function move(){
    if (game_state !== 'Play') return;
    const pipe_sprite = document.querySelectorAll('.pipe_sprite');
    const bird_props = bird.getBoundingClientRect();

    pipe_sprite.forEach((element) => {
      const rect = element.getBoundingClientRect();

      if (rect.right <= 0) {
        element.remove();
      } else {
        // Cek tabrakan
        const collide = (
          bird_props.left < rect.left + rect.width &&
          bird_props.left + bird_props.width > rect.left &&
          bird_props.top  < rect.top + rect.height &&
          bird_props.top + bird_props.height > rect.top
        );
        if (collide) { return endGame(); }

        // Skor (hanya dari pipa bawah yang punya increase_score = '1')
        if (rect.right < bird_props.left && rect.right + move_speed >= bird_props.left && element.increase_score === '1') {
          scoreEl.textContent = String(+scoreEl.textContent + 1);
          element.increase_score = '0';
          try { sound_point.play(); } catch {}
        }

        element.style.left = (rect.left - move_speed) + 'px';
      }
    });
    raf_move = requestAnimationFrame(move);
  }

  function apply_gravity(){
    if (game_state !== 'Play') return;
    const bg = backgroundEl.getBoundingClientRect();
    const bird_props = bird.getBoundingClientRect();

    bird_dy = bird_dy + grativy;

    if (bird_props.top <= 0 || bird_props.bottom >= bg.bottom) {
      return endGame();
    }

    bird.style.top = (bird_props.top + bird_dy) + 'px';
    raf_grav = requestAnimationFrame(apply_gravity);
  }

  function create_pipe(){
    if (game_state !== 'Play') return;

    if (pipe_seperation > spawn_every) {
      pipe_seperation = 0;
      const pipe_posi = Math.floor(Math.random() * 48) + 8; // 8..55

      // Pipa atas
      const topPipe = document.createElement('div');
      topPipe.className = 'pipe_sprite';
      topPipe.style.height = Math.max(0, (pipe_posi - 8)) + 'vh';
      topPipe.style.top = '0';
      topPipe.style.left = '100vw';

      // Pipa bawah
      const bottomPipe = document.createElement('div');
      bottomPipe.className = 'pipe_sprite';
      bottomPipe.style.height = Math.max(0, (100 - (pipe_posi + pipe_gap))) + 'vh';
      bottomPipe.style.top = (pipe_posi + pipe_gap) + 'vh';
      bottomPipe.style.left = '100vw';
      bottomPipe.increase_score = '1';

      backgroundEl.appendChild(topPipe);
      backgroundEl.appendChild(bottomPipe);
    }
    pipe_seperation++;
    raf_pipe = requestAnimationFrame(create_pipe);
  }

  cancelAnimationFrame(raf_move);
  cancelAnimationFrame(raf_grav);
  cancelAnimationFrame(raf_pipe);
  raf_move = requestAnimationFrame(move);
  raf_grav = requestAnimationFrame(apply_gravity);
  raf_pipe = requestAnimationFrame(create_pipe);
}

/* ======================
   INIT
====================== */
img.style.display = 'none';
msgEl.classList.add('messageStyle');
msgEl.innerHTML = 'Klik <b>Play</b> → pilih tingkat kesulitan';
showScreen(screenMain);