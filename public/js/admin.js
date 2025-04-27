document.addEventListener('DOMContentLoaded', function() {

  if (localStorage.getItem('isLoggedIn') !== 'true') {
    window.location.href = '/login';
    return;
  }

  if (!document.getElementById('categoriesTable')) return;
  // Inicializar componentes
  initDatePickers();
  // Carregar dados iniciais
  loadCategories();
  loadServices();
  loadEmployees();
  loadAppointments();
  setupEventListeners();
  
  // Adicionar listener para tabs
  document.querySelectorAll('[data-bs-toggle="tab"]').forEach(tab => {
    tab.addEventListener('shown.bs.tab', function() {
      const target = this.getAttribute('data-bs-target');
      if (target === '#categories') loadCategories();
      if (target === '#services') loadServices();
      if (target === '#employees') loadEmployees();
      if (target === '#appointments') loadAppointments();
    });
  });
});


function logout() {
  localStorage.removeItem('isLoggedIn');
  window.location.href = '/login';
}


// Modifique todas as chamadas fetch para incluir a verificação
async function loadCategories() {
  if (!await checkAuth()) return;
  
  try {
    const response = await fetch('/api/admin/categories', {
      credentials: 'include'
    });
    // ... resto do código
  } catch (error) {
    console.error('Erro:', error);
  }
}

// Funções auxiliares
function formatDate(dateString) {
  try {
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('pt-BR', options);
  } catch (error) {
    console.error('Erro ao formatar data:', error);
    return dateString;
  }
}

function getStatusBadgeClass(status) {
  switch (status) {
    case 'confirmed': return 'bg-primary';
    case 'canceled': return 'bg-danger';
    case 'completed': return 'bg-success';
    default: return 'bg-secondary';
  }
}

function getStatusText(status) {
  switch (status) {
    case 'confirmed': return 'Confirmado';
    case 'canceled': return 'Cancelado';
    case 'completed': return 'Concluído';
    default: return status;
  }
}

function showToast(message, type = 'success') {
  try {
    const toastElement = document.getElementById('liveToast');
    if (!toastElement) return;

    const toastBody = toastElement.querySelector('.toast-body');
    if (toastBody) toastBody.textContent = message;
    
    toastElement.classList.remove('bg-success', 'bg-danger', 'bg-warning');
    toastElement.classList.add(
      type === 'success' ? 'bg-success' : 
      type === 'error' ? 'bg-danger' : 'bg-warning'
    );

    const toast = new bootstrap.Toast(toastElement);
    toast.show();
  } catch (error) {
    console.error('Erro ao exibir toast:', error);
  }
}

function initDatePickers() {
  try {
    const dateFilter = document.getElementById('appointmentDateFilter');
    if (dateFilter && window.flatpickr) {
      dateFilter.flatpickr({
        dateFormat: 'Y-m-d',
        allowInput: true,
        locale: 'pt'
      });
    }
  } catch (error) {
    console.error('Erro ao inicializar datepickers:', error);
  }
}

