// Configuración global de Chart.js
Chart.defaults.font.family = "'Montserrat', sans-serif";
Chart.defaults.color = '#555';
Chart.defaults.plugins.legend.position = 'top';
Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(0, 0, 0, 0.7)';
Chart.defaults.responsive = true;
Chart.defaults.maintainAspectRatio = false;

// Paleta de colores para gráficos
const colorPalette = [
  'rgba(67, 97, 238, 0.7)',
  'rgba(247, 37, 133, 0.7)',
  'rgba(76, 201, 240, 0.7)',
  'rgba(114, 9, 183, 0.7)',
  'rgba(249, 65, 68, 0.7)',
  'rgba(249, 199, 79, 0.7)',
];

// URL de la API
const API_URL = 'http://localhost:5000/api';

// Función para cargar datos del juego
async function loadGameData() {
  try {
    const response = await fetch(`${API_URL}/game-data`);
    const data = await response.json();
    updateDashboard(data);
  } catch (error) {
    console.error('Error al cargar datos:', error);
  }
}

// Actualizar dashboard
function updateDashboard(data) {
  updateKPIs(data);
  updateCharts(data);
}

// Actualizar KPIs
function updateKPIs(data) {
  const totalScore = data.reduce((sum, d) => sum + d.score, 0);
  const totalPlayers = new Set(data.map(d => d.player_name)).size;
  const totalTime = data.reduce((sum, d) => sum + d.time_played, 0);
  const avgLevel = data.reduce((sum, d) => sum + d.level, 0) / data.length || 0;

  $('#kpiScore').text(totalScore.toLocaleString());
  $('#kpiPlayers').text(totalPlayers);
  $('#kpiTime').text(formatTime(totalTime));
  $('#kpiLevel').text(avgLevel.toFixed(1));
}

// Formatear tiempo
function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

// Actualizar gráficos
function updateCharts(data) {
  createScoreDistribution(data);
  createLevelProgression(data);
  createTimePerPlayer(data);
}

// Gráfico de distribución de puntuaciones
function createScoreDistribution(data) {
  const ctx = document.getElementById('scoreDistribution').getContext('2d');
  const scores = data.map(d => d.score);
  const labels = ['0-1000', '1001-2000', '2001-3000', '3001-4000', '4001+'];
  const distribution = new Array(5).fill(0);

  scores.forEach(score => {
    const index = Math.min(Math.floor(score / 1000), 4);
    distribution[index]++;
  });

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Jugadores',
        data: distribution,
        backgroundColor: colorPalette[0],
        borderWidth: 1
      }]
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        }
      }
    }
  });
}

// Gráfico de progresión de niveles
function createLevelProgression(data) {
  const ctx = document.getElementById('levelProgression').getContext('2d');
  const levels = [...new Set(data.map(d => d.level))].sort((a, b) => a - b);
  const playersPerLevel = levels.map(level => 
    data.filter(d => d.level === level).length
  );

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: levels.map(l => `Nivel ${l}`),
      datasets: [{
        label: 'Jugadores por nivel',
        data: playersPerLevel,
        borderColor: colorPalette[1],
        backgroundColor: colorPalette[1].replace('0.7', '0.1'),
        fill: true,
        tension: 0.4
      }]
    }
  });
}

// Gráfico de tiempo por jugador
function createTimePerPlayer(data) {
  const ctx = document.getElementById('timePerPlayer').getContext('2d');
  const playerTimes = {};
  
  data.forEach(d => {
    playerTimes[d.player_name] = (playerTimes[d.player_name] || 0) + d.time_played;
  });

  const players = Object.keys(playerTimes);
  const times = Object.values(playerTimes);

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: players,
      datasets: [{
        label: 'Tiempo de juego',
        data: times,
        backgroundColor: colorPalette[2],
        borderWidth: 1
      }]
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: value => formatTime(value)
          }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: context => `Tiempo: ${formatTime(context.raw)}`
          }
        }
      }
    }
  });
}

// Cambio de tema
$('#toggleTheme').on('click', function() {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-bs-theme') === 'dark';
  html.setAttribute('data-bs-theme', isDark ? 'light' : 'dark');
  
  $(this).html(isDark ? 
    '<i class="bi bi-moon-fill"></i> Modo Oscuro' : 
    '<i class="bi bi-sun-fill"></i> Modo Claro'
  );
  
  Chart.defaults.color = isDark ? '#eee' : '#555';
  loadGameData();
});

// Cargar datos iniciales
loadGameData();