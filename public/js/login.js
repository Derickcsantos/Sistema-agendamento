document.addEventListener('DOMContentLoaded', function() {
  const loginForm = document.getElementById('loginForm');
  const loginMessage = document.getElementById('loginMessage');

  // Se já está logado, redireciona
  if (localStorage.getItem('isLoggedIn') === 'true') {
    window.location.href = '/admin';
    return;
  }

  loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) throw new Error('Credenciais inválidas');

      // Se sucesso, marca como logado no LocalStorage
      localStorage.setItem('isLoggedIn', 'true');
      window.location.href = '/admin';
    } catch (error) {
      showMessage('Dados incorretos', 'danger');
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