function showConfirmationModal(type, id) {
  try {
    const modalElement = document.getElementById('confirmationModal');
    if (!modalElement) throw new Error('Elemento do modal não encontrado');
    
    const modal = new bootstrap.Modal(modalElement);
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const confirmBtn = document.getElementById('confirmAction');
    
    if (!modalTitle || !modalBody || !confirmBtn) {
      throw new Error('Elementos do modal não encontrados');
    }

    let message = '';
    switch (type) {
      case 'category':
        message = 'Tem certeza que deseja excluir esta categoria? Todos os serviços associados serão removidos.';
        break;
      case 'service':
        message = 'Tem certeza que deseja excluir este serviço? Todos os agendamentos associados serão removidos.';
        break;
      case 'employee':
        message = 'Tem certeza que deseja excluir este funcionário? Todos os agendamentos e associações serão removidos.';
        break;
      case 'appointment':
        message = 'Tem certeza que deseja cancelar este agendamento?';
        break;
      default:
        message = 'Tem certeza que deseja executar esta ação?';
    }
    
    modalTitle.textContent = `Confirmar ${type === 'appointment' ? 'Cancelamento' : 'Exclusão'}`;
    modalBody.textContent = message;
    
    confirmBtn.onclick = async function() {
      try {
        let endpoint = '';
        let method = 'DELETE';
        
        switch (type) {
          case 'category': endpoint = `/api/admin/categories/${id}`; break;
          case 'service': endpoint = `/api/admin/services/${id}`; break;
          case 'employee': endpoint = `/api/admin/employees/${id}`; break;
          case 'appointment': 
            endpoint = `/api/admin/appointments/${id}/cancel`;
            method = 'PUT';
            break;
        }
        
        const response = await fetch(endpoint, { 
          method, 
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          } 
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Erro ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        
        switch (type) {
          case 'category': 
            await loadCategories();
            await loadServices();
            break;
          case 'service': 
            await loadServices();
            await loadAppointments();
            break;
          case 'employee': 
            await loadEmployees();
            await loadAppointments();
            break;
          case 'appointment': 
            await loadAppointments();
            break;
        }

        showToast(result.message || 'Operação realizada com sucesso!', 'success');
        modal.hide();
      } catch (error) {
        console.error('Erro na ação de confirmação:', error);
        showToast(`Erro: ${error.message}`, 'error');
        modal.hide();
      }
    };

    modal.show();
  } catch (error) {
    console.error('Erro ao mostrar modal de confirmação:', error);
    showToast(`Erro: ${error.message}`, 'error');
  }
}

// Carregar dados
async function loadCategories() {
  try {
    const response = await fetch('/api/admin/categories');
    if (!response.ok) throw new Error(`Erro HTTP! status: ${response.status}`);
    
    const data = await response.json();
    const tableBody = document.getElementById('categoriesTable');
    if (!tableBody) throw new Error('Tabela de categorias não encontrada');
    
    tableBody.innerHTML = '';
    
    data.forEach(category => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${category.id}</td>
        <td>${category.name}</td>
        <td>
          <button class="btn btn-sm btn-primary edit-category" data-id="${category.id}">Editar</button>
          <button class="btn btn-sm btn-danger delete-category" data-id="${category.id}">Excluir</button>
        </td>
      `;
      tableBody.appendChild(row);
    });

    const categorySelect = document.getElementById('serviceCategory');
    if (categorySelect) {
      categorySelect.innerHTML = '<option value="" selected disabled>Selecione uma categoria</option>';
      data.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        categorySelect.appendChild(option);
      });
    }
  } catch (error) {
    console.error('Erro ao carregar categorias:', error);
    showToast(`Erro ao carregar categorias: ${error.message}`, 'error');
  }
}

async function loadServices() {
  try {
    const response = await fetch('/api/admin/services');
    if (!response.ok) throw new Error(`Erro HTTP! status: ${response.status}`);
    
    const data = await response.json();
    const tableBody = document.getElementById('servicesTable');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    data.forEach(service => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${service.id}</td>
        <td>${service.name}</td>
        <td>${service.categories?.name || 'N/A'}</td>
        <td>${service.duration} min</td>
        <td>R$ ${service.price?.toFixed(2) || '0,00'}</td>
        <td>
          <button class="btn btn-sm btn-primary edit-service" data-id="${service.id}">Editar</button>
          <button class="btn btn-sm btn-danger delete-service" data-id="${service.id}">Excluir</button>
        </td>
      `;
      tableBody.appendChild(row);
    });
  } catch (error) {
    console.error('Erro ao carregar serviços:', error);
    showToast(`Erro ao carregar serviços: ${error.message}`, 'error');
  }
}

