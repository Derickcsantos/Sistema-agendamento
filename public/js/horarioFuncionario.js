// Variáveis globais
let currentEmployeeId = null;
let employeeToDelete = null;

// Inicialização quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
  loadEmployees();
  setupEventListeners();
});

function setupEventListeners() {
  // Formulário de funcionário
  document.getElementById('employeeForm').addEventListener('submit', handleEmployeeSubmit);
  document.getElementById('cancelEmployeeEdit').addEventListener('click', cancelEmployeeEdit);
  
  // Botão para adicionar novo dia de trabalho
  document.getElementById('addScheduleBtn').addEventListener('click', addNewScheduleDay);
  
  // Modal de confirmação de exclusão
  document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDeleteEmployee);
}

// Carregar lista de funcionários
async function loadEmployees() {
  try {
    const response = await fetch('/api/admin/employees');
    if (!response.ok) throw new Error(`Erro HTTP! status: ${response.status}`);
    
    const employees = await response.json();
    renderEmployeesTable(employees);
  } catch (error) {
    console.error('Erro ao carregar funcionários:', error);
    showToast('Erro ao carregar funcionários', 'error');
  }
}

// Renderizar tabela de funcionários
function renderEmployeesTable(employees) {
  const tableBody = document.getElementById('employeesTable');
  tableBody.innerHTML = '';
  
  employees.forEach(employee => {
    const row = document.createElement('tr');
    
    // Status badge
    const statusBadge = employee.is_active ? 
      '<span class="badge bg-success status-badge">Ativo</span>' : 
      '<span class="badge bg-secondary status-badge">Inativo</span>';
    
    // Horários formatados
    let schedulesHtml = '';
    if (employee.work_schedules && employee.work_schedules.length > 0) {
      employee.work_schedules.forEach(schedule => {
        schedulesHtml += `
          <span class="badge bg-light text-dark schedule-badge">
            ${schedule.day}: ${schedule.start_time} - ${schedule.end_time}
          </span>
        `;
      });
    } else {
      schedulesHtml = '<span class="text-muted">Nenhum horário definido</span>';
    }
    
    row.innerHTML = `
      <td>${employee.name}</td>
      <td>${employee.position}</td>
      <td>${statusBadge}</td>
      <td>${schedulesHtml}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary me-2" onclick="editEmployee('${employee.id}')">
          <i class="bi bi-pencil"></i> Editar
        </button>
        <button class="btn btn-sm btn-outline-danger" onclick="showDeleteModal('${employee.id}')">
          <i class="bi bi-trash"></i> Excluir
        </button>
      </td>
    `;
    
    tableBody.appendChild(row);
  });
}

// Adicionar novo dia de trabalho ao formulário
function addNewScheduleDay(day = '', startTime = '08:00', endTime = '17:00') {
  const container = document.getElementById('workSchedulesContainer');
  const scheduleId = Date.now(); // ID único para o elemento
  
  const dayOptions = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'];
  
  const scheduleHtml = `
    <div class="schedule-day" id="schedule-${scheduleId}">
      <span class="remove-schedule" onclick="removeScheduleDay('${scheduleId}')">
        <i class="bi bi-x-circle"></i>
      </span>
      <div class="row">
        <div class="col-md-4 mb-3">
          <label class="form-label">Dia da semana</label>
          <select class="form-select schedule-day-select" ${day ? 'disabled' : ''}>
            ${dayOptions.map(d => `<option value="${d}" ${d === day ? 'selected' : ''}>${d}</option>`).join('')}
          </select>
        </div>
        <div class="col-md-3 mb-3">
          <label class="form-label">Horário de entrada</label>
          <input type="time" class="form-control schedule-start-time" value="${startTime}">
        </div>
        <div class="col-md-3 mb-3">
          <label class="form-label">Horário de saída</label>
          <input type="time" class="form-control schedule-end-time" value="${endTime}">
        </div>
      </div>
    </div>
  `;
  
  container.insertAdjacentHTML('beforeend', scheduleHtml);
}

// Remover dia de trabalho do formulário
function removeScheduleDay(scheduleId) {
  const element = document.getElementById(`schedule-${scheduleId}`);
  if (element) element.remove();
}

