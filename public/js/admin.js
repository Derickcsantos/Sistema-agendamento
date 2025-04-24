document.addEventListener('DOMContentLoaded', function() {
  loadCategories();
  loadServices();
  loadEmployees();
  loadAppointments();
  setupEventListeners();
});

async function loadAppointments() {
  try {
    const response = await fetch('/api/admin/appointments');
    const data = await response.json();
    
    const tableBody = document.getElementById('appointmentsTable');
    tableBody.innerHTML = '';
    
    data.forEach(appointment => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${appointment.id}</td>
        <td>${appointment.client_name}</td>
        <td>${appointment.services.name}</td>
        <td>${appointment.employees.name}</td>
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
    
    document.querySelectorAll('.delete-appointment').forEach(button => {
      button.addEventListener('click', function() {
        showConfirmationModal('appointment', this.getAttribute('data-id'));
      });
    });
  } catch (error) {
    console.error('Erro ao carregar agendamentos:', error);
  }
}

async function searchAppointments() {
  const searchTerm = document.getElementById('appointmentSearch').value.trim();
  
  try {
    const response = await fetch(`/api/admin/appointments?search=${encodeURIComponent(searchTerm)}`);
    const data = await response.json();
    
    const tableBody = document.getElementById('appointmentsTable');
    tableBody.innerHTML = '';
    
    data.forEach(appointment => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${appointment.id}</td>
        <td>${appointment.client_name}</td>
        <td>${appointment.services.name}</td>
        <td>${appointment.employees.name}</td>
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
    
    document.querySelectorAll('.delete-appointment').forEach(button => {
      button.addEventListener('click', function() {
        showConfirmationModal('appointment', this.getAttribute('data-id'));
      });
    });
  } catch (error) {
    console.error('Erro ao buscar agendamentos:', error);
  }
}

async function filterAppointmentsByDate() {
  const date = document.getElementById('appointmentDateFilter').value;
  
  try {
    const response = await fetch(`/api/admin/appointments?date=${date}`);
    const data = await response.json();
    
    const tableBody = document.getElementById('appointmentsTable');
    tableBody.innerHTML = '';
    
    data.forEach(appointment => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${appointment.id}</td>
        <td>${appointment.client_name}</td>
        <td>${appointment.services.name}</td>
        <td>${appointment.employees.name}</td>
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
    
    document.querySelectorAll('.delete-appointment').forEach(button => {
      button.addEventListener('click', function() {
        showConfirmationModal('appointment', this.getAttribute('data-id'));
      });
    });
  } catch (error) {
    console.error('Erro ao filtrar agendamentos:', error);
  }
}

// Mantenha as outras funções como estão (loadCategories, loadServices, etc.)