async function loadEmployees() {
  try {
    const response = await fetch('/api/admin/employees');
    if (!response.ok) throw new Error(`Erro HTTP! status: ${response.status}`);
    
    const data = await response.json();
    const tableBody = document.getElementById('employeesTable');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    data.forEach(employee => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${employee.id}</td>
        <td>${employee.name}</td>
        <td>${employee.email}</td>
        <td>${employee.phone || ''}</td>
        <td>
          <button class="btn btn-sm btn-primary edit-employee" data-id="${employee.id}">Editar</button>
          <button class="btn btn-sm btn-danger delete-employee" data-id="${employee.id}">Excluir</button>
        </td>
      `;
      tableBody.appendChild(row);
    });
  } catch (error) {
    console.error('Erro ao carregar funcionários:', error);
    showToast(`Erro ao carregar funcionários: ${error.message}`, 'error');
  }
}

async function loadAppointments() {
  try {
    const response = await fetch('/api/admin/appointments');
    if (!response.ok) throw new Error(`Erro HTTP! status: ${response.status}`);
    
    const data = await response.json();
    const tableBody = document.getElementById('appointmentsTable');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    data.forEach(appointment => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${appointment.id}</td>
        <td>${appointment.client_name}</td>
        <td>${appointment.services?.name || 'N/A'}</td>
        <td>${appointment.employees?.name || 'N/A'}</td>
        <td>${formatDate(appointment.appointment_date)}</td>
        <td>${appointment.start_time} - ${appointment.end_time}</td>
        <td>
          <span class="badge ${getStatusBadgeClass(appointment.status)}">
            ${getStatusText(appointment.status)}
          </span>
        </td>
        <td>
          <button class="btn btn-sm btn-danger cancel-appointment" 
                  data-id="${appointment.id}"
                  ${appointment.status !== 'confirmed' ? 'disabled' : ''}>
            Cancelar
          </button>
        </td>
      `;
      tableBody.appendChild(row);
    });
  } catch (error) {
    console.error('Erro ao carregar agendamentos:', error);
    showToast(`Erro ao carregar agendamentos: ${error.message}`, 'error');
  }
}

// Configurar listeners de eventos
function setupEventListeners() {
  // Formulário de Categorias
  const categoryForm = document.getElementById('categoryForm');
  if (categoryForm) {
    categoryForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      try {
        await handleCategorySubmit(e);
      } catch (error) {
        console.error('Erro no submit da categoria:', error);
        showToast(`Erro: ${error.message}`, 'error');
      }
    });
    
    const cancelCategoryBtn = document.getElementById('cancelCategoryEdit');
    if (cancelCategoryBtn) cancelCategoryBtn.addEventListener('click', cancelCategoryEdit);
  }

  // Formulário de Serviços
  const serviceForm = document.getElementById('serviceForm');
  if (serviceForm) {
    serviceForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      try {
        await handleServiceSubmit(e);
      } catch (error) {
        console.error('Erro no submit do serviço:', error);
        showToast(`Erro: ${error.message}`, 'error');
      }
    });
    
    const cancelServiceBtn = document.getElementById('cancelServiceEdit');
    if (cancelServiceBtn) cancelServiceBtn.addEventListener('click', cancelServiceEdit);
  }

  // Formulário de Funcionários
  const employeeForm = document.getElementById('employeeForm');
  if (employeeForm) {
    employeeForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      try {
        await handleEmployeeSubmit(e);
      } catch (error) {
        console.error('Erro no submit do funcionário:', error);
        showToast(`Erro: ${error.message}`, 'error');
      }
    });
    
    const cancelEmployeeBtn = document.getElementById('cancelEmployeeEdit');
    if (cancelEmployeeBtn) cancelEmployeeBtn.addEventListener('click', cancelEmployeeEdit);
  }

  // Pesquisa e Filtros
  const searchBtn = document.getElementById('searchAppointments');
  if (searchBtn) {
    searchBtn.addEventListener('click', async function() {
      try {
        await searchAppointments();
      } catch (error) {
        console.error('Erro na pesquisa:', error);
        showToast(`Erro: ${error.message}`, 'error');
      }
    });
  }
  
  const filterBtn = document.getElementById('filterByDate');
  if (filterBtn) {
    filterBtn.addEventListener('click', async function() {
      try {
        await filterAppointmentsByDate();
      } catch (error) {
        console.error('Erro no filtro:', error);
        showToast(`Erro: ${error.message}`, 'error');
      }
    });
  }

  // Delegation para botões dinâmicos
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('edit-category')) {
      editCategory(e.target.dataset.id).catch(error => {
        console.error('Erro ao editar categoria:', error);
        showToast(`Erro: ${error.message}`, 'error');
      });
    }
    if (e.target.classList.contains('edit-service')) {
      editService(e.target.dataset.id).catch(error => {
        console.error('Erro ao editar serviço:', error);
        showToast(`Erro: ${error.message}`, 'error');
      });
    }
    if (e.target.classList.contains('edit-employee')) {
      editEmployee(e.target.dataset.id).catch(error => {
        console.error('Erro ao editar funcionário:', error);
        showToast(`Erro: ${error.message}`, 'error');
      });
    }
    if (e.target.classList.contains('delete-category') || 
        e.target.classList.contains('delete-service') || 
        e.target.classList.contains('delete-employee') || 
        e.target.classList.contains('cancel-appointment')) {
      const type = e.target.classList.contains('delete-category') ? 'category' :
                  e.target.classList.contains('delete-service') ? 'service' :
                  e.target.classList.contains('delete-employee') ? 'employee' : 'appointment';
      showConfirmationModal(type, e.target.dataset.id);
    }
  });
}



