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
  try {
    const res = await fetch('/api/galeria');
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Erro ao carregar galeria');
    }
    imagens = await res.json();
    renderGaleria(imagens);
  } catch (error) {
    console.error('Erro detalhado:', error);
    console.log(`Erro ao carregar galeria: ${error.message}`);
  }
}

  function renderGaleria(lista) {
    listaGaleria.innerHTML = '';
    totalImagens.textContent = lista.length;

    if (lista.length === 0) {
      listaGaleria.innerHTML = '<li class="list-group-item text-center">Nenhuma imagem encontrada</li>';
      return;
    }

    lista.forEach(img => {
      const col = document.createElement('div');
      col.className = 'col-md-4 mb-4';

      const card = document.createElement('div');
      card.className = 'card h-100';

      const imgElement = document.createElement('img');
      imgElement.src = img.imagem;
      imgElement.className = 'card-img-top';
      imgElement.style.height = '200px';
      imgElement.style.objectFit = 'cover';
      imgElement.alt = img.titulo;

      const cardBody = document.createElement('div');
      cardBody.className = 'card-body';

      const cardTitle = document.createElement('h5');
      cardTitle.className = 'card-title';
      cardTitle.textContent = img.titulo;

      const cardFooter = document.createElement('div');
      cardFooter.className = 'card-footer bg-transparent';

      const btnDelete = document.createElement('button');
      btnDelete.className = 'btn btn-danger btn-sm';
      btnDelete.textContent = 'Excluir';
      btnDelete.onclick = () => {
        imagemSelecionada = img;
        excluirImagem();
      };

      cardBody.appendChild(cardTitle);
      cardFooter.appendChild(btnDelete);
      card.appendChild(imgElement);
      card.appendChild(cardBody);
      card.appendChild(cardFooter);
      col.appendChild(card);
      listaGaleria.appendChild(col);
    });
  }

  // Envio do formulário
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const submitBtn = form.querySelector('button[type="submit"]');
    
    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Enviando...';

      const res = await fetch('/api/galeria/upload', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Erro ao enviar imagem');
      }

      form.reset();
      await carregarGaleria();
      alert('Imagem enviada com sucesso!');
    } catch (error) {
      console.error('Erro:', error);
      alert(error.message || 'Erro ao enviar imagem. Verifique o console para mais detalhes.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Enviar';
    }
  });

  // Busca por título
  buscaTitulo.addEventListener('input', () => {
    const termo = buscaTitulo.value.toLowerCase();
    const filtradas = imagens.filter(img => 
      img.titulo.toLowerCase().includes(termo)
    );
    renderGaleria(filtradas);
  });

  // Função para excluir imagem
  async function excluirImagem() {
    if (!imagemSelecionada) return;
    
    const confirmacao = confirm(`Tem certeza que deseja excluir a imagem "${imagemSelecionada.titulo}"?`);
    if (!confirmacao) return;

    try {
      const res = await fetch(`/api/galeria/${imagemSelecionada._id}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('Erro ao excluir imagem');

      modal.hide();
      await carregarGaleria();
      alert('Imagem excluída com sucesso!');
    } catch (error) {
      console.error('Erro:', error);
      alert(error.message || 'Erro ao excluir imagem. Verifique o console para mais detalhes.');
    }
  }

  // Inicializa a galeria
  carregarGaleria();
});

document.addEventListener('DOMContentLoaded', function() {
    // Mobile menu toggle
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const closeBtn = document.getElementById('closeBtn');
    
    menuToggle.addEventListener('click', function() {
        sidebar.classList.add('active');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    });
    
    closeBtn.addEventListener('click', function() {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
        document.body.style.overflow = 'auto';
    });
    
    overlay.addEventListener('click', function() {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
        document.body.style.overflow = 'auto';
    });
    
    // Gallery functionality
    const galleryGrid = document.getElementById('galleryGrid');
    const searchInput = document.getElementById('searchInput');
    const loadingIndicator = document.getElementById('loading');
    
    let galleryImages = [];
    
    // Fetch images from API
    async function fetchGalleryImages() {
        try {
            loadingIndicator.style.display = 'block';
            galleryGrid.innerHTML = '';
            
            const response = await fetch('/api/galeria');
            if (!response.ok) throw new Error('Erro ao carregar imagens');
            
            galleryImages = await response.json();
            displayImages(galleryImages);
        } catch (error) {
            console.error('Error:', error);
            galleryGrid.innerHTML = '<p class="error-message">Erro ao carregar a galeria. Por favor, tente novamente mais tarde.</p>';
        } finally {
            loadingIndicator.style.display = 'none';
        }
    }
    
    // Display images in grid
    function displayImages(images) {
        galleryGrid.innerHTML = '';
        
        if (images.length === 0) {
            galleryGrid.innerHTML = '<p class="no-images">Nenhuma imagem encontrada.</p>';
            return;
        }
        
        images.forEach(image => {
            const galleryItem = document.createElement('div');
            galleryItem.className = 'gallery-item';
            
            const img = document.createElement('img');
            img.src = image.imagem;
            img.alt = image.titulo;
            img.loading = 'lazy';
            
            const imageTitle = document.createElement('div');
            imageTitle.className = 'image-title';
            imageTitle.textContent = image.titulo;
            
            galleryItem.appendChild(img);
            galleryItem.appendChild(imageTitle);
            galleryGrid.appendChild(galleryItem);
        });
    }
    
    // Search functionality
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const filteredImages = galleryImages.filter(image => 
            image.titulo.toLowerCase().includes(searchTerm)
        );
        displayImages(filteredImages);
    });
    
    // Initialize gallery
    fetchGalleryImages();
});