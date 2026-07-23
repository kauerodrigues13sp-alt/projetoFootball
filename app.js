// Importações SDK Web v12
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  deleteDoc,
  doc,
  getDocs,
  onSnapshot, 
  updateDoc,
  serverTimestamp, 
  query, 
  where
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

// Credenciais Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAgNv3fcNr7OPmCWXmHIrNOx08qbB14hz8",
  authDomain: "projetofootball.firebaseapp.com",
  projectId: "projetofootball",
  storageBucket: "projetofootball.firebasestorage.app",
  messagingSenderId: "625574300284",
  appId: "1:625574300284:web:b10627755c6f46766817f9"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const favCollection = collection(db, "favoritos_futebol");

// Elementos da DOM
const userNameInput = document.getElementById("userNameInput");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const resultCard = document.getElementById("resultCard");
const tiltCard = document.getElementById("tiltCard");
const itemImage = document.getElementById("itemImage");
const itemName = document.getElementById("itemName");
const itemDetail = document.getElementById("itemDetail");
const favBtn = document.getElementById("favBtn");
const favoritesGrid = document.getElementById("favoritesGrid");
const pitchPlayers = document.getElementById("pitchPlayers");
const filterBtns = document.querySelectorAll(".filter-btn");
const toastContainer = document.getElementById("toastContainer");

// Elementos do FUT Card
const futOverall = document.getElementById("futOverall");
const futPosition = document.getElementById("futPosition");
const statPac = document.getElementById("statPac");
const statSho = document.getElementById("statSho");
const statPas = document.getElementById("statPas");
const statDri = document.getElementById("statDri");
const statDef = document.getElementById("statDef");
const statPhy = document.getElementById("statPhy");

// Placar de Stats
const totalConvocados = document.getElementById("totalConvocados");
const totalClubes = document.getElementById("totalClubes");
const totalCraques = document.getElementById("totalCraques");

let currentItem = null;
let currentFilter = "all";
let audioCtx = null;

// Efeito Sonoro
function playWhistleSound() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(2200, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(2800, audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.25);
  } catch (e) {
    console.warn("Áudio não ativado", e);
  }
}

function launchConfetti() {
  if (typeof confetti === "function") {
    confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
  }
}

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.classList.add("toast");
  if (type === "error") toast.classList.add("error");
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// Tilt 3D
if (tiltCard) {
  tiltCard.addEventListener("mousemove", (e) => {
    const rect = tiltCard.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    tiltCard.style.transform = `rotateY(${x / 10}deg) rotateX(${-y / 10}deg)`;
  });

  tiltCard.addEventListener("mouseleave", () => {
    tiltCard.style.transform = "rotateY(0deg) rotateX(0deg)";
  });
}

// Gerador de Atributos do FUT Card
function generateRandomStats(isTeam) {
  if (isTeam) {
    return { overall: 88, pos: "CLUB", pac: 85, sho: 87, pas: 90, dri: 88, def: 86, phy: 89 };
  }
  const pac = Math.floor(Math.random() * 20) + 78;
  const sho = Math.floor(Math.random() * 25) + 72;
  const pas = Math.floor(Math.random() * 20) + 75;
  const dri = Math.floor(Math.random() * 20) + 78;
  const def = Math.floor(Math.random() * 40) + 50;
  const phy = Math.floor(Math.random() * 25) + 70;
  const overall = Math.round((pac + sho + pas + dri + def + phy) / 6) + 5;
  const positions = ["ST", "RW", "CAM", "CM", "CB", "LB"];
  const pos = positions[Math.floor(Math.random() * positions.length)];
  return { overall, pos, pac, sho, pas, dri, def, phy };
}