// Funções de pesquisa
async function searchAppointments() {
  try {
    const searchTerm = document.getElementById('appointmentSearch')?.value.trim() || '';
    const response = await fetch(`/api/admin/appointments?search=${encodeURIComponent(searchTerm)}`);
    if (!response.ok) throw new Error(`Erro HTTP! status: ${response.status}`);
    
    const data = await response.json();
    const tableBody = document.getElementById('appointmentsTable');
    if (!tableBody) throw new Error('Tabela de agendamentos não encontrada');
    
    tableBody.innerHTML = '';
    
    data.forEach(appointment => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${appointment.id}</td>
        <td>${appointment.client_name}</td>
        <td>${appointment.services?.name || 'N/A'}</td>
        <td>${appointment.employees?.name || 'N/A'}</td>
        <td>${formatDate(appointment.appointment_date)}</td>
        <td>${appointment.start_time} - ${appointment.end_time}</td>
        <td>
          <span class="badge ${getStatusBadgeClass(appointment.status)}">
            ${getStatusText(appointment.status)}
          </span>
        </td>
        <td>
          <button class="btn btn-sm btn-danger cancel-appointment" 
                  data-id="${appointment.id}"
                  ${appointment.status !== 'confirmed' ? 'disabled' : ''}>
            Cancelar
          </button>
        </td>
      `;
      tableBody.appendChild(row);
    });
  } catch (error) {
    console.error('Erro na pesquisa de agendamentos:', error);
    throw error;
  }
}

async function filterAppointmentsByDate() {
  try {
    const date = document.getElementById('appointmentDateFilter')?.value;
    if (!date) return;
    
    const response = await fetch(`/api/admin/appointments?date=${date}`);
    if (!response.ok) throw new Error(`Erro HTTP! status: ${response.status}`);
    
    const data = await response.json();
    const tableBody = document.getElementById('appointmentsTable');
    if (!tableBody) throw new Error('Tabela de agendamentos não encontrada');
    
    tableBody.innerHTML = '';
    
    data.forEach(appointment => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${appointment.id}</td>
        <td>${appointment.client_name}</td>
        <td>${appointment.services?.name || 'N/A'}</td>
        <td>${appointment.employees?.name || 'N/A'}</td>
        <td>${formatDate(appointment.appointment_date)}</td>
        <td>${appointment.start_time} - ${appointment.end_time}</td>
        <td>
          <span class="badge ${getStatusBadgeClass(appointment.status)}">
            ${getStatusText(appointment.status)}
          </span>
        </td>
        <td>
          <button class="btn btn-sm btn-danger cancel-appointment" 
                  data-id="${appointment.id}"
                  ${appointment.status !== 'confirmed' ? 'disabled' : ''}>
            Cancelar
          </button>
        </td>
      `;
      tableBody.appendChild(row);
    });
  } catch (error) {
    console.error('Erro ao filtrar agendamentos:', error);
    throw error;
  }
}

