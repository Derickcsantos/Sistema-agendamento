document.addEventListener('DOMContentLoaded', function () {
  const user = JSON.parse(localStorage.getItem('currentUser'));

  // Verifica se está logado
  if (!user || localStorage.getItem('isLoggedIn') !== 'true') {
    window.location.href = '/login';
    return;
  }

  const perfilModal = new bootstrap.Modal(document.getElementById('perfilModal'));
  const btnPerfil = document.getElementById('btnPerfil');

  btnPerfil.addEventListener('click', () => {
    document.getElementById('perfilUsername').textContent = user.username;
    document.getElementById('perfilEmail').textContent = user.email;
    document.getElementById('perfilTipo').textContent = user.tipo || 'comum';
    perfilModal.show();
  });
});
