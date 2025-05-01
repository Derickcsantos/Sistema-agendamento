// Função para carregar usuário para edição
loadUsers();

userForm.addEventListener('submit', async function(e) {
  e.preventDefault();
  
  const userData = {
    username: userUsernameInput.value.trim(),
    email: userEmailInput.value.trim(),
    tipo: userTypeSelect.value
  };

  // Adiciona a senha apenas se foi informada
  if (userPasswordInput.value) {
    userData.password_plaintext = userPasswordInput.value;
  }

  // Se tem ID, é edição
  if (userIdInput.value) {
    userData.id = userIdInput.value;
    await updateUser(userData);
  } else {
    await createUser(userData);
  }

  loadUsers();
  resetUserForm();
});

// Cancelar edição
cancelUserEditBtn.addEventListener('click', resetUserForm);

// Função para carregar usuários
async function loadUsers() {
  try {
    const response = await fetch('/api/users');
    const users = await response.json();

    if (!response.ok) {
      throw new Error(users.error || 'Erro ao carregar usuários');
    }

    renderUsersTable(users);
  } catch (error) {
    console.error('Erro:', error);
  }
}

// Função para renderizar a tabela de usuários
function renderUsersTable(users) {
  usersTable.innerHTML = '';
  
  users.forEach(user => {
    const row = document.createElement('tr');
    
    row.innerHTML = `
      <td>${user.username}</td>
      <td>${user.email}</td>
      <td><span class="badge rounded-pill ${user.tipo === 'admin' ? 'bg-primary badge-admin' : 'bg-secondary badge-comum'}">${user.tipo}</span></td>
      <td>${new Date(user.created_at).toLocaleDateString()}</td>
      <td class="action-buttons">
        <button class="btn btn-sm btn-warning edit-user" data-id="${user.id}">Editar</button>
        <button class="btn btn-sm btn-danger delete-user" data-id="${user.id}">Excluir</button>
      </td>
    `;
    
    usersTable.appendChild(row);
  });

  // Adiciona eventos aos botões de edição
  document.querySelectorAll('.edit-user').forEach(btn => {
    btn.addEventListener('click', async function() {
      const userId = this.getAttribute('data-id');
      await loadUserForEdit(userId);
    });
  });

  // Adiciona eventos aos botões de exclusão
  document.querySelectorAll('.delete-user').forEach(btn => {
    btn.addEventListener('click', async function() {
      const userId = this.getAttribute('data-id');
      if (confirm('Tem certeza que deseja excluir este usuário?')) {
        await deleteUser(userId);
        loadUsers();
      }
    });
  });
}


async function loadUserForEdit(userId) {
  try {
    const response = await fetch(`/api/users/${userId}`);
    const user = await response.json();

    if (!response.ok) {
      throw new Error(user.error || 'Erro ao carregar usuário');
    }

    userIdInput.value = user.id;
    userUsernameInput.value = user.username;
    userEmailInput.value = user.email;
    userTypeSelect.value = user.tipo;
    userPasswordInput.value = '';

    // Rola para o formulário
    document.getElementById('userForm').scrollIntoView({ behavior: 'smooth' });
  } catch (error) {
    console.error('Erro:', error);
  }
}

// Função para criar usuário
async function createUser(userData) {
  try {
    console.log('Criando usuário:', userData);
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });

    const result = await response.json();
    console.log('Resposta da criação:', result);

    if (!response.ok) {
      throw new Error(result.error || 'Erro ao criar usuário');
    }

    alert('Usuário criado com sucesso!');
    return true;
  } catch (error) {
    console.error('Erro detalhado:', error);
    alert(`Erro ao criar usuário: ${error.message}`);
    return false;
  }
}

// Função para atualizar usuário
async function updateUser(userData) {
  try {
    console.log('Atualizando usuário:', userData);
    const response = await fetch(`/api/users/${userData.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: userData.username,
        email: userData.email,
        tipo: userData.tipo,
        ...(userData.password_plaintext && { password_plaintext: userData.password_plaintext })
      })
    });

    const result = await response.json();
    console.log('Resposta da atualização:', result);

    if (!response.ok) {
      throw new Error(result.error || 'Erro ao atualizar usuário');
    }

    alert('Usuário atualizado com sucesso!');
    return true;
  } catch (error) {
    console.error('Erro detalhado:', error);
    alert(`Erro ao atualizar usuário: ${error.message}`);
    return false;
  }
}

// Função para excluir usuário
async function deleteUser(userId) {
  try {
    const response = await fetch(`/api/users/${userId}`, {
      method: 'DELETE'
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Erro ao excluir usuário');
    }

  } catch (error) {
    console.error('Erro:', error);
    alert(error.message || 'Erro ao excluir usuário');
  }
}