// Funções para manipulação de categorias
async function handleCategorySubmit(e) {
  try {
    e.preventDefault();
    
    const name = document.getElementById('categoryName')?.value.trim();
    if (!name) throw new Error('O nome da categoria é obrigatório');
    
    const categoryId = document.getElementById('categoryId')?.value;
    const method = categoryId ? 'PUT' : 'POST';
    const endpoint = categoryId ? `/api/admin/categories/${categoryId}` : '/api/admin/categories';
    
    const response = await fetch(endpoint, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ name })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Erro ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    document.getElementById('categoryForm').reset();
    document.getElementById('categoryId').value = '';
    
    await loadCategories();
    showToast(result.message || 'Categoria salva com sucesso!', 'success');
  } catch (error) {
    console.error('Erro no submit da categoria:', error);
    throw error;
  }
}

async function editCategory(id) {
  try {
    if (!id) throw new Error('ID da categoria não fornecido');
    
    const response = await fetch(`/api/admin/categories/${id}`);
    if (!response.ok) throw new Error(`Erro HTTP! status: ${response.status}`);
    
    const category = await response.json();
    
    const idField = document.getElementById('categoryId');
    const nameField = document.getElementById('categoryName');
    if (!idField || !nameField) throw new Error('Elementos do formulário não encontrados');
    
    idField.value = category.id;
    nameField.value = category.name;
    
    const form = document.getElementById('categoryForm');
    if (form) form.scrollIntoView({ behavior: 'smooth' });
  } catch (error) {
    console.error('Erro ao editar categoria:', error);
    throw error;
  }
}

function cancelCategoryEdit() {
  document.getElementById('categoryForm').reset();
  document.getElementById('categoryId').value = '';
}

