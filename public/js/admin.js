document.addEventListener('DOMContentLoaded', function() {
  loadCategories();
  loadServices();
  loadEmployees();
  loadAppointments();
  setupEventListeners();
});

// Funções auxiliares
function formatDate(dateString) {
  const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
  return new Date(dateString).toLocaleDateString('pt-BR', options);
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

function showConfirmationModal(type, id) {
  const modal = new bootstrap.Modal(document.getElementById('confirmationModal'));
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');
  
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
  
  document.getElementById('confirmAction').onclick = async function() {
    try {
      let endpoint = '';
      let method = 'DELETE';
      
      switch (type) {
        case 'category': 
          endpoint = `/api/admin/categories/${id}`;
          break;
        case 'service': 
          endpoint = `/api/admin/services/${id}`;
          break;
        case 'employee': 
          endpoint = `/api/admin/employees/${id}`;
          break;
        case 'appointment': 
          endpoint = `/api/admin/appointments/${id}/cancel`;
          method = 'PUT';
          break;
      }
      
      const response = await fetch(endpoint, {
        method: method,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao executar ação');
      }

      // Recarregar os dados
      switch (type) {
        case 'category': 
          loadCategories();
          loadServices(); // Recarrega serviços pois podem ter sido afetados
          break;
        case 'service': 
          loadServices();
          loadAppointments(); // Recarrega agendamentos pois podem ter sido afetados
          break;
        case 'employee': 
          loadEmployees();
          loadAppointments(); // Recarrega agendamentos pois podem ter sido afetados
          break;
        case 'appointment': 
          loadAppointments();
          break;
      }

      modal.hide();
    } catch (error) {
      console.error('Erro:', error);
      alert(error.message || 'Ocorreu um erro ao executar a ação');
    }
  };
  
  modal.show();
}

// Carregar categorias
async function loadCategories() {
  try {
    const response = await fetch('/api/admin/categories');
    if (!response.ok) throw new Error('Erro ao carregar categorias');
    
    const data = await response.json();
    const tableBody = document.getElementById('categoriesTable');
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

    // Atualizar select de categorias no formulário de serviços
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
    console.error('Erro:', error);
    alert('Não foi possível carregar as categorias');
  }
}

// Carregar serviços
async function loadServices() {
  try {
    const response = await fetch('/api/admin/services');
    if (!response.ok) throw new Error('Erro ao carregar serviços');
    
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
    console.error('Erro:', error);
    alert('Não foi possível carregar os serviços');
  }
}

// Carregar funcionários
async function loadEmployees() {
  try {
    const response = await fetch('/api/admin/employees');
    if (!response.ok) throw new Error('Erro ao carregar funcionários');
    
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
    console.error('Erro:', error);
    alert('Não foi possível carregar os funcionários');
  }
}

// Carregar agendamentos
async function loadAppointments() {
  try {
    const response = await fetch('/api/admin/appointments');
    if (!response.ok) throw new Error('Erro ao carregar agendamentos');
    
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
          <button class="btn btn-sm btn-danger delete-appointment" data-id="${appointment.id}">Cancelar</button>
        </td>
      `;
      tableBody.appendChild(row);
    });
  } catch (error) {
    console.error('Erro:', error);
    alert('Não foi possível carregar os agendamentos');
  }
}

// Configurar listeners de eventos
function setupEventListeners() {
  // Formulário de Categorias
  const categoryForm = document.getElementById('categoryForm');
  if (categoryForm) {
    categoryForm.addEventListener('submit', handleCategorySubmit);
    document.getElementById('cancelCategoryEdit')?.addEventListener('click', cancelCategoryEdit);
  }
  
  // Formulário de Serviços
  const serviceForm = document.getElementById('serviceForm');
  if (serviceForm) {
    serviceForm.addEventListener('submit', handleServiceSubmit);
    document.getElementById('cancelServiceEdit')?.addEventListener('click', cancelServiceEdit);
  }
  
  // Formulário de Funcionários
  const employeeForm = document.getElementById('employeeForm');
  if (employeeForm) {
    employeeForm.addEventListener('submit', handleEmployeeSubmit);
    document.getElementById('cancelEmployeeEdit')?.addEventListener('click', cancelEmployeeEdit);
  }
  
  // Pesquisa de Agendamentos
  document.getElementById('searchAppointments')?.addEventListener('click', searchAppointments);
  document.getElementById('filterByDate')?.addEventListener('click', filterAppointmentsByDate);
  
  // Listeners para botões de editar/excluir
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('delete-category')) {
      showConfirmationModal('category', e.target.getAttribute('data-id'));
    }
    if (e.target.classList.contains('delete-service')) {
      showConfirmationModal('service', e.target.getAttribute('data-id'));
    }
    if (e.target.classList.contains('delete-employee')) {
      showConfirmationModal('employee', e.target.getAttribute('data-id'));
    }
    if (e.target.classList.contains('delete-appointment')) {
      showConfirmationModal('appointment', e.target.getAttribute('data-id'));
    }
    if (e.target.classList.contains('edit-category')) {
      editCategory(e.target.getAttribute('data-id'));
    }
    if (e.target.classList.contains('edit-service')) {
      editService(e.target.getAttribute('data-id'));
    }
    if (e.target.classList.contains('edit-employee')) {
      editEmployee(e.target.getAttribute('data-id'));
    }
  });
}

// Pesquisar agendamentos
async function searchAppointments() {
  const searchTerm = document.getElementById('appointmentSearch').value.trim();
  
  try {
    const response = await fetch(`/api/admin/appointments?search=${encodeURIComponent(searchTerm)}`);
    if (!response.ok) throw new Error('Erro ao buscar agendamentos');
    
    const data = await response.json();
    const tableBody = document.getElementById('appointmentsTable');
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
          <button class="btn btn-sm btn-danger delete-appointment" data-id="${appointment.id}">Cancelar</button>
        </td>
      `;
      tableBody.appendChild(row);
    });
  } catch (error) {
    console.error('Erro:', error);
    alert('Não foi possível buscar os agendamentos');
  }
}

