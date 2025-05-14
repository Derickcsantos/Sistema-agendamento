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
    const couponCode = document.getElementById('couponCode');
    const applyCouponBtn = document.getElementById('applyCoupon');
    const couponMessage = document.getElementById('couponMessage');
    const couponConfirmation = document.getElementById('couponConfirmation');
    let appliedCoupon = null;
    let originalPrice = 0;
    
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
    
    function validateStep(stepNumber) {
    switch(stepNumber) {
      case 1:
        if (!categorySelect.value) {
          alert('Por favor, selecione uma categoria');
          return false;
        }
        return true;
      case 2:
        if (!serviceSelect.value) {
          alert('Por favor, selecione um serviço');
          return false;
        }
        return true;
      case 3:
        if (!employeeSelect.value) {
          alert('Por favor, selecione um profissional');
          return false;
        }
        return true;
      case 4:
        if (!appointmentDate.value) {
          alert('Por favor, selecione uma data');
          return false;
        }
        return true;
      case 5:
        if (!selectedTimeInput.value) {
          alert('Por favor, selecione um horário');
          return false;
        }
        return true;
      case 6:
        // Cupom é opcional, sempre válido
        return true;
      default:
        return true;
    }
  }

  // Adicione esta função para validar cupom
async function validateCoupon(code, serviceId) {
  try {
    const response = await fetch(`/api/validate-coupon?code=${code}&serviceId=${serviceId}`);
    if (!response.ok) throw new Error('Erro ao validar cupom');
    return await response.json();
  } catch (error) {
    console.error('Erro ao validar cupom:', error);
    return { valid: false, message: 'Erro ao validar cupom' };
  }
}

  // Adicione este event listener para o botão de cupom
  applyCouponBtn.addEventListener('click', async function() {
    const code = couponCode.value.trim();
    if (!code) {
      couponMessage.textContent = 'Digite um código de cupom';
      couponMessage.className = 'text-small text-danger';
      return;
    }

    if (!selectedService) {
      couponMessage.textContent = 'Selecione um serviço primeiro';
      couponMessage.className = 'text-small text-danger';
      return;
    }

    const result = await validateCoupon(code, selectedService.id);
    
    if (result.valid) {
      appliedCoupon = {
        code: code,
        discount: result.discount,
        type: result.discountType,
        message: result.message
      };
      
      // Calcular desconto
      let discountValue = 0;
      if (appliedCoupon.type === 'percentage') {
        discountValue = originalPrice * (appliedCoupon.discount / 100);
      } else {
        discountValue = appliedCoupon.discount;
      }
      
      selectedService.price = originalPrice - discountValue;
      
      couponMessage.textContent = result.message || 'Cupom aplicado com sucesso!';
      couponMessage.className = 'text-small text-success';
      updateConfirmationData();
    } else {
      couponMessage.textContent = result.message || 'Cupom inválido';
      couponMessage.className = 'text-small text-danger';
    }
  });
    
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
          // Adiciona o preço formatado ao texto da opção
          option.textContent = `${service.name} - R$ ${service.price.toFixed(2)}`;
          option.dataset.duration = service.duration;
          // Armazena o preço bruto no dataset para uso posterior
          option.dataset.price = service.price;
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
      const serviceOption = serviceSelect.options[serviceSelect.selectedIndex];
      const serviceText = serviceOption.text;
      const servicePrice = serviceOption.dataset.price ? 
        ` - R$ ${parseFloat(serviceOption.dataset.price).toFixed(2)}` : '';
      
      confirmEmployee.textContent = employeeSelect.options[employeeSelect.selectedIndex].text;
      confirmDate.textContent = appointmentDate.value;
      confirmTime.textContent = selectedTime ? `${selectedTime.start} - ${selectedTime.end}` : '';
      confirmService.textContent = serviceText.includes(' - R$') ? 
      serviceText : `${serviceText}${servicePrice}`;
      
      // Se você tem um elemento separado para o preço:
      if (document.getElementById('confirmPrice')) {
        document.getElementById('confirmPrice').textContent = servicePrice ? 
          servicePrice.replace(' - ', '') : '';
      }
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
        const selectedOption = this.options[this.selectedIndex];
        selectedService = {
          id: this.value,
          name: selectedOption.text.split(' - ')[0], // Remove o preço do nome
          duration: selectedOption.dataset.duration,
          price: selectedOption.dataset.price ? parseFloat(selectedOption.dataset.price) : 0
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
        
        // Dentro do form.addEventListener('submit', ...):
        detailsList.innerHTML = `
          <li><strong>Nome:</strong> ${appointment.client_name}</li>
          <li><strong>Serviço:</strong> ${confirmService.textContent}</li>
          <li><strong>Profissional:</strong> ${confirmEmployee.textContent}</li>
         <li><strong>Data:</strong> ${formatDateToBR(appointment.appointment_date)}</li>
          <li><strong>Horário:</strong> ${appointment.start_time} 
          ${selectedService.price ? `<li><strong>Valor total:</strong> R$ ${selectedService.price.toFixed(2)}</li>` : ''}`
        
        // Caso queira adicionar o horário de fim no modal de confirmação, adicione o código: " <li><strong>Horário:</strong> ${appointment.start_time} - ${appointment.end_time}</li>"
        // No evento de submit do formulário, após mostrar o modal:
        modal.show();

        // Armazenar os dados do agendamento para uso nos botões
       // Atualize também o currentAppointment para incluir o preço:
        let currentAppointment = {
          name: appointment.client_name,
          email: clientEmail,
          phone: clientPhone,
          service: confirmService.textContent,
          professional: confirmEmployee.textContent,
          date: formatDateToBR(appointment.appointment_date),
          time: `${appointment.start_time}`,
          price: selectedService.price ? `R$ ${selectedService.price.toFixed(2)}` : ''
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
                  time: currentAppointment.time,
                  price: currentAppointment.price
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
                ${currentAppointment.price ? `<p><strong>Valor total:</strong> ${currentAppointment.price}</p>` : ''}
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
           if (currentAppointment.price) {
            doc.text(`Valor total: ${currentAppointment.price}`, 20, 80);
            }
          
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

    function formatDateToBR(dateString) {
      // Aceita formatos YYYY-MM-DD ou Date object
      if (!dateString) return '';
    
      let year, month, day;
    
      if (typeof dateString === 'string' && dateString.includes('-')) {
        // Suporta formato ISO: YYYY-MM-DD
        [year, month, day] = dateString.split('-');
      } else {
        // Suporta objeto Date
        const date = new Date(dateString);
        day = String(date.getDate()).padStart(2, '0');
        month = String(date.getMonth() + 1).padStart(2, '0');
        year = date.getFullYear();
      }
    
      return `${day}/${month}/${year}`;
    }
    
    
    // Inicialização
    loadCategories();
  });