// Funções para manipulação de serviços
async function handleServiceSubmit(e) {
  try {
    e.preventDefault();
    
    const categoryId = document.getElementById('serviceCategory')?.value;
    const name = document.getElementById('serviceName')?.value.trim();
    const description = document.getElementById('serviceDescription')?.value.trim();
    const duration = parseInt(document.getElementById('serviceDuration')?.value);
    const price = parseFloat(document.getElementById('servicePrice')?.value) || null;
    
    if (!categoryId) throw new Error('Selecione uma categoria');
    if (!name) throw new Error('O nome do serviço é obrigatório');
    if (!duration || duration <= 0) throw new Error('A duração deve ser um número positivo');
    
    const serviceId = document.getElementById('serviceId')?.value;
    const method = serviceId ? 'PUT' : 'POST';
    const endpoint = serviceId ? `/api/admin/services/${serviceId}` : '/api/admin/services';
    
    const response = await fetch(endpoint, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        category_id: categoryId,
        name,
        description,
        duration,
        price
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Erro ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    document.getElementById('serviceForm').reset();
    document.getElementById('serviceId').value = '';
    
    await loadServices();
    showToast(result.message || 'Serviço salvo com sucesso!', 'success');
  } catch (error) {
    console.error('Erro no submit do serviço:', error);
    throw error;
  }
}

async function editService(id) {
  try {
    if (!id) throw new Error('ID do serviço não fornecido');
    
    const response = await fetch(`/api/admin/services/${id}`, {
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Serviço não encontrado no servidor');
      }
      throw new Error(`Erro HTTP! status: ${response.status}`);
    }
    
    const service = await response.json();
    
    const idField = document.getElementById('serviceId');
    const categoryField = document.getElementById('serviceCategory');
    const nameField = document.getElementById('serviceName');
    const descField = document.getElementById('serviceDescription');
    const durationField = document.getElementById('serviceDuration');
    const priceField = document.getElementById('servicePrice');
    
    if (!idField || !categoryField || !nameField || !descField || !durationField || !priceField) {
      throw new Error('Elementos do formulário não encontrados');
    }
    
    idField.value = service.id;
    categoryField.value = service.category_id;
    nameField.value = service.name;
    descField.value = service.description || '';
    durationField.value = service.duration;
    priceField.value = service.price || '';
    
    const form = document.getElementById('serviceForm');
    if (form) form.scrollIntoView({ behavior: 'smooth' });
  } catch (error) {
    console.error('Erro ao editar serviço:', error);
    showToast(`Falha ao carregar serviço: ${error.message}`, 'error');
    throw error;
  }
}

function cancelServiceEdit() {
  document.getElementById('serviceForm').reset();
  document.getElementById('serviceId').value = '';
}

// Funções para manipulação de funcionários
async function handleEmployeeSubmit(e) {
  try {
    e.preventDefault();
    
    const name = document.getElementById('employeeName')?.value.trim();
    const email = document.getElementById('employeeEmail')?.value.trim();
    const phone = document.getElementById('employeePhone')?.value.trim() || null;
    
    if (!name) throw new Error('O nome do funcionário é obrigatório');
    if (!email || !email.includes('@')) throw new Error('Informe um e-mail válido');
    
    const employeeId = document.getElementById('employeeId')?.value;
    const method = employeeId ? 'PUT' : 'POST';
    const endpoint = employeeId ? `/api/admin/employees/${employeeId}` : '/api/admin/employees';
    
    const response = await fetch(endpoint, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        name,
        email,
        phone
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Erro ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    document.getElementById('employeeForm').reset();
    document.getElementById('employeeId').value = '';
    
    await loadEmployees();
    showToast(result.message || 'Funcionário salvo com sucesso!', 'success');
  } catch (error) {
    console.error('Erro no submit do funcionário:', error);
    throw error;
  }
}

async function editEmployee(id) {
  try {
    if (!id) throw new Error('ID do funcionário não fornecido');
    
    const response = await fetch(`/api/admin/employees/${id}`);
    if (!response.ok) throw new Error(`Erro HTTP! status: ${response.status}`);
    
    const employee = await response.json();
    
    const idField = document.getElementById('employeeId');
    const nameField = document.getElementById('employeeName');
    const emailField = document.getElementById('employeeEmail');
    const phoneField = document.getElementById('employeePhone');
    
    if (!idField || !nameField || !emailField || !phoneField) {
      throw new Error('Elementos do formulário não encontrados');
    }
    
    idField.value = employee.id;
    nameField.value = employee.name;
    emailField.value = employee.email;
    phoneField.value = employee.phone || '';
    
    const form = document.getElementById('employeeForm');
    if (form) form.scrollIntoView({ behavior: 'smooth' });
  } catch (error) {
    console.error('Erro ao editar funcionário:', error);
    throw error;
  }
}

function cancelEmployeeEdit() {
  document.getElementById('employeeForm').reset();
  document.getElementById('employeeId').value = '';
}


// Theme Toggle Functionality
// Theme and User Profile Functions
document.addEventListener('DOMContentLoaded', function() {
  // Theme initialization
  const savedTheme = localStorage.getItem('theme') || 'light';
  setTheme(savedTheme);

  // Load user data when settings tab is shown
  document.querySelector('a[data-bs-target="#settings"]').addEventListener('shown.bs.tab', function() {
    loadUserData();
  });

  // Theme toggle button
  const themeToggleBtn = document.getElementById('themeToggle');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', toggleTheme);
  }

  // User profile form submission
  const userProfileForm = document.getElementById('userProfileForm');
  if (userProfileForm) {
    userProfileForm.addEventListener('submit', function(e) {
      e.preventDefault();
      updateUserProfile();
    });
  }
});

// Theme functions
function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  
  const themeToggleBtn = document.getElementById('themeToggle');
  if (themeToggleBtn) {
    themeToggleBtn.innerHTML = theme === 'dark' 
      ? '<i class="bi bi-sun-fill"></i> Alternar para Modo Claro' 
      : '<i class="bi bi-moon-fill"></i> Alternar para Modo Escuro';
  }
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  setTheme(newTheme);
}

// Theme functions (unchanged)
document.addEventListener('DOMContentLoaded', function() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  setTheme(savedTheme);

  document.querySelector('a[data-bs-target="#settings"]').addEventListener('shown.bs.tab', loadUserData);
  document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);
  document.getElementById('userProfileForm')?.addEventListener('submit', handleProfileUpdate);
});

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  
  const themeToggleBtn = document.getElementById('themeToggle');
  if (themeToggleBtn) {
    themeToggleBtn.innerHTML = theme === 'dark' 
      ? '<i class="bi bi-sun-fill"></i> Alternar para Modo Claro' 
      : '<i class="bi bi-moon-fill"></i> Alternar para Modo Escuro';
  }
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  setTheme(currentTheme === 'dark' ? 'light' : 'dark');
}

 // Função para carregar dados do usuário atual