// Editar funcionário
async function editEmployee(id) {
  try {
    if (!id) throw new Error('ID do funcionário não fornecido');
    
    // Limpar container de horários
    document.getElementById('workSchedulesContainer').innerHTML = '';
    
    // Carregar dados do funcionário
    const employeeResponse = await fetch(`/api/admin/employees/${id}`);
    if (!employeeResponse.ok) throw new Error(`Erro HTTP! status: ${employeeResponse.status}`);
    const employee = await employeeResponse.json();
    
    // Carregar horários do funcionário
    const schedulesResponse = await fetch(`/schedules/${id}`);
    if (!schedulesResponse.ok) throw new Error(`Erro HTTP! status: ${schedulesResponse.status}`);
    const schedules = await schedulesResponse.json();
    
    // Preencher formulário
    document.getElementById('employeeId').value = employee.id;
    document.getElementById('employeeName').value = employee.name;
    document.getElementById('employeePosition').value = employee.position || '';
    document.getElementById('employeeStatus').checked = employee.is_active !== false;
    
    // Adicionar horários ao formulário
    if (schedules.length > 0) {
      schedules.forEach(schedule => {
        addNewScheduleDay(schedule.day, schedule.start_time, schedule.end_time);
      });
    } else {
      addNewScheduleDay(); // Adiciona um dia vazio por padrão
    }
    
    // Mudar o texto do botão para "Atualizar"
    const submitBtn = document.querySelector('#employeeForm button[type="submit"]');
    if (submitBtn) submitBtn.textContent = 'Atualizar';
    
    // Rolar até o formulário
    document.getElementById('employeeForm').scrollIntoView({ behavior: 'smooth' });
    
  } catch (error) {
    console.error('Erro ao editar funcionário:', error);
    showToast('Erro ao carregar dados do funcionário', 'error');
  }
}

// Cancelar edição
function cancelEmployeeEdit() {
  document.getElementById('employeeForm').reset();
  document.getElementById('employeeId').value = '';
  document.getElementById('workSchedulesContainer').innerHTML = '';
  
  const submitBtn = document.querySelector('#employeeForm button[type="submit"]');
  if (submitBtn) submitBtn.textContent = 'Salvar';
}

// Mostrar modal de confirmação de exclusão
function showDeleteModal(id) {
  employeeToDelete = id;
  const modal = new bootstrap.Modal(document.getElementById('confirmDeleteModal'));
  modal.show();
}

// Confirmar exclusão de funcionário
async function confirmDeleteEmployee() {
  if (!employeeToDelete) return;
  
  try {
    const response = await fetch(`/api/admin/employees/${employeeToDelete}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) throw new Error(`Erro HTTP! status: ${response.status}`);
    
    showToast('Funcionário excluído com sucesso', 'success');
    loadEmployees();
    
    // Fechar modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('confirmDeleteModal'));
    modal.hide();
    employeeToDelete = null;
    
  } catch (error) {
    console.error('Erro ao excluir funcionário:', error);
    showToast('Erro ao excluir funcionário', 'error');
  }
}

// Manipular envio do formulário
async function handleEmployeeSubmit(e) {
  e.preventDefault();
  
  const id = document.getElementById('employeeId').value;
  const name = document.getElementById('employeeName').value.trim();
  const position = document.getElementById('employeePosition').value.trim();
  const isActive = document.getElementById('employeeStatus').checked;
  
  if (!name || !position) {
    showToast('Preencha todos os campos obrigatórios', 'error');
    return;
  }
  
  // Coletar horários
  const schedules = [];
  const scheduleElements = document.querySelectorAll('.schedule-day');
  
  scheduleElements.forEach(element => {
    const daySelect = element.querySelector('.schedule-day-select');
    const startTime = element.querySelector('.schedule-start-time').value;
    const endTime = element.querySelector('.schedule-end-time').value;
    
    if (daySelect && startTime && endTime) {
      schedules.push({
        day: daySelect.value,
        start_time: startTime,
        end_time: endTime
      });
    }
  });
  
  if (schedules.length === 0) {
    showToast('Adicione pelo menos um dia de trabalho', 'error');
    return;
  }
  
  try {
    let response;
    const employeeData = { name, position, is_active: isActive };
    
    if (id) {
      // Atualizar funcionário existente
      response = await fetch(`/api/admin/employees/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(employeeData)
      });
      
      // Atualizar horários (primeiro remove todos existentes)
      await fetch(`/schedules/employee/${id}`, { method: 'DELETE' });
    } else {
      // Criar novo funcionário
      response = await fetch('/api/admin/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(employeeData)
      });
    }
    
    if (!response.ok) throw new Error(`Erro HTTP! status: ${response.status}`);
    
    const employee = await response.json();
    const employeeId = id || employee.id;
    
    // Salvar horários
    const schedulePromises = schedules.map(schedule => {
      return fetch('/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...schedule, employee_id: employeeId })
      });
    });
    
    await Promise.all(schedulePromises);
    
    showToast(id ? 'Funcionário atualizado com sucesso' : 'Funcionário criado com sucesso', 'success');
    cancelEmployeeEdit();
    loadEmployees();
    
  } catch (error) {
    console.error('Erro ao salvar funcionário:', error);
    showToast('Erro ao salvar funcionário', 'error');
  }
}