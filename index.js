// Configuración global de Chart.js
Chart.defaults.font.family = "'Montserrat', sans-serif";
Chart.defaults.color = '#555';
Chart.defaults.plugins.legend.position = 'top';
Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(0, 0, 0, 0.7)';
Chart.defaults.responsive = true;
Chart.defaults.maintainAspectRatio = false;

// URLs de datos
const csvUrl = "https://raw.githubusercontent.com/rudyluis/DashboardJS/refs/heads/main/superstore_data.csv";

// Variables globales
let allData = [];
let dataTable;
let activeCharts = {};

// Paleta de colores para gráficos
const colorPalette = [
  'rgba(67, 97, 238, 0.7)',
  'rgba(247, 37, 133, 0.7)',
  'rgba(76, 201, 240, 0.7)',
  'rgba(114, 9, 183, 0.7)',
  'rgba(249, 65, 68, 0.7)',
  'rgba(249, 199, 79, 0.7)',
  'rgba(144, 190, 109, 0.7)',
  'rgba(39, 125, 161, 0.7)',
  'rgba(58, 12, 163, 0.7)',
  'rgba(67, 170, 139, 0.7)',
  'rgba(144, 224, 239, 0.7)',
  'rgba(202, 103, 2, 0.7)',
];

// Función principal cuando el documento está listo
$(document).ready(function() {
  // Carga de datos desde CSV
  $.ajax({
    url: csvUrl,
    dataType: 'text',
    success: function(data) {
      const parsed = Papa.parse(data, {header: true});
      allData = parsed.data.filter(d => d.Category); // Filtrar filas sin categoría (posibles filas vacías)
      
      // Procesar fechas y valores numéricos
      allData = allData.map(d => {
        return {
          ...d,
          Order_Date: new Date(d.Order_Date),
          Ship_Date: new Date(d.Ship_Date),
          Sales: parseFloat(d.Sales) || 0,
          Quantity: parseInt(d.Quantity) || 0,
          Discount: parseFloat(d.Discount) || 0,
          Profit: parseFloat(d.Profit) || 0,
          // Agregar año, mes y trimestre para facilitar el filtrado
          Year: new Date(d.Order_Date).getFullYear(),
          Month: new Date(d.Order_Date).getMonth() + 1,
          Quarter: Math.ceil((new Date(d.Order_Date).getMonth() + 1) / 3)
        };
      });
      
      console.log("Datos cargados:", allData.length);
      
      // Inicializar componentes
      popularFiltros();
      inicializarTabla();
      aplicarFiltrosYGraficos();
      
      // Actualizar KPIs
      actualizarKPIs(allData);
    },
    error: function(err) {
      console.error("Error al cargar los datos:", err);
      alert("Error al cargar los datos. Por favor, revisa la consola para más detalles.");
    }
  });
  
  // Event listeners
  $('#filterCategoria, #filterRegion, #filterSegmento, #filterAnio').on('change', function() {
    aplicarFiltrosYGraficos();
  });
  
  $('#resetFilters').on('click', function() {
    $('#filterCategoria, #filterRegion, #filterSegmento, #filterAnio').val('');
    aplicarFiltrosYGraficos();
  });
  
  // Cambio de tema
  $('#toggleTheme').on('click', function() {
    const html = document.documentElement;
    const isDark = html.getAttribute('data-bs-theme') === 'dark';
    html.setAttribute('data-bs-theme', isDark ? 'light' : 'dark');
    
    // Actualizar texto del botón
    if (isDark) {
      $(this).html('<i class="bi bi-moon-fill"></i> Modo Oscuro');
      $(this).removeClass('btn-outline-dark').addClass('btn-outline-light');
    } else {
      $(this).html('<i class="bi bi-sun-fill"></i> Modo Claro');
      $(this).removeClass('btn-outline-light').addClass('btn-outline-dark');
    }
    
    // Actualizar colores de los gráficos
    Chart.defaults.color = isDark ? '#eee' : '#555';
    
    // Volver a renderizar gráficos con los nuevos colores
    aplicarFiltrosYGraficos();
  });
  
  // Event listener para las pestañas
  $('button[data-bs-toggle="tab"]').on('shown.bs.tab', function (e) {
    // Volver a renderizar gráficos cuando se muestra una pestaña
    aplicarFiltrosYGraficos();
  });
});

// Poblar los filtros con valores únicos
function popularFiltros() {
  const unique = (arr, key) => [...new Set(arr.map(d => d[key]).filter(Boolean))].sort();
  
  // Poblar filtros
  popularSelectOptions('#filterCategoria', unique(allData, 'Category'));
  popularSelectOptions('#filterRegion', unique(allData, 'Region'));
  popularSelectOptions('#filterSegmento', unique(allData, 'Segment'));
  
  // Para el año, extraemos el año de las fechas
  const years = [...new Set(allData.map(d => d.Year))].sort();
  popularSelectOptions('#filterAnio', years);
}

