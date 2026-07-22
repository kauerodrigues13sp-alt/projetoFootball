// Importações SDK Web v12 do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  serverTimestamp, 
  query, 
  orderBy 
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

// Credenciais do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAgNv3fcNr7OPmCWXmHIrNOx08qbB14hz8",
  authDomain: "projetofootball.firebaseapp.com",
  projectId: "projetofootball",
  storageBucket: "projetofootball.firebasestorage.app",
  messagingSenderId: "625574300284",
  appId: "1:625574300284:web:b10627755c6f46766817f9"
};

// Inicializa o Firebase e a coleção no Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const favCollection = collection(db, "favoritos_futebol");

// Elementos da DOM
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const resultCard = document.getElementById("resultCard");
const itemImage = document.getElementById("itemImage");
const itemName = document.getElementById("itemName");
const itemDetail = document.getElementById("itemDetail");
const favBtn = document.getElementById("favBtn");
const favoritesGrid = document.getElementById("favoritesGrid");

// Estado temporário da busca
let currentItem = null;

// 1. Função de Pesquisa para TIMES e JOGADORES (Sem necessidade de API Key)
async function searchTeamOrPlayer(name) {
  try {
    searchBtn.disabled = true;
    searchBtn.textContent = "BUSCANDO...";

    // ETAPA A: Primeiro tenta buscar por TIME
    const teamResponse = await fetch(`https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(name)}`);
    const teamData = await teamResponse.json();

    if (teamData.teams && teamData.teams.length > 0) {
      const team = teamData.teams[0];
      currentItem = {
        name: team.strTeam,
        imageUrl: team.strBadge,
        detail: `País: ${team.strCountry || 'Internacional'}`
      };
    } else {
      // ETAPA B: Se não achar um time, busca por JOGADOR
      const playerResponse = await fetch(`https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=${encodeURIComponent(name)}`);
      const playerData = await playerResponse.json();

      if (playerData.player && playerData.player.length > 0) {
        const player = playerData.player[0];
        currentItem = {
          name: player.strPlayer,
          imageUrl: player.strCutout || player.strThumb || "https://via.placeholder.com/150?text=Sem+Foto",
          detail: `Clube: ${player.strTeam || 'N/D'} | Posição: ${player.strPosition || 'Jogador'}`
        };
      } else {
        alert("Nenhum time ou jogador encontrado! Tente buscar por nomes como: Real Madrid, Messi, Neymar, Flamengo, Barcelona.");
        resultCard.classList.add("hidden");
        return;
      }
    }

    // Exibe os dados no card principal
    itemImage.src = currentItem.imageUrl;
    itemName.textContent = currentItem.name;
    itemDetail.textContent = currentItem.detail;
    resultCard.classList.remove("hidden");

  } catch (error) {
    console.error("Erro na busca:", error);
    alert("Erro de conexão ao realizar a pesquisa.");
  } finally {
    searchBtn.disabled = false;
    searchBtn.innerHTML = `<span>BUSCAR</span> ⚽`;
  }
}

// 2. Evento de clique no botão de busca
searchBtn.addEventListener("click", () => {
  const text = searchInput.value.trim();
  if (text) {
    searchTeamOrPlayer(text);
  } else {
    alert("Digite o nome de um time ou jogador para buscar!");
  }
});

// Suporte para buscar ao pressionar "Enter" no teclado
searchInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    searchBtn.click();
  }
});

// 3. Salvar o item no Firestore (Cloud Database)
favBtn.addEventListener("click", async () => {
  if (!currentItem) return;

  try {
    await addDoc(favCollection, {
      name: currentItem.name,
      imageUrl: currentItem.imageUrl,
      createdAt: serverTimestamp()
    });
    alert(`⚽ ${currentItem.name} foi adicionado aos favoritos!`);
  } catch (error) {
    console.error("Erro ao salvar no Firestore:", error);
    alert("Erro ao salvar o item no banco de dados.");
  }
});

// 4. Sincronização em Tempo Real (Mostra a lista favoritada pela turma)
const q = query(favCollection, orderBy("createdAt", "desc"));

onSnapshot(q, (snapshot) => {
  favoritesGrid.innerHTML = ""; // Limpa o grid antes de re-renderizar

  snapshot.forEach((doc) => {
    const data = doc.data();

    const favCard = document.createElement("div");
    favCard.classList.add("fav-card");

    favCard.innerHTML = `
      <img src="${data.imageUrl}" alt="${data.name}">
      <h4>${data.name}</h4>
    `;

    favoritesGrid.appendChild(favCard);
  });
});