// Filtrar agendamentos por data
async function filterAppointmentsByDate() {
  const date = document.getElementById('appointmentDateFilter').value;
  
  try {
    const response = await fetch(`/api/admin/appointments?date=${date}`);
    if (!response.ok) throw new Error('Erro ao filtrar agendamentos');
    
    const data = await response.json();
    const tableBody = document.getElementById('appointmentsTable');
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
          <button class="btn btn-sm btn-danger delete-appointment" data-id="${appointment.id}">Cancelar</button>
        </td>
      `;
      tableBody.appendChild(row);
    });
  } catch (error) {
    console.error('Erro:', error);
    alert('Não foi possível filtrar os agendamentos');
  }
}

// Funções para manipulação de categorias
async function handleCategorySubmit(e) {
  e.preventDefault();
  
  const formData = {
    name: document.getElementById('categoryName').value.trim()
  };
  
  if (!formData.name) {
    alert('O nome da categoria é obrigatório');
    return;
  }
  
  const categoryId = document.getElementById('categoryId').value;
  const method = categoryId ? 'PUT' : 'POST';
  const endpoint = categoryId ? `/api/admin/categories/${categoryId}` : '/api/admin/categories';
  
  try {
    const response = await fetch(endpoint, {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erro ao salvar categoria');
    }
    
    const data = await response.json();
    document.getElementById('categoryForm').reset();
    document.getElementById('categoryId').value = '';
    loadCategories();
    alert('Categoria salva com sucesso!');
  } catch (error) {
    console.error('Erro:', error);
    alert(error.message || 'Não foi possível salvar a categoria');
  }
}

function editCategory(id) {
  fetch(`/api/admin/categories/${id}`)
    .then(response => {
      if (!response.ok) throw new Error('Erro ao carregar categoria');
      return response.json();
    })
    .then(category => {
      document.getElementById('categoryId').value = category.id;
      document.getElementById('categoryName').value = category.name;
      document.getElementById('categoryForm').scrollIntoView({ behavior: 'smooth' });
    })
    .catch(error => {
      console.error('Erro:', error);
      alert('Não foi possível carregar a categoria para edição');
    });
}

function cancelCategoryEdit() {
  document.getElementById('categoryForm').reset();
  document.getElementById('categoryId').value = '';
}

// Funções para manipulação de serviços
async function handleServiceSubmit(e) {
  e.preventDefault();
  
  const formData = {
    category_id: document.getElementById('serviceCategory').value,
    name: document.getElementById('serviceName').value.trim(),
    description: document.getElementById('serviceDescription').value.trim(),
    duration: parseInt(document.getElementById('serviceDuration').value),
    price: parseFloat(document.getElementById('servicePrice').value) || null
  };
  
  // Validações
  if (!formData.category_id) {
    alert('Selecione uma categoria');
    return;
  }
  if (!formData.name) {
    alert('O nome do serviço é obrigatório');
    return;
  }
  if (!formData.duration || formData.duration <= 0) {
    alert('A duração deve ser um número positivo');
    return;
  }
  
  const serviceId = document.getElementById('serviceId').value;
  const method = serviceId ? 'PUT' : 'POST';
  const endpoint = serviceId ? `/api/admin/services/${serviceId}` : '/api/admin/services';
  
  try {
    const response = await fetch(endpoint, {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erro ao salvar serviço');
    }
    
    const data = await response.json();
    document.getElementById('serviceForm').reset();
    document.getElementById('serviceId').value = '';
    loadServices();
    alert('Serviço salvo com sucesso!');
  } catch (error) {
    console.error('Erro:', error);
    alert(error.message || 'Não foi possível salvar o serviço');
  }
}

async function editService(id) {
  try {
    const response = await fetch(`/api/admin/services/${id}`);
    if (!response.ok) throw new Error('Erro ao carregar serviço');
    
    const service = await response.json();
    
    document.getElementById('serviceId').value = service.id;
    document.getElementById('serviceCategory').value = service.category_id;
    document.getElementById('serviceName').value = service.name;
    document.getElementById('serviceDescription').value = service.description || '';
    document.getElementById('serviceDuration').value = service.duration;
    document.getElementById('servicePrice').value = service.price || '';
    
    document.getElementById('serviceForm').scrollIntoView({ behavior: 'smooth' });
  } catch (error) {
    console.error('Erro:', error);
    alert('Não foi possível carregar o serviço para edição');
  }
}

function cancelServiceEdit() {
  document.getElementById('serviceForm').reset();
  document.getElementById('serviceId').value = '';
}

// Funções para manipulação de funcionários
async function handleEmployeeSubmit(e) {
  e.preventDefault();
  
  const formData = {
    name: document.getElementById('employeeName').value.trim(),
    email: document.getElementById('employeeEmail').value.trim(),
    phone: document.getElementById('employeePhone').value.trim() || null
  };
  
  // Validações
  if (!formData.name) {
    alert('O nome do funcionário é obrigatório');
    return;
  }
  if (!formData.email || !formData.email.includes('@')) {
    alert('Informe um e-mail válido');
    return;
  }
  
  const employeeId = document.getElementById('employeeId').value;
  const method = employeeId ? 'PUT' : 'POST';
  const endpoint = employeeId ? `/api/admin/employees/${employeeId}` : '/api/admin/employees';
  
  try {
    const response = await fetch(endpoint, {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erro ao salvar funcionário');
    }
    
    const data = await response.json();
    document.getElementById('employeeForm').reset();
    document.getElementById('employeeId').value = '';
    loadEmployees();
    alert('Funcionário salvo com sucesso!');
  } catch (error) {
    console.error('Erro:', error);
    alert(error.message || 'Não foi possível salvar o funcionário');
  }
}

async function editEmployee(id) {
  try {
    const response = await fetch(`/api/admin/employees/${id}`);
    if (!response.ok) throw new Error('Erro ao carregar funcionário');
    
    const employee = await response.json();
    
    document.getElementById('employeeId').value = employee.id;
    document.getElementById('employeeName').value = employee.name;
    document.getElementById('employeeEmail').value = employee.email;
    document.getElementById('employeePhone').value = employee.phone || '';
    
    document.getElementById('employeeForm').scrollIntoView({ behavior: 'smooth' });
  } catch (error) {
    console.error('Erro:', error);
    alert('Não foi possível carregar o funcionário para edição');
  }
}

function cancelEmployeeEdit() {
  document.getElementById('employeeForm').reset();
  document.getElementById('employeeId').value = '';
}