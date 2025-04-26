document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const loginMessage = document.getElementById('loginMessage');
  
    // Se já está marcado como logado, vai direto para admin
    if (localStorage.getItem('isLoggedIn') === 'true') {
      window.location.href = '/admin';
      return; // Importante para não continuar a execução
    }
  
    loginForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value;
      
      // Verificação LOCAL (não precisa de API em desenvolvimento)
      if (username === 'admin' && password === 'admin123') {
        // Marca como logado no localStorage
        localStorage.setItem('isLoggedIn', 'true');
        
        // Redireciona UMA ÚNICA VEZ
        window.location.href = '/admin';
      } else {
        showMessage('Credenciais inválidas (use admin/admin123)', 'danger');
      }
    });
  
    function showMessage(message, type) {
      loginMessage.textContent = message;
      loginMessage.className = `mt-3 alert alert-${type}`;
      loginMessage.classList.remove('d-none');
      
      setTimeout(() => {
        loginMessage.classList.add('d-none');
      }, 5000);
    }
  });