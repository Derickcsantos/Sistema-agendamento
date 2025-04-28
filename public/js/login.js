document.addEventListener('DOMContentLoaded', function() {
  const loginForm = document.getElementById('loginForm');
  const loginMessage = document.getElementById('loginMessage');

  // Redireciona se já está logado
  if (localStorage.getItem('isLoggedIn') === 'true') {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (user?.tipo === 'admin') {
      window.location.href = '/admin';
    } else {
      window.location.href = '/logado';
    }
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

      const user = result.user;

      // Armazena dados no localStorage
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('currentUser', JSON.stringify({
        id: user.id,
        username: user.username,
        password: user.password_plaintext,
        email: user.email,
        tipo: user.tipo,
        created_at: user.created_at
      }));

      // Redirecionamento baseado no tipo de usuário
      if (user.tipo === 'admin') {
        window.location.href = '/admin';
      } else {
        window.location.href = '/logado';
      }

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