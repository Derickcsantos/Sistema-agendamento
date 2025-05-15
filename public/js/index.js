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
  const confirmPrice = document.getElementById('confirmPrice');
  const confirmOriginalPrice = document.getElementById('confirmOriginalPrice');
  const confirmDiscount = document.getElementById('confirmDiscount');
  
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

  // Validar cupom
  async function validateCoupon(code, serviceId) {
    try {
      console.log('Validando cupom:', code, 'para serviço:', serviceId); // Debug
      const response = await fetch(`/api/validate-coupon?code=${encodeURIComponent(code)}&serviceId=${serviceId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao validar cupom');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Erro na validação do cupom:', error);
      return { 
        valid: false, 
        message: error.message || 'Erro ao validar cupom' 
      };
    }
  }

  // Aplicar cupom
  applyCouponBtn.addEventListener('click', async function() {
    console.log('Clicou em aplicar cupom');
    console.log('Código digitado:', couponCode.value.trim());
    console.log('Serviço selecionado:', selectedService);
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
      
      couponMessage.textContent = result.message || 'Cupom aplicado com sucesso!';
      couponMessage.className = 'text-small text-success';
      updateConfirmationData();
    } else {
      appliedCoupon = null;
      couponMessage.textContent = result.message || 'Cupom inválido';
      couponMessage.className = 'text-small text-danger';
      updateConfirmationData();
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
    
    confirmEmployee.textContent = employeeSelect.options[employeeSelect.selectedIndex].text;
    confirmDate.textContent = appointmentDate.value;
    confirmTime.textContent = selectedTime ? `${selectedTime.start} - ${selectedTime.end}` : '';
    confirmService.textContent = serviceText;
    
    // Preços e descontos
    originalPrice = parseFloat(serviceOption.dataset.price);
    let finalPrice = originalPrice;
    let discountText = '';
    
    if (appliedCoupon) {
      if (appliedCoupon.type === 'percentage') {
        finalPrice = originalPrice * (1 - appliedCoupon.discount / 100);
      } else {
        finalPrice = originalPrice - appliedCoupon.discount;
      }
      finalPrice = Math.max(0, finalPrice); // Garante que não fique negativo
      discountText = ` (${appliedCoupon.discount}${appliedCoupon.type === 'percentage' ? '%' : 'R$'} de desconto)`;
    }
    
    // Atualizar elementos de preço
    if (confirmOriginalPrice) {
      confirmOriginalPrice.textContent = `R$ ${originalPrice.toFixed(2)}`;
    }
    
    if (confirmPrice) {
      confirmPrice.textContent = `R$ ${finalPrice.toFixed(2)}`;
    }
    
    if (confirmDiscount) {
      confirmDiscount.textContent = discountText;
      confirmDiscount.style.display = appliedCoupon ? 'inline' : 'none';
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

    const startHHMM = `${appointment.start_time.substring(0,2)}:${appointment.start_time.substring(2,4)}`;
    const endHHMM = `${appointment.end_time.substring(0,2)}:${appointment.end_time.substring(2,4)}`;

    // Calcular duração
    const startMinutes = parseInt(appointment.start_time.substring(0,2)) * 60 + parseInt(appointment.start_time.substring(2,4));
    const endMinutes = parseInt(appointment.end_time.substring(0,2)) * 60 + parseInt(appointment.end_time.substring(2,4));
    const durationMinutes = endMinutes - startMinutes;
    const duration = `${String(Math.floor(durationMinutes / 60)).padStart(2, '0')}:${String(durationMinutes % 60).padStart(2, '0')}`;
        
    try {
      // Calcular preço final considerando o cupom
      let finalPrice = originalPrice;
      if (appliedCoupon) {
        if (appliedCoupon.type === 'percentage') {
          finalPrice = originalPrice * (1 - appliedCoupon.discount / 100);
        } else {
          finalPrice = originalPrice - appliedCoupon.discount;
        }
        finalPrice = Math.max(0, finalPrice); // Garante que não fique negativo
      }
      
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
          end_time: selectedTime.end,
          coupon_code: appliedCoupon ? appliedCoupon.code : null,
          original_price: originalPrice,
          final_price: finalPrice
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
        <li><strong>Data:</strong> ${formatDateToBR(appointment.appointment_date)}</li>
        <li><strong>Horário:</strong> ${appointment.start_time}</li>
        ${originalPrice ? `
          <li><strong>Valor original:</strong> R$ ${originalPrice.toFixed(2)}</li>
          ${appliedCoupon ? `<li><strong>Desconto:</strong> ${appliedCoupon.discount}${appliedCoupon.type === 'percentage' ? '%' : 'R$'}</li>` : ''}
          <li><strong>Valor total:</strong> R$ ${finalPrice.toFixed(2)}</li>
        ` : ''}
      `;
      
      modal.show();

      // Armazenar os dados do agendamento para uso nos botões
      let currentAppointment = {
        name: appointment.client_name,
        email: clientEmail,
        phone: clientPhone,
        service: confirmService.textContent,
        professional: confirmEmployee.textContent,
        date: formatDateToBR(appointment.appointment_date),
        time: `${appointment.start_time}`,
        originalPrice: originalPrice ? `R$ ${originalPrice.toFixed(2)}` : '',
        finalPrice: finalPrice ? `R$ ${finalPrice.toFixed(2)}` : '',
        discount: appliedCoupon ? `${appliedCoupon.discount}${appliedCoupon.type === 'percentage' ? '%' : 'R$'}` : ''
      };

      // Configurar os botões
      document.getElementById('whatsappBtn').addEventListener('click', async () => {
        const userPhone = currentAppointment.phone.replace(/\D/g, '');
        
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
                originalPrice: currentAppointment.originalPrice,
                discount: currentAppointment.discount,
                finalPrice: currentAppointment.finalPrice
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
        const emailSuccessModal = new bootstrap.Modal(document.getElementById('emailSuccessModal'));
        const emailErrorModal = new bootstrap.Modal(document.getElementById('emailErrorModal'));
        const emailLoadingModal = new bootstrap.Modal(document.getElementById('emailLoadingModal'));
      
        try {
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
              ${currentAppointment.originalPrice ? `<p><strong>Valor original:</strong> ${currentAppointment.originalPrice}</p>` : ''}
              ${currentAppointment.discount ? `<p><strong>Desconto:</strong> ${currentAppointment.discount}</p>` : ''}
              ${currentAppointment.finalPrice ? `<p><strong>Valor total:</strong> ${currentAppointment.finalPrice}</p>` : ''}
              `
            })
          });

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
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.text('Confirmação de Agendamento', 20, 20);
        doc.text(`Nome: ${currentAppointment.name}`, 20, 30);
        doc.text(`Serviço: ${currentAppointment.service}`, 20, 40);
        doc.text(`Profissional: ${currentAppointment.professional}`, 20, 50);
        doc.text(`Data: ${currentAppointment.date}`, 20, 60);
        doc.text(`Horário: ${currentAppointment.time}`, 20, 70);
        if (currentAppointment.originalPrice) {
          doc.text(`Valor original: ${currentAppointment.originalPrice}`, 20, 80);
        }
        if (currentAppointment.discount) {
          doc.text(`Desconto: ${currentAppointment.discount}`, 20, 90);
        }
        if (currentAppointment.finalPrice) {
          doc.text(`Valor total: ${currentAppointment.finalPrice}`, 20, 100);
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
        couponCode.value = '';
        couponMessage.textContent = '';
        couponMessage.className = 'text-small';
        appliedCoupon = null;
        
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
    if (!dateString) return '';
  
    let year, month, day;
  
    if (typeof dateString === 'string' && dateString.includes('-')) {
      [year, month, day] = dateString.split('-');
    } else {
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