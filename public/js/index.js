// index.js - Frontend JavaScript para o sistema de agendamentos

document.addEventListener('DOMContentLoaded', function() {
    // Elementos do DOM
    const form = document.getElementById('appointmentForm');
    const steps = document.querySelectorAll('.step');
    const stepIndicators = document.querySelectorAll('.step-indicator');
    const categorySelect = document.getElementById('category');
    const serviceSelect = document.getElementById('service');
    const employeeSelect = document.getElementById('employee');
    const appointmentDate = document.getElementById('appointmentDate');
    const timeSlotsContainer = document.getElementById('timeSlots');
    const selectedTimeInput = document.getElementById('selectedTime');
    
    // Elementos de confirmação
    const confirmService = document.getElementById('confirmService');
    const confirmEmployee = document.getElementById('confirmEmployee');
    const confirmDate = document.getElementById('confirmDate');
    const confirmTime = document.getElementById('confirmTime');
    
    // Variáveis para armazenar dados selecionados
    let selectedService = null;
    let selectedEmployee = null;
    let selectedDate = null;
    let selectedTime = null;
    
    // Inicializar Flatpickr para seleção de data
    flatpickr(appointmentDate, {
      locale: 'pt',
      minDate: 'today',
      dateFormat: 'd/m/Y',
      disable: [
        function(date) {
          // Desabilitar fins de semana (sábado = 6, domingo = 0)
          return (date.getDay() === 0 || date.getDay() === 6);
        }
      ]
    });
    
    // Navegação entre passos
    function navigateToStep(stepNumber) {
      // Esconder todos os passos
      steps.forEach(step => step.classList.remove('active'));
      
      // Mostrar o passo atual
      document.getElementById(`step${stepNumber}`).classList.add('active');
      
      // Atualizar indicadores de passo
      stepIndicators.forEach(indicator => {
        if (parseInt(indicator.dataset.step) <= stepNumber) {
          indicator.classList.add('active');
        } else {
          indicator.classList.remove('active');
        }
      });
      
      // Atualizar dados de confirmação quando chegar no último passo
      if (stepNumber === 5) {
        updateConfirmationData();
      }
    }
    
    // Event listeners para navegação
    document.querySelectorAll('.next-step').forEach(button => {
      button.addEventListener('click', function() {
        const nextStep = this.dataset.next;
        if (validateStep(parseInt(nextStep) - 1)) {
          navigateToStep(parseInt(nextStep));
        }
      });
    });
    
    document.querySelectorAll('.prev-step').forEach(button => {
      button.addEventListener('click', function() {
        const prevStep = this.dataset.prev;
        navigateToStep(parseInt(prevStep));
      });
    });
    
    // Validação de cada passo antes de avançar
    function validateStep(stepNumber) {
      switch(stepNumber) {
        case 1:
          if (!categorySelect.value || !serviceSelect.value) {
            alert('Por favor, selecione uma categoria e um serviço');
            return false;
          }
          return true;
        case 2:
          if (!employeeSelect.value) {
            alert('Por favor, selecione um profissional');
            return false;
          }
          return true;
        case 3:
          if (!appointmentDate.value) {
            alert('Por favor, selecione uma data');
            return false;
          }
          return true;
        case 4:
          if (!selectedTimeInput.value) {
            alert('Por favor, selecione um horário');
            return false;
          }
          return true;
        default:
          return true;
      }
    }
    
    // Carregar categorias do banco de dados
    async function loadCategories() {
      try {
        const response = await fetch('/api/categories');
        if (!response.ok) throw new Error('Erro ao carregar categorias');
        
        const categories = await response.json();
        
        // Limpar e popular o select de categorias
        categorySelect.innerHTML = '<option value="" selected disabled>Selecione uma categoria</option>';
        categories.forEach(category => {
          const option = document.createElement('option');
          option.value = category.id;
          option.textContent = category.name;
          categorySelect.appendChild(option);
        });
      } catch (error) {
        console.error('Erro ao carregar categorias:', error);
        alert('Erro ao carregar categorias. Por favor, recarregue a página.');
      }
    }
    
    // Carregar serviços baseado na categoria selecionada
    async function loadServices(categoryId) {
      try {
        const response = await fetch(`/api/services/${categoryId}`);
        if (!response.ok) throw new Error('Erro ao carregar serviços');
        
        const services = await response.json();
        
        // Limpar e popular o select de serviços
        serviceSelect.innerHTML = '<option value="" selected disabled>Selecione um serviço</option>';
        serviceSelect.disabled = false;
        
        services.forEach(service => {
          const option = document.createElement('option');
          option.value = service.id;
          option.textContent = service.name;
          option.dataset.duration = service.duration;
          serviceSelect.appendChild(option);
        });
      } catch (error) {
        console.error('Erro ao carregar serviços:', error);
        alert('Erro ao carregar serviços. Por favor, tente novamente.');
      }
    }
    
    // Carregar funcionários baseado no serviço selecionado
    async function loadEmployees(serviceId) {
      try {
        const response = await fetch(`/api/employees/${serviceId}`);
        if (!response.ok) throw new Error('Erro ao carregar profissionais');
        
        const employees = await response.json();
        
        // Limpar e popular o select de funcionários
        employeeSelect.innerHTML = '<option value="" selected disabled>Selecione um profissional</option>';
        
        employees.forEach(employee => {
          const option = document.createElement('option');
          option.value = employee.id;
          option.textContent = employee.name;
          employeeSelect.appendChild(option);
        });
      } catch (error) {
        console.error('Erro ao carregar profissionais:', error);
        alert('Erro ao carregar profissionais. Por favor, tente novamente.');
      }
    }
    
    // Carregar horários disponíveis
    async function loadAvailableTimes(employeeId, date, duration) {
      try {
        const response = await fetch(`/api/available-times?employeeId=${employeeId}&date=${date}&duration=${duration}`);
        if (!response.ok) throw new Error('Erro ao carregar horários disponíveis');
        
        const timeSlots = await response.json();
        
        // Limpar e popular os horários disponíveis
        timeSlotsContainer.innerHTML = '';
        selectedTimeInput.value = '';
        
        if (timeSlots.length === 0) {
          timeSlotsContainer.innerHTML = '<p>Nenhum horário disponível para esta data</p>';
          return;
        }
        
        timeSlots.forEach(slot => {
          const slotElement = document.createElement('div');
          slotElement.className = 'time-slot';
          slotElement.textContent = `${slot.start} - ${slot.end}`;
          slotElement.dataset.start = slot.start;
          slotElement.dataset.end = slot.end;
          
          slotElement.addEventListener('click', function() {
            // Remover seleção de todos os slots
            document.querySelectorAll('.time-slot').forEach(el => el.classList.remove('selected'));
            
            // Selecionar este slot
            this.classList.add('selected');
            selectedTimeInput.value = `${this.dataset.start}-${this.dataset.end}`;
            selectedTime = {
              start: this.dataset.start,
              end: this.dataset.end
            };
          });
          
          timeSlotsContainer.appendChild(slotElement);
        });
      } catch (error) {
        console.error('Erro ao carregar horários disponíveis:', error);
        alert('Erro ao carregar horários disponíveis. Por favor, tente novamente.');
      }
    }
    
    // Atualizar dados de confirmação
    function updateConfirmationData() {
      confirmService.textContent = serviceSelect.options[serviceSelect.selectedIndex].text;
      confirmEmployee.textContent = employeeSelect.options[employeeSelect.selectedIndex].text;
      confirmDate.textContent = appointmentDate.value;
      confirmTime.textContent = selectedTime ? `${selectedTime.start} - ${selectedTime.end}` : '';
    }
    
    // Event listeners para selects
    categorySelect.addEventListener('change', function() {
      if (this.value) {
        loadServices(this.value);
      } else {
        serviceSelect.innerHTML = '<option value="" selected disabled>Primeiro selecione uma categoria</option>';
        serviceSelect.disabled = true;
      }
    });
    
    serviceSelect.addEventListener('change', function() {
      if (this.value) {
        selectedService = {
          id: this.value,
          name: this.options[this.selectedIndex].text,
          duration: this.options[this.selectedIndex].dataset.duration
        };
        loadEmployees(this.value);
      } else {
        employeeSelect.innerHTML = '<option value="" selected disabled>Primeiro selecione um serviço</option>';
      }
    });
    
    employeeSelect.addEventListener('change', function() {
      if (this.value) {
        selectedEmployee = {
          id: this.value,
          name: this.options[this.selectedIndex].text
        };
      }
    });
    
    appointmentDate.addEventListener('change', function() {
      if (this.value && selectedService && selectedEmployee) {
        // Converter data para formato YYYY-MM-DD
        const [day, month, year] = this.value.split('/');
        const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        
        selectedDate = formattedDate;
        loadAvailableTimes(selectedEmployee.id, formattedDate, selectedService.duration);
      }
    });
    
    // Envio do formulário
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const clientName = document.getElementById('clientName').value;
      const clientEmail = document.getElementById('clientEmail').value;
      const clientPhone = document.getElementById('clientPhone').value;
      
      try {
        const response = await fetch('/api/appointments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            client_name: clientName,
            client_email: clientEmail,
            client_phone: clientPhone,
            service_id: selectedService.id,
            employee_id: selectedEmployee.id,
            date: selectedDate,
            start_time: selectedTime.start,
            end_time: selectedTime.end
          })
        });
        
        if (!response.ok) throw new Error('Erro ao confirmar agendamento');
        
        const appointment = await response.json();
        
        // Mostrar modal de confirmação
        const modal = new bootstrap.Modal(document.getElementById('confirmationModal'));
        const detailsList = document.getElementById('appointmentDetails');
        
        detailsList.innerHTML = `
          <li><strong>Nome:</strong> ${appointment.client_name}</li>
          <li><strong>Serviço:</strong> ${confirmService.textContent}</li>
          <li><strong>Profissional:</strong> ${confirmEmployee.textContent}</li>
          <li><strong>Data:</strong> ${appointment.appointment_date}</li>
          <li><strong>Horário:</strong> ${appointment.start_time} - ${appointment.end_time}</li>
        `;
        
        // No evento de submit do formulário, após mostrar o modal:
        modal.show();

        // Armazenar os dados do agendamento para uso nos botões
        let currentAppointment = {
          name: appointment.client_name,
          email: clientEmail,
          phone: clientPhone,
          service: confirmService.textContent,
          professional: confirmEmployee.textContent,
          date: appointment.appointment_date,
          time: `${appointment.start_time} - ${appointment.end_time}`
        };

        // Configurar os botões
        document.getElementById('whatsappBtn').addEventListener('click', async () => {
          const userPhone = currentAppointment.phone.replace(/\D/g, '');
          
          // Inicializa os modais do Bootstrap
          const successModal = new bootstrap.Modal(document.getElementById('successModal'));
          const errorModal = new bootstrap.Modal(document.getElementById('errorModal'));
          const validationModal = new bootstrap.Modal(document.getElementById('validationModal'));
        
          if (userPhone.length < 11) {
            document.getElementById('validationMessage').textContent = 'Número inválido. Digite um número com DDD.';
            validationModal.show();
            return;
          }
        
          try {
            const response = await fetch('/api/send-whatsapp-confirmation', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                clientPhone: userPhone,
                appointmentDetails: {
                  service: currentAppointment.service,
                  professional: currentAppointment.professional,
                  date: currentAppointment.date,
                  time: currentAppointment.time
                }
              })
            });
        
            const result = await response.json();
            
            if (result.success) {
              successModal.show();
            } else {
              document.getElementById('errorMessage').textContent = result.error || 'Erro ao enviar mensagem';
              errorModal.show();
            }
          } catch (error) {
            console.error('Erro:', error);
            document.getElementById('errorMessage').textContent = 'Falha na comunicação com o servidor';
            errorModal.show();
          }
        });

        // No seu index.js, adicione este evento para formatar o telefone enquanto digita
        document.getElementById('clientPhone').addEventListener('input', function(e) {
          let value = e.target.value.replace(/\D/g, '');
          
          if (value.length > 2) {
            value = `(${value.substring(0, 2)}) ${value.substring(2)}`;
          }
          if (value.length > 10) {
            value = `${value.substring(0, 10)}-${value.substring(10)}`;
          }

          if (!/^(\+55|55|0)?[\s-]?\(?[1-9]{2}\)?[\s-]?9?[\s-]?[0-9]{4}[\s-]?[0-9]{4}$/.test(currentAppointment.phone)) {
            alert('Por favor, digite um número de telefone válido com DDD');
            return;
          }
          
          e.target.value = value;
        });

        document.getElementById('emailBtn').addEventListener('click', async () => {
          // Inicializa os modais
          const emailSuccessModal = new bootstrap.Modal(document.getElementById('emailSuccessModal'));
          const emailErrorModal = new bootstrap.Modal(document.getElementById('emailErrorModal'));
          const emailLoadingModal = new bootstrap.Modal(document.getElementById('emailLoadingModal'));
        
          try {

            // Mostrar modal de carregamento
            emailLoadingModal.show();

            const response = await fetch('/api/send-confirmation-email', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                email: currentAppointment.email,
                subject: 'Confirmação de Agendamento',
                body: `
                  <h1>Confirmação de Agendamento</h1>
                  <p>Seu agendamento foi confirmado com sucesso!</p>
                  <p><strong>Nome:</strong> ${currentAppointment.name}</p>
                  <p><strong>Serviço:</strong> ${currentAppointment.service}</p>
                  <p><strong>Profissional:</strong> ${currentAppointment.professional}</p>
                  <p><strong>Data:</strong> ${currentAppointment.date}</p>
                  <p><strong>Horário:</strong> ${currentAppointment.time}</p>
                `
              })
            });

            // Esconde o loading
            emailLoadingModal.hide();
        
            if (response.ok) {
              emailSuccessModal.show();
            } else {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Erro ao enviar e-mail');
            }
          } catch (error) {
            console.error('Erro:', error);
            document.getElementById('emailErrorMessage').textContent = error.message || 'Erro ao enviar e-mail de confirmação';
            emailErrorModal.show();
          }
        });

        document.getElementById('pdfBtn').addEventListener('click', () => {
          // Usando jsPDF para gerar o PDF
          const { jsPDF } = window.jspdf;
          const doc = new jsPDF();
          
          doc.text('Confirmação de Agendamento', 20, 20);
          doc.text(`Nome: ${currentAppointment.name}`, 20, 30);
          doc.text(`Serviço: ${currentAppointment.service}`, 20, 40);
          doc.text(`Profissional: ${currentAppointment.professional}`, 20, 50);
          doc.text(`Data: ${currentAppointment.date}`, 20, 60);
          doc.text(`Horário: ${currentAppointment.time}`, 20, 70);
          
          doc.save(`Agendamento_${currentAppointment.name.replace(/\s/g, '_')}.pdf`);
        });
        
        // Resetar formulário após confirmação
        modal._element.addEventListener('hidden.bs.modal', function() {
          form.reset();
          categorySelect.innerHTML = '<option value="" selected disabled>Selecione uma categoria</option>';
          serviceSelect.innerHTML = '<option value="" selected disabled>Primeiro selecione uma categoria</option>';
          serviceSelect.disabled = true;
          employeeSelect.innerHTML = '<option value="" selected disabled>Selecione um profissional</option>';
          timeSlotsContainer.innerHTML = '';
          selectedTimeInput.value = '';
          
          // Recarregar categorias
          loadCategories();
          
          // Voltar para o primeiro passo
          navigateToStep(1);
        });
        
      } catch (error) {
        console.error('Erro ao confirmar agendamento:', error);
        alert('Erro ao confirmar agendamento. Por favor, tente novamente.');
      }
    });
    
    // Inicialização
    loadCategories();
  });