// Función auxiliar para poblar un select con opciones
function popularSelectOptions(selectId, options) {
  const select = $(selectId);
  const currentValue = select.val();
  
  select.empty().append('<option value="">Todos</option>');
  options.forEach(option => select.append(`<option value="${option}">${option}</option>`));
  
  // Restaurar valor si todavía es válido
  if (options.includes(currentValue)) {
    select.val(currentValue);
  }
}

// Inicializar tabla de datos
function inicializarTabla() {
  if (dataTable) {
    dataTable.destroy();
  }
  
  dataTable = $('#tablaDatos').DataTable({
    data: [],
    columns: [
      { title: "ID", data: "Order_ID" },
      { 
        title: "Fecha", 
        data: "Order_Date",
        render: function(data) {
          return data instanceof Date ? 
            data.toLocaleDateString('es-ES') : 
            new Date(data).toLocaleDateString('es-ES');
        }
      },
      { title: "Cliente", data: "Customer_Name" },
      { title: "Segmento", data: "Segment" },
      { title: "País", data: "Country" },
      { title: "Ciudad", data: "City" },
      { title: "Estado", data: "State" },
      { title: "Región", data: "Region" },
      { title: "Categoría", data: "Category" },
      { title: "Subcategoría", data: "Sub_Category" },
      { title: "Producto", data: "Product_Name" },
      { 
        title: "Ventas", 
        data: "Sales",
        className: "text-end",
        render: function(data) {
          return `$${parseFloat(data).toFixed(2)}`;
        }
      },
      { 
        title: "Cantidad", 
        data: "Quantity",
        className: "text-end"
      },
      { 
        title: "Descuento", 
        data: "Discount",
        className: "text-end",
        render: function(data) {
          return `${(parseFloat(data) * 100).toFixed(0)}%`;
        }
      },
      { 
        title: "Beneficio", 
        data: "Profit",
        className: "text-end",
        render: function(data) {
          const profit = parseFloat(data);
          const color = profit >= 0 ? 'success' : 'danger';
          return `<span class="text-${color}">$${profit.toFixed(2)}</span>`;
        }
      }
    ],
    language: {
      url: "https://cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json"
    },
    responsive: true,
    processing: true,
    dom: 'Bfrtip',
    pageLength: 10
  });
}

// Aplicar filtros y actualizar gráficos
function aplicarFiltrosYGraficos() {
  const categoria = $('#filterCategoria').val();
  const region = $('#filterRegion').val();
  const segmento = $('#filterSegmento').val();
  const anio = $('#filterAnio').val();
  
  // Aplicar filtros
  const datosFiltrados = allData.filter(d => 
    (!categoria || d.Category === categoria) &&
    (!region || d.Region === region) &&
    (!segmento || d.Segment === segmento) &&
    (!anio || d.Year == anio)
  );
  
  // Actualizar tabla
  if (dataTable) {
    dataTable.clear().rows.add(datosFiltrados).draw();
  }
  
  // Actualizar KPIs
  actualizarKPIs(datosFiltrados);
  
  // Renderizar gráficos
  renderizarGraficos(datosFiltrados);
}

// Actualizar KPIs
function actualizarKPIs(datos) {
  const totalVentas = datos.reduce((sum, d) => sum + parseFloat(d.Sales || 0), 0);
  const totalBeneficio = datos.reduce((sum, d) => sum + parseFloat(d.Profit || 0), 0);
  const totalPedidos = new Set(datos.map(d => d.Order_ID)).size;
  const margenPorcentaje = totalVentas > 0 ? (totalBeneficio / totalVentas) * 100 : 0;
  
  // Calcular cambios (usando datos de años anteriores para comparar)
  const anioActual = new Date().getFullYear();
  const datosAnioAnterior = allData.filter(d => d.Year === anioActual - 1);
  
  const ventasAnioAnterior = datosAnioAnterior.reduce((sum, d) => sum + parseFloat(d.Sales || 0), 0);
  const beneficioAnioAnterior = datosAnioAnterior.reduce((sum, d) => sum + parseFloat(d.Profit || 0), 0);
  const pedidosAnioAnterior = new Set(datosAnioAnterior.map(d => d.Order_ID)).size;
  const margenAnioAnterior = ventasAnioAnterior > 0 ? (beneficioAnioAnterior / ventasAnioAnterior) * 100 : 0;
  
  // Calcular porcentajes de cambio
  const calcularCambio = (actual, anterior) => anterior ? ((actual - anterior) / anterior) * 100 : 0;
  
  const cambioVentas = calcularCambio(totalVentas, ventasAnioAnterior);
  const cambioBeneficio = calcularCambio(totalBeneficio, beneficioAnioAnterior);
  const cambioPedidos = calcularCambio(totalPedidos, pedidosAnioAnterior);
  const cambioMargen = calcularCambio(margenPorcentaje, margenAnioAnterior);
  
  // Actualizar elementos HTML
  $('#kpiVentas').text(`$${formatNumber(totalVentas)}`);
  $('#kpiBeneficio').text(`$${formatNumber(totalBeneficio)}`);
  $('#kpiPedidos').text(formatNumber(totalPedidos));
  $('#kpiMargen').text(`${margenPorcentaje.toFixed(1)}%`);
  
  // Actualizar indicadores de cambio
  actualizarIndicadorCambio('#kpiVentasChange', cambioVentas);
  actualizarIndicadorCambio('#kpiBeneficioChange', cambioBeneficio);
  actualizarIndicadorCambio('#kpiPedidosChange', cambioPedidos);
  actualizarIndicadorCambio('#kpiMargenChange', cambioMargen);
}

