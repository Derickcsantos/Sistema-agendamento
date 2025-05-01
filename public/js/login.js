document.addEventListener('DOMContentLoaded', function() {
  const loginForm = document.getElementById('loginForm');
  const cadastroForm = document.getElementById('cadastroForm');
  const loginMessage = document.getElementById('loginMessage');
  const cadastroMessage = document.getElementById('cadastroMessage');
  const loginContainer = document.getElementById('loginContainer');
  const cadastroContainer = document.getElementById('cadastroContainer');
  const switchToCadastro = document.getElementById('switchToCadastro');
  const switchToLogin = document.getElementById('switchToLogin');

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

  // Alternar entre login e cadastro
  switchToCadastro.addEventListener('click', function(e) {
    e.preventDefault();
    loginContainer.style.display = 'none';
    cadastroContainer.style.display = 'block';
  });

  switchToLogin.addEventListener('click', function(e) {
    e.preventDefault();
    cadastroContainer.style.display = 'none';
    loginContainer.style.display = 'block';
  });

  // Login
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
      showMessage(loginMessage, error.message, 'danger');
    }
  });

  // Cadastro
  cadastroForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const username = document.getElementById('cadastroUsername').value.trim();
    const email = document.getElementById('cadastroEmail').value.trim();
    const password = document.getElementById('cadastroPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Validações básicas
    if (password !== confirmPassword) {
      showMessage(cadastroMessage, 'As senhas não coincidem', 'danger');
      return;
    }

    if (password.length < 6) {
      showMessage(cadastroMessage, 'A senha deve ter pelo menos 6 caracteres', 'danger');
      return;
    }

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username, 
          email, 
          password_plaintext: password,
          tipo: 'comum' // Definindo como 'comum' por padrão
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Erro ao cadastrar usuário');
      }

      showMessage(cadastroMessage, 'Cadastro realizado com sucesso! Faça login para continuar.', 'success');
      
      // Volta para o login após cadastro bem-sucedido
      setTimeout(() => {
        cadastroContainer.style.display = 'none';
        loginContainer.style.display = 'block';
        cadastroForm.reset();
      }, 2000);

    } catch (error) {
      showMessage(cadastroMessage, error.message, 'danger');
    }
  });
  
  function showMessage(element, message, type) {
    element.textContent = message;
    element.className = `mt-3 alert alert-${type}`;
    element.classList.remove('d-none');
  }

  // Visibilidade da senha
  document.addEventListener('click', function(e) {
    if (e.target.closest('.toggle-password')) {
      const button = e.target.closest('.toggle-password');
      const input = button.parentElement.querySelector('.password-input');

      if (input) {
        const isHidden = input.type === 'password';
        input.type = isHidden ? 'text' : 'password';

        const icon = button.querySelector('i');
        if (icon) {
          icon.classList.toggle('bi-eye-fill', !isHidden);
          icon.classList.toggle('bi-eye-slash-fill', isHidden);
        }
      }
    }
  });
});