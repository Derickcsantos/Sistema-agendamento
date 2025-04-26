document.addEventListener('DOMContentLoaded', function() {
  const loginForm = document.getElementById('loginForm');
  const loginMessage = document.getElementById('loginMessage');

  // Redireciona se já está logado
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

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Credenciais inválidas');
      }

      // Armazena todos os dados necessários no localStorage
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('currentUser', JSON.stringify({
        id: result.user.id,
        username: result.user.username,
        email: result.user.email,
        created_at: result.user.created_at
      }));
      
      window.location.href = '/admin';
    } catch (error) {
      showMessage(error.message, 'danger');
    }
  });

  function showMessage(message, type) {
    loginMessage.textContent = message;
    loginMessage.className = `mt-3 alert alert-${type}`;
    loginMessage.classList.remove('d-none');
  }
});