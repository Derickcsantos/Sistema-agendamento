document.addEventListener('DOMContentLoaded', function () {
  const user = JSON.parse(localStorage.getItem('currentUser'));

  // Verifica se está logado
  if (!user || localStorage.getItem('isLoggedIn') !== 'true') {
    window.location.href = '/login';
    return;
  }

  // Elementos da UI
  const perfilModal = new bootstrap.Modal(document.getElementById('perfilModal'));
  const btnPerfil = document.getElementById('btnPerfil');
  const btnLogout = document.getElementById('btnLogout');
  const themeToggle = document.getElementById('themeToggle');
  const profileForm = document.getElementById('profileForm');

  // Carregar dados do usuário no modal
  btnPerfil.addEventListener('click', () => {
    document.getElementById('profileUsername').value = user.username;
    document.getElementById('profileEmail').value = user.email;
    document.getElementById('profilePassword').value = user.password;
    document.getElementById('profileTipo').value = user.tipo || 'comum';
    perfilModal.show();
  });

  // Logout
  btnLogout.addEventListener('click', logout);

  // Alternar tema
  themeToggle.addEventListener('click', toggleTheme);
  updateThemeIcon();

  // Atualizar perfil
  if (profileForm) {
    profileForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const username = document.getElementById('profileUsername').value;
      const email = document.getElementById('profileEmail').value;
      const password = document.getElementById('profilePassword').value;

      try {
        const updateData = { username, email };
        if (password) updateData.password_plaintext = password;

        const response = await fetch(`/api/admin/users/${user.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateData)
        });

        if (!response.ok) {
          throw new Error('Erro ao atualizar perfil');
        }

        const updatedUser = await response.json();
        
        // Atualiza localStorage
        localStorage.setItem('currentUser', JSON.stringify({
          ...user,
          username: updatedUser.username,
          email: updatedUser.email
        }));

        showToast('Perfil atualizado com sucesso!', 'success');
        perfilModal.hide();
      } catch (error) {
        console.error('Erro ao atualizar perfil:', error);
        showToast(`Erro: ${error.message}`, 'error');
      }
    });
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

  // Funções auxiliares
  function logout() {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('currentUser');
    window.location.href = '/login';
  }

  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-bs-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-bs-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon();
  }

  function updateThemeIcon() {
    const currentTheme = document.documentElement.getAttribute('data-bs-theme');
    const icon = themeToggle.querySelector('i');
    
    if (currentTheme === 'dark') {
      icon.classList.remove('bi-moon-fill');
      icon.classList.add('bi-sun-fill');
    } else {
      icon.classList.remove('bi-sun-fill');
      icon.classList.add('bi-moon-fill');
    }
  }

  function showToast(message, type) {
    // Implementação básica de toast - pode ser substituída por uma biblioteca
    const toastContainer = document.createElement('div');
    toastContainer.className = `toast-container position-fixed bottom-0 end-0 p-3`;
    
    const toast = document.createElement('div');
    toast.className = `toast show align-items-center text-white bg-${type === 'success' ? 'success' : 'danger'} border-0`;
    toast.role = 'alert';
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    const toastBody = document.createElement('div');
    toastBody.className = 'd-flex';
    
    const toastMessage = document.createElement('div');
    toastMessage.className = 'toast-body';
    toastMessage.textContent = message;
    
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'btn-close btn-close-white me-2 m-auto';
    closeButton.setAttribute('data-bs-dismiss', 'toast');
    closeButton.setAttribute('aria-label', 'Close');
    
    toastBody.appendChild(toastMessage);
    toastBody.appendChild(closeButton);
    toast.appendChild(toastBody);
    toastContainer.appendChild(toast);
    
    document.body.appendChild(toastContainer);
    
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toastContainer.remove(), 300);
    }, 3000);
  }

  // Carregar tema salvo
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-bs-theme', savedTheme);
  updateThemeIcon();
});