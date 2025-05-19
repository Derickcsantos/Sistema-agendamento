document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('formUpload');
  const listaGaleria = document.getElementById('listaGaleria');
  const totalImagens = document.getElementById('totalImagens');
  const buscaTitulo = document.getElementById('buscaTitulo');

  const modal = new bootstrap.Modal(document.getElementById('modalImagem'));
  const imagemModal = document.getElementById('imagemModal');
  const tituloModal = document.getElementById('tituloModal');
  const btnExcluir = document.getElementById('btnExcluir');

  let imagens = [];
  let imagemSelecionada = null;

  // Função para carregar a galeria
  async function carregarGaleria() {
    const res = await fetch('/api/galeria');
    imagens = await res.json();
    renderGaleria(imagens);
  }

  function renderGaleria(lista) {
    listaGaleria.innerHTML = '';
    totalImagens.textContent = lista.length;

    lista.forEach(img => {
      const item = document.createElement('li');
      item.className = 'list-group-item d-flex justify-content-between align-items-center';
      item.textContent = img.titulo;
      item.style.cursor = 'pointer';

      item.addEventListener('click', () => {
        imagemSelecionada = img;
        tituloModal.textContent = img.titulo;
        imagemModal.src = img.imagem;
        modal.show();
      });

      listaGaleria.appendChild(item);
    });
  }

  // Envio do formulário
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);

    const res = await fetch('/api/galeria/upload', {
      method: 'POST',
      body: formData
    });

    if (res.ok) {
      form.reset();
      await carregarGaleria();
    } else {
      alert('Erro ao enviar imagem.');
    }
  });

  // Busca por título
  buscaTitulo.addEventListener('input', () => {
    const termo = buscaTitulo.value.toLowerCase();
    const filtradas = imagens.filter(img => img.titulo.toLowerCase().includes(termo));
    renderGaleria(filtradas);
  });

  // Excluir imagem
  btnExcluir.addEventListener('click', async () => {
    if (!imagemSelecionada) return;
    const confirmacao = confirm('Tem certeza que deseja excluir esta imagem?');
    if (!confirmacao) return;

    const res = await fetch(`/api/galeria/${imagemSelecionada._id}`, {
      method: 'DELETE'
    });

    if (res.ok) {
      modal.hide();
      await carregarGaleria();
    } else {
      alert('Erro ao excluir imagem.');
    }
  });

  carregarGaleria();
});