// Función para formatear números
function formatNumber(num) {
  return new Intl.NumberFormat('es-ES', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  }).format(num);
}

// Actualizar indicadores de cambio
function actualizarIndicadorCambio(selector, porcentaje) {
  const formateado = Math.abs(porcentaje).toFixed(1);
  const isPositive = porcentaje >= 0;
  const icon = isPositive ? '<i class="bi bi-arrow-up-short"></i>' : '<i class="bi bi-arrow-down-short"></i>';
  const color = isPositive ? 'text-success' : 'text-danger';
  
  $(selector).html(`${icon} ${formateado}%`).removeClass('text-success text-danger').addClass(color);
}

// Renderizar todos los gráficos
function renderizarGraficos(datos) {
  // Destruir gráficos existentes
  Object.values(activeCharts).forEach(chart => {
    if (chart) chart.destroy();
  });
  
  // Reiniciar objeto de gráficos activos
  activeCharts = {};
  
  // Tab 1: Ventas por Región y Categoría
  activeCharts.ventasPorRegion = crearGraficoBarras('ventasPorRegion', datos, 'Region', 'Ventas por Región');
  activeCharts.ventasPorCategoria = crearGraficoPie('ventasPorCategoria', datos, 'Category', 'Ventas por Categoría');
  activeCharts.ventasPorSubcategoria = crearGraficoBarrasHorizontal('ventasPorSubcategoria', datos, 'Sub_Category', 'Top 10 Subcategorías');
  
  // Tab 2: Tendencias Temporales
  activeCharts.ventasPorMes = crearGraficoLinea('ventasPorMes', datos, 'Tendencia de Ventas Mensual');
  activeCharts.ventasPorTrimestre = crearGraficoBarrasAgrupadas('ventasPorTrimestre', datos, 'Ventas por Trimestre');
  activeCharts.comparativaAnual = crearGraficoComparativoAnual('comparativaAnual', datos);
  
  // Tab 3: Distribución
  activeCharts.distribucionPorSegmento = crearGraficoDoughnut('distribucionPorSegmento', datos, 'Segment', 'Distribución por Segmento');
  activeCharts.distribucionPorEnvio = crearGraficoDoughnut('distribucionPorEnvio', datos, 'Ship_Mode', 'Distribución por Método de Envío');
  
  // Tab 4: Rendimiento
  activeCharts.radarRendimiento = crearGraficoRadar('radarRendimiento', datos);
  activeCharts.margenPorCategoria = crearGraficoMargen('margenPorCategoria', datos);

  // Tab 5: Análisis Avanzado (Nuevos gráficos)
  activeCharts.graficoBurbujas = crearGraficoBurbujas('graficoBurbujas', datos);
  activeCharts.ventasSegmentoArea = crearGraficoAreaSegmento('ventasSegmentoArea', datos);
  activeCharts.topProductos = crearGraficoTopProductos('topProductos', datos);
  activeCharts.distribucionDescuentos = crearGraficoPolar('distribucionDescuentos', datos);
  activeCharts.correlacionVentasBeneficio = crearGraficoDispersion('correlacionVentasBeneficio', datos);
}

// FUNCIONES PARA CREAR GRÁFICOS