// Função para obter usuário do LocalStorage
function getCurrentUser() {
  const userData = localStorage.getItem('currentUser');
  if (!userData) {
    throw new Error('Nenhum usuário logado encontrado');
  }
  return JSON.parse(userData);
}

// Função para carregar e exibir dados do usuário
async function loadAndDisplayUserData() {
  const userInfoElement = document.getElementById('userInfo');
  
  try {
    // Mostrar loading
    if (userInfoElement) {
      userInfoElement.innerHTML = `
        <div class="text-center">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Carregando...</span>
          </div>
          <p>Carregando dados do usuário...</p>
        </div>
      `;
    }

    // Obter usuário do LocalStorage
    const currentUser = getCurrentUser();
    
    // Preencher formulário
    document.getElementById('userId').value = currentUser.id;
    document.getElementById('userUsername').value = currentUser.username;
    document.getElementById('userPassword').value = currentUser.password;
    document.getElementById('userEmail').value = currentUser.email || '';
    
    // Mostrar informações
    if (userInfoElement) {
      userInfoElement.innerHTML = `
        <div class="user-profile-summary">
          <h5 class="mb-3">Informações do Perfil</h5>
          <div class="row">
            <div class="col-md-6">
              <p><strong>ID:</strong> ${currentUser.id}</p>
              <p><strong>Nome de usuário:</strong> ${currentUser.username}</p>
            </div>
            <div class="col-md-6">
              <p><strong>E-mail:</strong> ${currentUser.email || 'Não informado'}</p>
              <p><strong>Senha:</strong> ${currentUser.password}</p>
            </div>
          </div>
        </div>
      `;
    }
  } catch (error) {
    console.error('Erro ao carregar dados do usuário:', error);
    
    if (userInfoElement) {
      userInfoElement.innerHTML = `
        <div class="alert alert-danger">
          <i class="bi bi-exclamation-triangle-fill"></i> Erro ao carregar perfil: ${error.message}
        </div>
      `;
    }
  }
}

// Função para atualizar usuário
async function updateUserProfile(e) {
  e.preventDefault();
  
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalBtnText = submitBtn.innerHTML;
  
  try {
    // Mostrar loading
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
      Salvando...
    `;

    const userId = document.getElementById('userId').value;
    const username = document.getElementById('userUsername').value.trim();
    const email = document.getElementById('userEmail').value.trim();
    const password = document.getElementById('userPassword').value;
    const confirmPassword = document.getElementById('userConfirmPassword').value;

    if (password && password !== confirmPassword) {
      throw new Error('As senhas não coincidem');
    }

    const updateData = { username, email };
    if (password) updateData.password_plaintext = password;

    const response = await fetch(`/api/admin/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erro ao atualizar usuário');
    }

    const updatedUser = await response.json();
    console.log('Usuário atualizado:', updatedUser);
    
    // Atualiza os dados no LocalStorage
    localStorage.setItem('currentUser', JSON.stringify({
      id: updatedUser.id,
      username: updatedUser.username,
      password: updatedUser.password,
      email: updatedUser.email
    }));
    
    // Recarregar e exibir dados atualizados
    await loadAndDisplayUserData();
    
    // Limpar campos de senha
    document.getElementById('userPassword').value = '';
    document.getElementById('userConfirmPassword').value = '';

    // Mostrar feedback
    showToast('Perfil atualizado com sucesso!', 'success');
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    showToast(`Erro: ${error.message}`, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnText;
  }
}

// Adicionar event listeners
document.addEventListener('DOMContentLoaded', function() {
  // Carregar usuário quando a aba for aberta
  document.querySelector('a[data-bs-target="#settings"]')?.addEventListener('shown.bs.tab', loadAndDisplayUserData);
  
  // Formulário de atualização
  document.getElementById('userProfileForm')?.addEventListener('submit', updateUserProfile);
});

// Helper function to show toast notifications
function showToast(type, message) {
  console.log(`${type.toUpperCase()}: ${message}`);
  // In a real app, you would implement a proper toast notification system
  // Example: bootstrap.Toast or similar
}