// Busca
async function searchTeamOrPlayer(name) {
  try {
    playWhistleSound();
    searchBtn.disabled = true;
    searchBtn.textContent = "BUSCANDO...";

    const teamRes = await fetch(`https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(name)}`);
    const teamData = await teamRes.json();

    if (teamData.teams && teamData.teams.length > 0) {
      const team = teamData.teams[0];
      const stats = generateRandomStats(true);
      currentItem = {
        name: team.strTeam,
        imageUrl: team.strBadge,
        detail: `País: ${team.strCountry || 'Internacional'}`,
        type: "team",
        stats
      };
    } else {
      const playerRes = await fetch(`https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=${encodeURIComponent(name)}`);
      const playerData = await playerRes.json();

      if (playerData.player && playerData.player.length > 0) {
        const player = playerData.player[0];
        const stats = generateRandomStats(false);
        currentItem = {
          name: player.strPlayer,
          imageUrl: player.strCutout || player.strThumb || "https://via.placeholder.com/150?text=Sem+Foto",
          detail: `${player.strTeam || 'Livre'} • ${player.strNationality || 'Global'}`,
          type: "player",
          stats
        };
      } else {
        showToast("Nenhum clube ou craque encontrado!", "error");
        resultCard.classList.add("hidden");
        return;
      }
    }

    // Preenche informações no Card FUT
    itemImage.src = currentItem.imageUrl;
    itemName.textContent = currentItem.name;
    itemDetail.textContent = currentItem.detail;
    
    futOverall.textContent = currentItem.stats.overall;
    futPosition.textContent = currentItem.stats.pos;
    statPac.textContent = currentItem.stats.pac;
    statSho.textContent = currentItem.stats.sho;
    statPas.textContent = currentItem.stats.pas;
    statDri.textContent = currentItem.stats.dri;
    statDef.textContent = currentItem.stats.def;
    statPhy.textContent = currentItem.stats.phy;

    resultCard.classList.remove("hidden");

  } catch (error) {
    console.error(error);
    showToast("Erro na busca.", "error");
  } finally {
    searchBtn.disabled = false;
    searchBtn.innerHTML = `<span>BUSCAR</span> ⚽`;
  }
}

searchBtn.addEventListener("click", () => {
  const queryText = searchInput.value.trim();
  if (queryText) searchTeamOrPlayer(queryText);
  else showToast("Digite um nome primeiro!", "error");
});

searchInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") searchBtn.click();
});

// Salvar
favBtn.addEventListener("click", async () => {
  if (!currentItem) return;
  const coachName = userNameInput.value.trim() || "Treinador Anônimo";

  try {
    const qCheck = query(favCollection, where("name", "==", currentItem.name));
    const querySnapshot = await getDocs(qCheck);

    if (!querySnapshot.empty) {
      showToast(`${currentItem.name} já foi convocado!`, "error");
      return;
    }

    await addDoc(favCollection, {
      name: currentItem.name,
      imageUrl: currentItem.imageUrl,
      type: currentItem.type,
      savedBy: coachName,
      createdAt: serverTimestamp()
    });

    launchConfetti();
    showToast(`🎉 ${currentItem.name} convocado por ${coachName}!`);
  } catch (error) {
    console.error(error);
    showToast("Erro ao favoritar.", "error");
  }
});

async function deleteFavorite(id, name) {
  try {
    await deleteDoc(doc(db, "favoritos_futebol", id));
    showToast(`${name} foi dispensado.`);
  } catch (error) {
    console.error(error);
  }
}

// Observer
onSnapshot(favCollection, (snapshot) => {
  renderFavorites(snapshot);
});

function renderFavorites(snapshot) {
  favoritesGrid.innerHTML = "";
  pitchPlayers.innerHTML = "";

  let countTotal = 0, countTeams = 0, countPlayers = 0;

  const defaultPositions = [
    { top: '82%', left: '44%' }, { top: '65%', left: '18%' }, { top: '68%', left: '36%' },
    { top: '68%', left: '52%' }, { top: '65%', left: '70%' }, { top: '45%', left: '30%' },
    { top: '45%', left: '58%' }, { top: '25%', left: '18%' }, { top: '28%', left: '44%' },
    { top: '25%', left: '70%' }, { top: '12%', left: '44%' }
  ];

  let pinIndex = 0;

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const id = docSnap.id;

    countTotal++;
    if (data.type === "team" || data.type === "club") countTeams++;
    else countPlayers++;

    if (pinIndex < 11) {
      const pin = document.createElement("div");
      pin.classList.add("pitch-pin");
      pin.title = `${data.name} (${data.savedBy || 'Anônimo'})`;
      pin.innerHTML = `
        <img src="${data.imageUrl}" alt="${data.name}">
        <span class="pitch-pin-label">${data.name.split(' ')[0]}</span>
      `;

      const pos = (data.posX && data.posY) ? { top: data.posY, left: data.posX } : (defaultPositions[pinIndex] || { top: '50%', left: '50%' });
      pin.style.top = pos.top;
      pin.style.left = pos.left;

      makePinDraggable(pin, id);
      pitchPlayers.appendChild(pin);
      pinIndex++;
    }

    const itemType = (data.type === "team" || data.type === "club") ? "team" : "player";
    if (currentFilter !== "all" && itemType !== currentFilter) return;

    const favCard = document.createElement("div");
    favCard.classList.add("fav-card-3d");
    favCard.innerHTML = `
      <button class="btn-delete-3d" title="Dispensar">✖</button>
      <img src="${data.imageUrl}" alt="${data.name}">
      <h4>${data.name}</h4>
      <p class="saved-by">🎮 ${data.savedBy || 'Anônimo'}</p>
    `;

    favCard.querySelector(".btn-delete-3d").addEventListener("click", () => deleteFavorite(id, data.name));
    favoritesGrid.appendChild(favCard);
  });

  if (totalConvocados) totalConvocados.textContent = countTotal;
  if (totalClubes) totalClubes.textContent = countTeams;
  if (totalCraques) totalCraques.textContent = countPlayers;
}