// Gráfico de barras
function crearGraficoBarras(id, datos, campo, titulo) {
  const ctx = document.getElementById(id).getContext('2d');
  
  // Calcular datos agregados
  const agregados = {};
  datos.forEach(d => {
    const key = d[campo];
    if (!key) return;
    agregados[key] = (agregados[key] || 0) + parseFloat(d.Sales || 0);
  });
  
  // Ordenar por valor
  const etiquetas = Object.keys(agregados).sort((a, b) => agregados[b] - agregados[a]);
  const valores = etiquetas.map(e => agregados[e]);
  
  // Crear gráfico
  return new Chart(ctx, {
    type: 'bar',
    data: {
      labels: etiquetas,
      datasets: [{
        label: 'Ventas',
        data: valores,
        backgroundColor: etiquetas.map((_, i) => colorPalette[i % colorPalette.length]),
        borderWidth: 1
      }]
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: titulo,
          font: { size: 16 }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `Ventas: $${formatNumber(context.raw)}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return '$' + value.toLocaleString('es-ES');
            }
          }
        }
      }
    }
  });
}

// Gráfico de barras horizontal
function crearGraficoBarrasHorizontal(id, datos, campo, titulo) {
  const ctx = document.getElementById(id).getContext('2d');
  
  // Calcular datos agregados
  const agregados = {};
  datos.forEach(d => {
    const key = d[campo];
    if (!key) return;
    agregados[key] = (agregados[key] || 0) + parseFloat(d.Sales || 0);
  });
  
  // Ordenar por valor y tomar los 10 primeros
  const etiquetas = Object.keys(agregados)
    .sort((a, b) => agregados[b] - agregados[a])
    .slice(0, 10);
  const valores = etiquetas.map(e => agregados[e]);
  
  // Crear gráfico
  return new Chart(ctx, {
    type: 'bar',
    data: {
      labels: etiquetas,
      datasets: [{
        label: 'Ventas',
        data: valores,
        backgroundColor: etiquetas.map((_, i) => colorPalette[i % colorPalette.length]),
        borderWidth: 1
      }]
    },
    options: {
      indexAxis: 'y',
      plugins: {
        title: {
          display: true,
          text: titulo,
          font: { size: 16 }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `Ventas: $${formatNumber(context.raw)}`;
            }
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return '$' + value.toLocaleString('es-ES');
            }
          }
        }
      }
    }
  });
}

// Gráfico de pastel
function crearGraficoPie(id, datos, campo, titulo) {
  const ctx = document.getElementById(id).getContext('2d');
  
  // Calcular datos agregados
  const agregados = {};
  datos.forEach(d => {
    const key = d[campo];
    if (!key) return;
    agregados[key] = (agregados[key] || 0) + parseFloat(d.Sales || 0);
  });
  
  // Ordenar por valor
  const etiquetas = Object.keys(agregados).sort((a, b) => agregados[b] - agregados[a]);
  const valores = etiquetas.map(e => agregados[e]);
  
  // Crear gráfico
  return new Chart(ctx, {
    type: 'pie',
    data: {
      labels: etiquetas,
      datasets: [{
        label: 'Ventas',
        data: valores,
        backgroundColor: etiquetas.map((_, i) => colorPalette[i % colorPalette.length]),
        borderWidth: 1
      }]
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: titulo,
          font: { size: 16 }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const value = context.raw;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((value / total) * 100).toFixed(1);
              return `${context.label}: $${formatNumber(value)} (${percentage}%)`;
            }
          }
        }
      }
    }
  });
}

// Gráfico de donut
function crearGraficoDoughnut(id, datos, campo, titulo) {
  const ctx = document.getElementById(id).getContext('2d');
  
  // Calcular datos agregados
  const agregados = {};
  datos.forEach(d => {
    const key = d[campo];
    if (!key) return;
    agregados[key] = (agregados[key] || 0) + parseFloat(d.Sales || 0);
  });
  
  // Ordenar por valor
  const etiquetas = Object.keys(agregados).sort((a, b) => agregados[b] - agregados[a]);
  const valores = etiquetas.map(e => agregados[e]);
  
  // Crear gráfico
  return new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: etiquetas,
      datasets: [{
        label: 'Ventas',
        data: valores,
        backgroundColor: etiquetas.map((_, i) => colorPalette[i % colorPalette.length]),
        borderWidth: 1
      }]
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: titulo,
          font: { size: 16 }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const value = context.raw;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((value / total) * 100).toFixed(1);
              return `${context.label}: $${formatNumber(value)} (${percentage}%)`;
            }
          }
        }
      }
    }
  });
}

// Gráfico de línea para tendencia mensual
function crearGraficoLinea(id, datos, titulo) {
  const ctx = document.getElementById(id).getContext('2d');
  
  // Calcular datos por mes
  const ventasPorMes = {};
  const beneficioPorMes = {};
  
  datos.forEach(d => {
    if (!d.Order_Date) return;
    
    // Formato año-mes para agrupar
    const date = new Date(d.Order_Date);
    const key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    
    ventasPorMes[key] = (ventasPorMes[key] || 0) + parseFloat(d.Sales || 0);
    beneficioPorMes[key] = (beneficioPorMes[key] || 0) + parseFloat(d.Profit || 0);
  });
  
  // Ordenar por fecha
  const meses = Object.keys(ventasPorMes).sort();
  const ventas = meses.map(m => ventasPorMes[m]);
  const beneficios = meses.map(m => beneficioPorMes[m]);
  
  // Formato de etiquetas más amigable (MMM YYYY)
  const etiquetasFormateadas = meses.map(m => {
    const [year, month] = m.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
  });
  
  // Crear gráfico
  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: etiquetasFormateadas,
      datasets: [
        {
          label: 'Ventas',
          data: ventas,
          borderColor: colorPalette[0],
          backgroundColor: colorPalette[0].replace('0.7', '0.1'),
          borderWidth: 2,
          fill: true,
          tension: 0.2
        },
        {
          label: 'Beneficio',
          data: beneficios,
          borderColor: colorPalette[1],
          backgroundColor: colorPalette[1].replace('0.7', '0.1'),
          borderWidth: 2,
          fill: true,
          tension: 0.2
        }
      ]
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: titulo,
          font: { size: 16 }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${context.dataset.label}: $${formatNumber(context.raw)}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return '$' + value.toLocaleString('es-ES');
            }
          }
        }
      }
    }
  });
}

// Gráfico de barras agrupadas para ventas por trimestre
function crearGraficoBarrasAgrupadas(id, datos, titulo) {
  const ctx = document.getElementById(id).getContext('2d');
  
  // Agrupar datos por año y trimestre
  const datosPorAnioTrimestre = {};
  
  datos.forEach(d => {
    if (!d.Order_Date) return;
    
    const year = d.Year;
    const quarter = d.Quarter;
    const key = `${year}-Q${quarter}`;
    
    if (!datosPorAnioTrimestre[year]) {
      datosPorAnioTrimestre[year] = {
        'Q1': 0, 'Q2': 0, 'Q3': 0, 'Q4': 0
      };
    }
    
    datosPorAnioTrimestre[year][`Q${quarter}`] += parseFloat(d.Sales || 0);
  });
  
  // Convertir a formato para Chart.js
  const years = Object.keys(datosPorAnioTrimestre).sort();
  const datasets = ['Q1', 'Q2', 'Q3', 'Q4'].map((quarter, i) => {
    return {
      label: `Trimestre ${quarter.slice(1)}`,
      data: years.map(year => datosPorAnioTrimestre[year][quarter]),
      backgroundColor: colorPalette[i],
      borderWidth: 1
    };
  });
  
  // Crear gráfico
  return new Chart(ctx, {
    type: 'bar',
    data: {
      labels: years,
      datasets: datasets
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: titulo,
          font: { size: 16 }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${context.dataset.label}: $${formatNumber(context.raw)}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return '$' + value.toLocaleString('es-ES');
            }
          }
        }
      }
    }
  });
}

// Gráfico comparativo anual
function crearGraficoComparativoAnual(id, datos) {
  const ctx = document.getElementById(id).getContext('2d');
  
  // Agrupar datos por año
  const ventasPorAnio = {};
  const beneficioPorAnio = {};
  
  datos.forEach(d => {
    if (!d.Order_Date) return;
    
    const year = d.Year;
    
    ventasPorAnio[year] = (ventasPorAnio[year] || 0) + parseFloat(d.Sales || 0);
    beneficioPorAnio[year] = (beneficioPorAnio[year] || 0) + parseFloat(d.Profit || 0);
  });
  
  // Ordenar por año
  const years = Object.keys(ventasPorAnio).sort();
  const ventas = years.map(year => ventasPorAnio[year]);
  const beneficios = years.map(year => beneficioPorAnio[year]);
  
  // Crear gráfico
  return new Chart(ctx, {
    type: 'bar',
    data: {
      labels: years,
      datasets: [
        {
          label: 'Ventas',
          data: ventas,
          backgroundColor: colorPalette[0],
          borderWidth: 1,
          order: 2
        },
        {
          label: 'Beneficio',
          data: beneficios,
          type: 'line',
          borderColor: colorPalette[1],
          backgroundColor: colorPalette[1].replace('0.7', '0.1'),
          borderWidth: 2,
          fill: false,
          pointRadius: 5,
          order: 1
        }
      ]
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: 'Comparativa Anual de Ventas y Beneficios',
          font: { size: 16 }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${context.dataset.label}: $${formatNumber(context.raw)}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return '$' + value.toLocaleString('es-ES');
            }
          }
        }
      }
    }
  });
}

// Gráfico radar de rendimiento
function crearGraficoRadar(id, datos) {
  const ctx = document.getElementById(id).getContext('2d');
  
  // Calcular métricas por categoría
  const categorias = [...new Set(datos.map(d => d.Category))].filter(Boolean);
  
  // Calcular total ventas y beneficio por categoría
  const ventasPorCategoria = {};
  const beneficioPorCategoria = {};
  const margenPorCategoria = {};
  const unidadesPorCategoria = {};
  const clientesPorCategoria = {};
  
  datos.forEach(d => {
    const cat = d.Category;
    if (!cat) return;
    
    ventasPorCategoria[cat] = (ventasPorCategoria[cat] || 0) + parseFloat(d.Sales || 0);
    beneficioPorCategoria[cat] = (beneficioPorCategoria[cat] || 0) + parseFloat(d.Profit || 0);
    unidadesPorCategoria[cat] = (unidadesPorCategoria[cat] || 0) + parseInt(d.Quantity || 0);
    
    // Clientes únicos
    if (!clientesPorCategoria[cat]) {
      clientesPorCategoria[cat] = new Set();
    }
    clientesPorCategoria[cat].add(d.Customer_ID);
  });
  
  // Calcular margen para cada categoría
  categorias.forEach(cat => {
    margenPorCategoria[cat] = ventasPorCategoria[cat] > 0 ? 
      (beneficioPorCategoria[cat] / ventasPorCategoria[cat]) * 100 : 0;
  });
  
  // Normalizar datos para el radar (escala 0-100)
  const normalizar = (datos, max = null) => {
    const maxVal = max || Math.max(...Object.values(datos));
    return Object.fromEntries(
      Object.entries(datos).map(([k, v]) => [k, maxVal > 0 ? (v / maxVal) * 100 : 0])
    );
  };
  
  const ventasNorm = normalizar(ventasPorCategoria);
  const beneficioNorm = normalizar(beneficioPorCategoria);
  const margenNorm = normalizar(margenPorCategoria, 100); // ya está en porcentaje
  const unidadesNorm = normalizar(unidadesPorCategoria);
  const clientesNorm = normalizar(Object.fromEntries(
    Object.entries(clientesPorCategoria).map(([k, v]) => [k, v.size])
  ));
  
  // Crear datasets
  const datasets = categorias.map((cat, i) => {
    return {
      label: cat,
      data: [
        ventasNorm[cat] || 0,
        beneficioNorm[cat] || 0,
        margenNorm[cat] || 0,
        unidadesNorm[cat] || 0,
        clientesNorm[cat] || 0
      ],
      backgroundColor: colorPalette[i % colorPalette.length].replace('0.7', '0.2'),
      borderColor: colorPalette[i % colorPalette.length],
      borderWidth: 2,
      pointBackgroundColor: colorPalette[i % colorPalette.length]
    };
  });
  
  // Crear gráfico
  return new Chart(ctx, {
    type: 'radar',
    data: {
      labels: ['Ventas', 'Beneficio', 'Margen', 'Unidades', 'Clientes'],
      datasets: datasets
    },
    options: {
      scales: {
        r: {
          angleLines: {
            display: true
          },
          suggestedMin: 0,
          suggestedMax: 100
        }
      },
      plugins: {
        title: {
          display: true,
          text: 'Rendimiento por Categoría',
          font: { size: 16 }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const index = context.dataIndex;
              const cat = context.dataset.label;
              const labels = ['Ventas', 'Beneficio', 'Margen', 'Unidades', 'Clientes'];
              
              let value;
              switch (index) {
                case 0: value = `$${formatNumber(ventasPorCategoria[cat])}`; break;
                case 1: value = `$${formatNumber(beneficioPorCategoria[cat])}`; break;
                case 2: value = `${margenPorCategoria[cat].toFixed(1)}%`; break;
                case 3: value = unidadesPorCategoria[cat]; break;
                case 4: value = clientesPorCategoria[cat].size; break;
              }
              
              return `${cat} - ${labels[index]}: ${value}`;
            }
          }
        }
      }
    }
  });
}

// Gráfico de margen por categoría
function crearGraficoMargen(id, datos) {
  const ctx = document.getElementById(id).getContext('2d');
  
  
  // Calcular ventas y beneficio por categoría
  const ventasPorCategoria = {};
  const beneficioPorCategoria = {};
  
  datos.forEach(d => {
    const cat = d.Category;
    if (!cat) return;
    ventasPorCategoria[cat] = (ventasPorCategoria[cat] || 0) + parseFloat(d.Sales || 0);
    beneficioPorCategoria[cat] = (beneficioPorCategoria[cat] || 0) + parseFloat(d.Profit || 0);
  });
  
  // Calcular margen para cada categoría
  const margenPorCategoria = {};
  Object.keys(ventasPorCategoria).forEach(cat => {
    margenPorCategoria[cat] = ventasPorCategoria[cat] > 0 ? 
      (beneficioPorCategoria[cat] / ventasPorCategoria[cat]) * 100 : 0;
  });
  
  // Ordenar por margen
  const categorias = Object.keys(margenPorCategoria).sort((a, b) => margenPorCategoria[b] - margenPorCategoria[a]);
  const margenes = categorias.map(cat => margenPorCategoria[cat]);
  const ventas = categorias.map(cat => ventasPorCategoria[cat]);
  
  // Crear gráfico
  return new Chart(ctx, {
    type: 'bar',
    data: {
      labels: categorias,
      datasets: [
        {
          label: 'Margen (%)',
          data: margenes,
          backgroundColor: colorPalette[0],
          borderWidth: 1,
          order: 1,
          yAxisID: 'y'
        },
        {
          label: 'Ventas',
          data: ventas,
          backgroundColor: colorPalette[1],
          borderWidth: 1,
          order: 2,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: 'Margen de Beneficio por Categoría',
          font: { size: 16 }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              if (context.dataset.label === 'Margen (%)') {
                return `Margen: ${context.raw.toFixed(1)}%`;
              } else {
                return `Ventas: $${formatNumber(context.raw)}`;
              }
            }
          }
        }
      },
      scales: {
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: 'Margen (%)'
          },
          ticks: {
            callback: function(value) {
              return value + '%';
            }
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: 'Ventas ($)'
          },
          ticks: {
            callback: function(value) {
              return '$' + value.toLocaleString('es-ES');
            }
          },
          grid: {
            drawOnChartArea: false
          }
        }
      }
    }
  });
}

// Nuevos gráficos

// Gráfico de burbujas
function crearGraficoBurbujas(id, datos) {
  const ctx = document.getElementById(id).getContext('2d');
  
  // Agrupar datos por categoría
  const datosPorCategoria = {};
  datos.forEach(d => {
    const cat = d.Category;
    if (!cat) return;
    if (!datosPorCategoria[cat]) {
      datosPorCategoria[cat] = {
        ventas: 0,
        beneficio: 0,
        cantidad: 0
      };
    }
    datosPorCategoria[cat].ventas += parseFloat(d.Sales || 0);
    datosPorCategoria[cat].beneficio += parseFloat(d.Profit || 0);
    datosPorCategoria[cat].cantidad += parseInt(d.Quantity || 0);
  });
  
  // Convertir a formato de burbujas
  const datasets = Object.entries(datosPorCategoria).map(([cat, data], i) => ({
    label: cat,
    data: [{
      x: data.ventas,
      y: data.beneficio,
      r: Math.sqrt(data.cantidad) / 2 // Raíz cuadrada para escalar el tamaño
    }],
    backgroundColor: colorPalette[i % colorPalette.length]
  }));
  
  return new Chart(ctx, {
    type: 'bubble',
    data: {
      datasets: datasets
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Relación Ventas-Beneficio-Cantidad por Categoría',
          font: { size: 16 }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const cat = context.dataset.label;
              const data = datosPorCategoria[cat];
              return [
                `Categoría: ${cat}`,
                `Ventas: $${formatNumber(data.ventas)}`,
                `Beneficio: $${formatNumber(data.beneficio)}`,
                `Cantidad: ${data.cantidad}`
              ];
            }
          }
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Ventas ($)'
          },
          ticks: {
            callback: function(value) {
              return '$' + value.toLocaleString('es-ES');
            }
          }
        },
        y: {
          title: {
            display: true,
            text: 'Beneficio ($)'
          },
          ticks: {
            callback: function(value) {
              return '$' + value.toLocaleString('es-ES');
            }
          }
        }
      }
    }
  });
}

// Gráfico de área apilada por segmento
function crearGraficoAreaSegmento(id, datos) {
  const ctx = document.getElementById(id).getContext('2d');
  
  // Agrupar datos por fecha y segmento
  const ventasPorFechaSegmento = {};
  const segmentos = new Set();
  
  datos.forEach(d => {
    if (!d.Order_Date || !d.Segment) return;
    
    const fecha = new Date(d.Order_Date).toISOString().split('T')[0];
    const segmento = d.Segment;
    
    if (!ventasPorFechaSegmento[fecha]) {
      ventasPorFechaSegmento[fecha] = {};
    }
    
    ventasPorFechaSegmento[fecha][segmento] = (ventasPorFechaSegmento[fecha][segmento] || 0) + parseFloat(d.Sales || 0);
    segmentos.add(segmento);
  });
  
  // Ordenar fechas
  const fechas = Object.keys(ventasPorFechaSegmento).sort();
  
  // Crear datasets
  const datasets = Array.from(segmentos).map((segmento, i) => ({
    label: segmento,
    data: fechas.map(fecha => ventasPorFechaSegmento[fecha][segmento] || 0),
    backgroundColor: colorPalette[i % colorPalette.length],
    fill: true
  }));
  
  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: fechas,
      datasets: datasets
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Tendencia de Ventas por Segmento',
          font: { size: 16 }
        },
        tooltip: {
          mode: 'index'
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Fecha'
          }
        },
        y: {
          stacked: true,
          title: {
            display: true,
            text: 'Ventas ($)'
          },
          ticks: {
            callback: function(value) {
              return '$' + value.toLocaleString('es-ES');
            }
          }
        }
      }
    }
  });
}

// Gráfico de top productos
function crearGraficoTopProductos(id, datos) {
  const ctx = document.getElementById(id).getContext('2d');
  
  // Agrupar ventas por producto
  const ventasPorProducto = {};
  datos.forEach(d => {
    const producto = d.Product_Name;
    if (!producto) return;
    ventasPorProducto[producto] = (ventasPorProducto[producto] || 0) + parseFloat(d.Sales || 0);
  });
  
  // Obtener top 10 productos
  const topProductos = Object.entries(ventasPorProducto)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10);
  
  return new Chart(ctx, {
    type: 'bar',
    data: {
      labels: topProductos.map(([producto]) => producto),
      datasets: [{
        label: 'Ventas',
        data: topProductos.map(([,ventas]) => ventas),
        backgroundColor: colorPalette,
        borderWidth: 1
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Top 10 Productos por Ventas',
          font: { size: 16 }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `Ventas: $${formatNumber(context.raw)}`;
            }
          }
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Ventas ($)'
          },
          ticks: {
            callback: function(value) {
              return '$' + value.toLocaleString('es-ES');
            }
          }
        }
      }
    }
  });
}

// Gráfico polar de distribución de descuentos
function crearGraficoPolar(id, datos) {
  const ctx = document.getElementById(id).getContext('2d');
  
  // Agrupar descuentos por rangos
  const rangosDescuento = {
    '0%': 0,
    '1-20%': 0,
    '21-40%': 0,
    '41-60%': 0,
    '61-80%': 0,
    '81-100%': 0
  };
  
  datos.forEach(d => {
    const descuento = parseFloat(d.Discount) * 100;
    if (descuento === 0) rangosDescuento['0%']++;
    else if (descuento <= 20) rangosDescuento['1-20%']++;
    else if (descuento <= 40) rangosDescuento['21-40%']++;
    else if (descuento <= 60) rangosDescuento['41-60%']++;
    else if (descuento <= 80) rangosDescuento['61-80%']++;
    else rangosDescuento['81-100%']++;
  });
  
  return new Chart(ctx, {
    type: 'polarArea',
    data: {
      labels: Object.keys(rangosDescuento),
      datasets: [{
        data: Object.values(rangosDescuento),
        backgroundColor: colorPalette
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Distribución de Descuentos',
          font: { size: 16 }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const value = context.raw;
              const total = Object.values(rangosDescuento).reduce((a, b) => a + b, 0);
              const percentage = ((value / total) * 100).toFixed(1);
              return `${context.label}: ${value} pedidos (${percentage}%)`;
            }
          }
        }
      }
    }
  });
}

// Gráfico de dispersión para correlación ventas-beneficio
function crearGraficoDispersion(id, datos) {
  const ctx = document.getElementById(id).getContext('2d');
  
  // Preparar datos para el gráfico de dispersión
  const puntos = datos.map(d => ({
    x: parseFloat(d.Sales || 0),
    y: parseFloat(d.Profit || 0)
  }));
  
  return new Chart(ctx, {
    type: 'scatter',
    data: {
      datasets: [{
        label: 'Ventas vs Beneficio',
        data: puntos,
        backgroundColor: colorPalette[0],
        pointRadius: 5,
        pointHoverRadius: 8
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Correlación entre Ventas y Beneficio',
          font: { size: 16 }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return [
                `Ventas: $${formatNumber(context.raw.x)}`,
                `Beneficio: $${formatNumber(context.raw.y)}`
              ];
            }
          }
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Ventas ($)'
          },
          ticks: {
            callback: function(value) {
              return '$' + value.toLocaleString('es-ES');
            }
          }
        },
        y: {
          title: {
            display: true,
            text: 'Beneficio ($)'
          },
          ticks: {
            callback: function(value) {
              return '$' + value.toLocaleString('es-ES');
            }
          }
        }
      }
    }
  });
}