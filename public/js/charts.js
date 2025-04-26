// Variáveis globais para os gráficos
let charts = {
    employees: null,
    categories: null,
    services: null,
    appointments: null
  };
  
  // Configurações dos gráficos
  const chartConfigs = {
    employees: {
      type: 'doughnut',
      data: {
        labels: ['Funcionários'],
        datasets: [{
          backgroundColor: ['#36a2eb', '#ff6384', '#4bc0c0', '#ff9f40'],
          borderColor: '#fff',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
          title: { display: true, text: 'Total de Funcionários', padding: 10 },
          tooltip: { callbacks: { label: ctx => `${ctx.label}: ${ctx.raw}` } }
        },
        cutout: '70%'
      }
    },
    categories: {
      type: 'pie',
      data: {
        labels: ['Categorias'],
        datasets: [{
          backgroundColor: ['#ff6384', '#36a2eb', '#4bc0c0', '#ff9f40'],
          borderColor: '#fff',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
          title: { display: true, text: 'Total de Categorias', padding: 10 },
          tooltip: { callbacks: { label: ctx => `${ctx.label}: ${ctx.raw}` } }
        }
      }
    },
    services: {
      type: 'bar',
      data: {
        labels: ['Serviços'],
        datasets: [{
          backgroundColor: ['#4bc0c0', '#36a2eb', '#ff6384', '#ff9f40'],
          borderColor: '#fff',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: { display: true, text: 'Total de Serviços', padding: 10 },
          tooltip: { callbacks: { label: ctx => `${ctx.label}: ${ctx.raw}` } }
        },
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 } }
        }
      }
    },
    appointments: {
      type: 'bar',
      data: {
        labels: [
          'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
          'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
          datasets: [{
          label: 'Agendamentos Confirmados',
          backgroundColor: 'rgba(255, 159, 64, 0.2)',
          borderColor: '#ff9f40',
          borderWidth: 1,
        //   fill: true,
        //   tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
          title: { display: true, text: 'Agendamentos por Mês', padding: 10 },
          tooltip: {
            callbacks: {
              label: ctx => `${ctx.label}: ${ctx.raw}`
            }
          }
        },
        scales: {
            y: {
            beginAtZero: true,
            ticks: { precision: 0 }
            }
        }
    }
}
};
  
  // Na função DOMContentLoaded
  document.addEventListener('DOMContentLoaded', function() {
    // ... código existente ...
    
    // Adicionar listener para a tab Home
    const homeTab = document.querySelector('[data-bs-target="#home"]');
    if (homeTab) {
      homeTab.addEventListener('shown.bs.tab', async function() {
        try {
          await loadDashboardData();
          // Atualizar dados a cada 30 segundos quando na tab Home
          const dashboardRefreshInterval = setInterval(async () => {
            if (!document.querySelector('#home.tab-pane.active')) {
              clearInterval(dashboardRefreshInterval);
              return;
            }
            await loadDashboardData();
          }, 30000);
        } catch (error) {
          console.error('Erro ao inicializar dashboard:', error);
        }
      });
    }
  });
  
  // Carregar dados do dashboard
  async function loadDashboardData() {
    try {
      showLoading(true);
      
      const response = await fetch('/api/admin/dashboard');
      if (!response.ok) throw new Error(`Erro HTTP! status: ${response.status}`);
      
      const data = await response.json();
      renderCharts(data);
      updateStatsCards(data);
      
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
      showToast(`Erro ao carregar dashboard: ${error.message}`, 'error');
    } finally {
      showLoading(false);
    }
  }
  
  // Renderizar gráficos
  function renderCharts(data) {
    // Atualizar ou criar cada gráfico
    Object.keys(chartConfigs).forEach(chartKey => {
      const ctx = document.getElementById(`${chartKey}Chart`)?.getContext('2d');
      if (!ctx) return;
      
      // Clonar a configuração base para evitar mutações
      const config = JSON.parse(JSON.stringify(chartConfigs[chartKey]));
      
      // Atualizar dados
      config.data.datasets[0].data = [data[`total${chartKey.charAt(0).toUpperCase() + chartKey.slice(1)}`]];

      if (chartKey === 'appointments') {
        config.data.datasets[0].data = data.monthlyAppointments || [];
      } else {
        config.data.datasets[0].data = [data[`total${chartKey.charAt(0).toUpperCase() + chartKey.slice(1)}`]];
      }
      
      // Destruir gráfico existente se houver
      if (charts[chartKey]) charts[chartKey].destroy();
      
      // Criar novo gráfico
      charts[chartKey] = new Chart(ctx, config);
    });
  }
  
  // Atualizar cards de estatísticas (opcional)
  function updateStatsCards(data) {
    const stats = {
      employees: data.totalEmployees,
      categories: data.totalCategories,
      services: data.totalServices,
      appointments: data.totalAppointments
    };
    
    Object.keys(stats).forEach(key => {
      const element = document.getElementById(`${key}Stat`);
      if (element) {
        element.textContent = stats[key];
        // Animação de contagem
        animateValue(element, 0, stats[key], 1000);
      }
    });
  }
  
  // Função auxiliar para animação de contagem
  function animateValue(element, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      element.textContent = Math.floor(progress * (end - start) + start);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }
  
  // Mostrar/ocultar loading
  function showLoading(show) {
    const loaders = document.querySelectorAll('.chart-loading');
    loaders.forEach(loader => {
      loader.style.display = show ? 'flex' : 'none';
    });
  }