function makePinDraggable(elmnt, docId) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

  elmnt.onmousedown = dragMouseDown;
  elmnt.ontouchstart = dragTouchStart;

  function dragMouseDown(e) {
    e.preventDefault();
    pos3 = e.clientX; pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e.preventDefault();
    pos1 = pos3 - e.clientX; pos2 = pos4 - e.clientY;
    pos3 = e.clientX; pos4 = e.clientY;

    const parent = elmnt.parentElement.getBoundingClientRect();
    let newTop = elmnt.offsetTop - pos2;
    let newLeft = elmnt.offsetLeft - pos1;

    if (newTop >= 0 && newTop <= parent.height - 48) elmnt.style.top = newTop + "px";
    if (newLeft >= 0 && newLeft <= parent.width - 48) elmnt.style.left = newLeft + "px";
  }

  async function closeDragElement() {
    document.onmouseup = null; document.onmousemove = null;
    await savePinPosition();
  }

  function dragTouchStart(e) {
    const touch = e.touches[0];
    pos3 = touch.clientX; pos4 = touch.clientY;
    document.ontouchend = closeTouchElement;
    document.ontouchmove = touchMove;
  }

  function touchMove(e) {
    const touch = e.touches[0];
    pos1 = pos3 - touch.clientX; pos2 = pos4 - touch.clientY;
    pos3 = touch.clientX; pos4 = touch.clientY;

    const parent = elmnt.parentElement.getBoundingClientRect();
    let newTop = elmnt.offsetTop - pos2;
    let newLeft = elmnt.offsetLeft - pos1;

    if (newTop >= 0 && newTop <= parent.height - 48) elmnt.style.top = newTop + "px";
    if (newLeft >= 0 && newLeft <= parent.width - 48) elmnt.style.left = newLeft + "px";
  }

  async function closeTouchElement() {
    document.ontouchend = null; document.ontouchmove = null;
    await savePinPosition();
  }

  async function savePinPosition() {
    try {
      if (!docId) return;
      const playerRef = doc(db, "favoritos_futebol", docId);
      await updateDoc(playerRef, { posY: elmnt.style.top, posX: elmnt.style.left });
    } catch (err) {
      console.error(err);
    }
  }
}

// Filtros
filterBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    filterBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    getDocs(favCollection).then(snapshot => renderFavorites(snapshot));
  });
});

// Quiz
const quizData = [
  { q: "Qual clube tem mais títulos da Champions League?", options: ["Real Madrid", "Milan", "Bayern"], correct: 0 },
  { q: "Quem tem mais Bolas de Ouro na história?", options: ["Cristiano Ronaldo", "Messi", "Pelé"], correct: 1 },
  { q: "Qual seleção venceu a Copa do Mundo de 2022?", options: ["França", "Brasil", "Argentina"], correct: 2 }
];

let currentQuiz = 0;

function loadQuiz() {
  const quizQuestion = document.getElementById("quizQuestion");
  const optionsDiv = document.getElementById("quizOptions");
  if (!quizQuestion || !optionsDiv) return;

  const quiz = quizData[currentQuiz];
  quizQuestion.textContent = quiz.q;
  optionsDiv.innerHTML = "";

  quiz.options.forEach((opt, index) => {
    const btn = document.createElement("button");
    btn.classList.add("quiz-btn");
    btn.textContent = opt;
    btn.onclick = () => checkQuiz(index);
    optionsDiv.appendChild(btn);
  });
}

function checkQuiz(selectedIndex) {
  const feedback = document.getElementById("quizFeedback");
  if (selectedIndex === quizData[currentQuiz].correct) {
    feedback.textContent = "⚽ GOLAZO! Resposta Correta!";
    feedback.style.color = "var(--primary-green)";
    launchConfetti();
  } else {
    feedback.textContent = "❌ Na trave! Tente novamente na próxima.";
    feedback.style.color = "var(--danger-red)";
  }

  setTimeout(() => {
    feedback.textContent = "";
    currentQuiz = (currentQuiz + 1) % quizData.length;
    loadQuiz();
  }, 2500);
}

document.addEventListener("DOMContentLoaded", () => {
  loadQuiz();
});