// Lógica del SPA - Administrador de Prompts
// Soporte híbrido: Google Apps Script nativo + Local fallback + LocalStorage DB

// Variable que detecta si está corriendo dentro de Google Apps Script
const isRunningInGAS = (typeof google !== 'undefined' && google.script && google.script.run);

let prompts = [];
let categories = [];
let selectedCategory = 'all';
let searchQuery = '';
let deletingPromptId = null;

// Determina si estamos usando el almacenamiento local del navegador como base de datos
let isUsingLocalDb = false;

// Elementos del DOM
const DOM = {
  themeToggle: document.getElementById('theme-toggle'),
  btnConfig: document.getElementById('btn-config'),
  btnOpenCreate: document.getElementById('btn-open-create'),
  btnEmptyCreate: document.getElementById('btn-empty-create'),
  statTotal: document.getElementById('stat-total'),
  statCategories: document.getElementById('stat-categories'),
  statApiStatus: document.getElementById('stat-api-status'),
  btnOpenConfigDb: document.getElementById('btn-open-config-db'),
  searchInput: document.getElementById('search-input'),
  categoryFilters: document.getElementById('category-filters-container'),
  promptsGrid: document.getElementById('prompts-grid-container'),
  loadingView: document.getElementById('loading-view'),
  loadingSubtext: document.getElementById('loading-subtext'),
  emptyView: document.getElementById('empty-view'),
  modalForm: document.getElementById('modal-form-overlay'),
  formModalTitle: document.getElementById('form-modal-title'),
  promptForm: document.getElementById('prompt-form'),
  formPromptId: document.getElementById('form-prompt-id'),
  formCategoria: document.getElementById('form-categoria'),
  formNombre: document.getElementById('form-nombre'),
  formPrompt: document.getElementById('form-prompt'),
  formEjemplos: document.getElementById('form-ejemplos'),
  categoriesDatalist: document.getElementById('categories-datalist'),
  btnCancelForm: document.getElementById('btn-cancel-form'),
  btnCloseFormModal: document.getElementById('btn-close-form-modal'),
  btnSubmitForm: document.getElementById('btn-submit-form'),
  modalDetail: document.getElementById('modal-detail-overlay'),
  detailCategoria: document.getElementById('detail-categoria'),
  detailNombre: document.getElementById('detail-nombre'),
  detailPrompt: document.getElementById('detail-prompt'),
  detailEjemplos: document.getElementById('detail-ejemplos'),
  detailEjemplosSection: document.getElementById('detail-ejemplos-section'),
  btnCopyPrompt: document.getElementById('btn-copy-prompt'),
  btnClosedetail: document.getElementById('btn-close-detail'),
  btnCloseDetailModal: document.getElementById('btn-close-detail-modal'),
  modalDelete: document.getElementById('modal-delete-overlay'),
  deletePromptName: document.getElementById('delete-prompt-name'),
  btnCancelDelete: document.getElementById('btn-cancel-delete'),
  btnConfirmDelete: document.getElementById('btn-confirm-delete'),
  btnCloseDeleteModal: document.getElementById('btn-close-delete-modal'),
  modalConfig: document.getElementById('modal-config-overlay'),
  configForm: document.getElementById('config-form'),
  configApiUrl: document.getElementById('config-api-url'),
  btnCancelConfig: document.getElementById('btn-cancel-config'),
  btnCloseConfigModal: document.getElementById('btn-close-config-modal'),
  btnUseLocalDb: document.getElementById('btn-use-local-db'),
  toastContainer: document.getElementById('toast-container')
};

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initAPI();
  setupEventListeners();
});

// MANTENIMIENTO DEL TEMA
function initTheme() {
  const savedTheme = localStorage.getItem('prompt_theme') || 'dark';
  if (savedTheme === 'light') {
    document.body.classList.add('light-theme');
    DOM.themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
  } else {
    document.body.classList.remove('light-theme');
    DOM.themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
  }
}

function toggleTheme() {
  const isLight = document.body.classList.toggle('light-theme');
  if (isLight) {
    localStorage.setItem('prompt_theme', 'light');
    DOM.themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
    showToast('Modo claro activado', 'warning');
  } else {
    localStorage.setItem('prompt_theme', 'dark');
    DOM.themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
    showToast('Modo nocturno activado', 'success');
  }
}

// CONFIGURACIÓN Y CLIENTE API HÍBRIDO
function initAPI() {
  if (isRunningInGAS) {
    isUsingLocalDb = false;
    updateApiStatus(true, 'GAS');
    loadPromptsFromGAS();
  } else {
    const apiUrl = localStorage.getItem('prompt_api_url');
    if (apiUrl) {
      isUsingLocalDb = false;
      DOM.configApiUrl.value = apiUrl;
      testConnection(apiUrl);
    } else {
      // Activar el fallback a Local Storage si no hay una URL configurada
      activateLocalStorageMode();
    }
  }
}

function updateApiStatus(connected, message) {
  DOM.statApiStatus.textContent = message;
  if (connected) {
    if (message === 'Local Storage') {
      DOM.statApiStatus.style.color = "var(--warning)";
    } else {
      DOM.statApiStatus.style.color = "var(--success)";
    }
  } else {
    DOM.statApiStatus.style.color = "var(--danger)";
  }
}

function activateLocalStorageMode() {
  isUsingLocalDb = true;
  updateApiStatus(true, 'Local Storage');
  loadPromptsFromLocalDb();
}

function loadPromptsFromLocalDb() {
  let localData = localStorage.getItem('prompt_data_local');
  if (!localData) {
    // Si no hay datos locales pre-cargados en el navegador, sembramos los prompts de Marketing Digital
    const mockFecha = new Date().toISOString().split('T')[0];
    const seedData = [
      {
        id: "P_LOCAL_1",
        categoria: "Marketing Digital",
        nombre: "Generador de Copys para Facebook Ads",
        prompt: "Actúa como un experto en copywriting de respuesta directa y marketing digital. Escribe 3 variantes de texto para un anuncio de Facebook Ads promocionando [producto_o_servicio] dirigido a [publico_objetivo].\n\nCada variante debe seguir una estructura diferente:\nVariante 1: Fórmula AIDA (Atención, Interés, Deseo, Acción).\nVariante 2: Fórmula PAS (Problema, Agitación, Solución).\nVariante 3: Historieta Corta (Storytelling de conexión rápida).\n\nIncluye un gancho inicial llamativo, emojis estratégicos y un claro llamado a la acción (CTA).",
        ejemplos: "Producto: Curso de Finanzas Personales para Jóvenes\nPúblico Objetivo: Profesionales de 22 a 30 años frustrados por no poder ahorrar.",
        fecha: mockFecha
      },
      {
        id: "P_LOCAL_2",
        categoria: "Marketing Digital",
        nombre: "Optimizador de Asuntos de Email (Open Rate)",
        prompt: "Eres un especialista en Email Marketing de conversión. Genera 10 líneas de asunto de correo electrónico llamativas y persuasivas basadas en el siguiente tema de campaña: [tema_del_correo].\n\nDivide las sugerencias en las siguientes categorías (2 de cada una):\n1. Curiosidad (intriga al lector).\n2. Urgencia/Escasez (crea FOMO).\n3. Beneficio Directo (propuesta de valor clara).\n4. Personal / Cercano (parece enviado por un amigo).\n5. Orientado a Preguntas (estimula el pensamiento).\n\nMantén los asuntos por debajo de los 60 caracteres y sugiere emojis cuando corresponda.",
        ejemplos: "Tema: Lanzamiento de una plantilla de Notion para gestión de proyectos ágiles.",
        fecha: mockFecha
      },
      {
        id: "P_LOCAL_3",
        categoria: "Marketing Digital",
        nombre: "Calendario Semanal de Contenidos",
        prompt: "Diseña un calendario de contenidos semanal (5 días, de lunes a viernes) para las redes sociales de [marca_o_negocio] cuyo enfoque de mercado es [nicho_o_industria].\n\nPara cada día, proporciona:\n- Objetivo del post (Ej. Generar confianza, Vender, Educar, Entretener).\n- Idea del Contenido (Qué se mostrará visualmente).\n- Copy sugerido con hashtags recomendados.\n- Sugerencia de formato (Reel, Carrusel, Imagen Única).\n\nAsegúrate de equilibrar el contenido educativo con el promocional (Fórmula 80/20).",
        ejemplos: "Marca: 'FitDelicias'\nNicho: Pastelería saludable libre de gluten y azúcar refinada.",
        fecha: mockFecha
      },
      {
        id: "P_LOCAL_4",
        categoria: "Marketing Digital",
        nombre: "Redactor de Artículos SEO (Estructurado)",
        prompt: "Actúa como un redactor SEO profesional y experto en la materia. Escribe un esquema de artículo de blog optimizado para la palabra clave principal '[palabra_clave_principal]' y las palabras clave secundarias '[palabras_clave_secundarias]'.\n\nEl esquema debe incluir:\n1. Un título sugerido H1 que sea atrayente pero honesto.\n2. Meta descripción atractiva (máx. 155 caracteres).\n3. Estructura de encabezados H2 y H3 con resúmenes rápidos de lo que se hablará en cada sección.\n4. Una sección de FAQ con 3 preguntas frecuentes sugeridas relacionadas con la intención de búsqueda.",
        ejemplos: "Palabra clave principal: Cómo hacer SEO local en 2026\nPalabras clave secundarias: SEO para Google Maps, posicionamiento local gratis, seo para negocios locales.",
        fecha: mockFecha
      },
      {
        id: "P_LOCAL_5",
        categoria: "Marketing Digital",
        nombre: "Copys de Ficha de Producto de Alta Conversión",
        prompt: "Actúa como un redactor comercial especialista en comercio electrónico. Escribe la descripción de producto para [nombre_del_producto], destacando sus características técnicas pero traduciéndolas a beneficios claros para el comprador.\n\nEstructura la respuesta de la hace de la siguiente forma:\n- Título llamativo del producto.\n- Resumen inicial corto (2 oraciones) que enganche.\n- Lista de 4-5 viñetas (bullet points) destacando beneficios clave (enfocados en resolver problemas del usuario).\n- Sección con detalles técnicos secundarios.\n- Llamado a la acción de compra persuasivo.",
        ejemplos: "Producto: Auriculares inalámbricos con cancelación de ruido activa extrema y batería de 48 horas.",
        fecha: mockFecha
      },
      {
        id: "P_LOCAL_6",
        categoria: "Marketing Digital",
        nombre: "Definidor de Buyer Persona y Propuesta de Valor",
        prompt: "Actúa como un consultor de marca estratégico. Ayúdame a definir el Buyer Persona y la Propuesta de Valor Única para [idea_de_negocio].\n\nPor favor, entrégame:\n1. Perfil del Cliente Ideal (Demografía, frustraciones principales, metas deseadas).\n2. Propuesta de Valor Única (Una sola frase memorable que resuma qué haces, para quién y cómo les cambia la vida).\n3. Matriz de Objeciones: Identifica las 3 objeciones de compra más probables y escribe cómo el negocio debe responder a ellas en su sitio web.",
        ejemplos: "Negocio: Una plataforma de suscripción mensual de café premium orgánico entregado a domicilio a profesionales.",
        fecha: mockFecha
      }
    ];
    localStorage.setItem('prompt_data_local', JSON.stringify(seedData));
    prompts = seedData;
  } else {
    prompts = JSON.parse(localData);
  }
  updateState();
  renderPrompts();
  renderCategories();
}

async function loadPromptsFromGAS() {
  try {
    updateApiStatus(true, 'Cargando...');
    google.script.run
      .withSuccessHandler(data => {
        prompts = data || [];
        updateApiStatus(true, 'Nube (GAS)');
        updateState();
        renderPrompts();
        renderCategories();
      })
      .withFailureHandler(err => {
        console.error(err);
        showToast('Error cargando Google Sheets, activando local', 'warning');
        activateLocalStorageMode();
      })
      .readPrompts();
  } catch (error) {
    activateLocalStorageMode();
  }
}

async function testConnection(url) {
  try {
    updateApiStatus(false, 'Conectando...');
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({ action: 'read' })
    });
    
    const result = await response.json();
    if (result.success) {
      updateApiStatus(true, 'Google Sheets');
      prompts = result.data || [];
      updateState();
      renderPrompts();
      renderCategories();
      showToast('Conectado a Google Sheets con éxito', 'success');
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error("Error conectando a la API:", error);
    showToast('Fallo la sincronización con Sheets. Usando almacenamiento local.', 'warning');
    activateLocalStorageMode();
  }
}

async function callAPI(action, data = null, id = null) {
  if (isUsingLocalDb) {
    return new Promise((resolve, reject) => {
      let localData = JSON.parse(localStorage.getItem('prompt_data_local') || '[]');
      
      if (action === 'create') {
        const newItem = {
          id: "P" + new Date().getTime() + Math.floor(Math.random() * 1000),
          categoria: data.categoria || "",
          nombre: data.nombre || "",
          prompt: data.prompt || "",
          ejemplos: data.ejemplos || "",
          fecha: new Date().toISOString().split('T')[0]
        };
        localData.push(newItem);
        localStorage.setItem('prompt_data_local', JSON.stringify(localData));
        resolve(newItem);
      } else if (action === 'update') {
        const idx = localData.findIndex(p => p.id === id);
        if (idx === -1) {
          reject(new Error("No se encontró el prompt a actualizar."));
          return;
        }
        localData[idx] = {
          ...localData[idx],
          categoria: data.categoria || "",
          nombre: data.nombre || "",
          prompt: data.prompt || "",
          ejemplos: data.ejemplos || ""
        };
        localStorage.setItem('prompt_data_local', JSON.stringify(localData));
        resolve(localData[idx]);
      } else if (action === 'delete') {
        localData = localData.filter(p => p.id !== id);
        localStorage.setItem('prompt_data_local', JSON.stringify(localData));
        resolve({ success: true, id: id });
      } else if (action === 'read') {
        resolve(localData);
      } else if (action === 'setup') {
        resolve({ success: true });
      }
    });
  }

  if (isRunningInGAS) {
    return new Promise((resolve, reject) => {
      const successHandler = (result) => resolve(result);
      const failureHandler = (err) => reject(err);
      
      const runner = google.script.run
        .withSuccessHandler(successHandler)
        .withFailureHandler(failureHandler);
        
      if (action === 'create') runner.createPrompt(data);
      else if (action === 'read') runner.readPrompts();
      else if (action === 'update') runner.updatePrompt(id, data);
      else if (action === 'delete') runner.deletePrompt(id);
      else if (action === 'setup') runner.setupSheet();
    });
  } else {
    const url = localStorage.getItem('prompt_api_url');
    if (!url) throw new Error("Configura la URL de la API primero.");
    
    const payload = { action };
    if (data) payload.data = data;
    if (id) payload.id = id;
    
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    if (!result.success) throw new Error(result.error || "Error en el servidor");
    return result.data;
  }
}

function updateState() {
  const allCategories = prompts.map(p => p.categoria.trim()).filter(Boolean);
  categories = [...new Set(allCategories)].sort();
  
  DOM.statTotal.textContent = prompts.length;
  DOM.statCategories.textContent = categories.length;
  DOM.categoriesDatalist.innerHTML = categories.map(cat => `<option value="${cat}">`).join('');
}

// RENDERIZADO DE COMPONENTES UI
function renderCategories() {
  let html = `<button class="category-chip ${selectedCategory === 'all' ? 'active' : ''}" data-category="all">Todos</button>`;
  categories.forEach(cat => {
    html += `<button class="category-chip ${selectedCategory === cat ? 'active' : ''}" data-category="${cat}">${cat}</button>`;
  });
  DOM.categoryFilters.innerHTML = html;
  
  DOM.categoryFilters.querySelectorAll('.category-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      DOM.categoryFilters.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      selectedCategory = chip.dataset.category;
      renderPrompts();
    });
  });
}

function renderPrompts() {
  DOM.loadingView.style.display = 'none';
  
  const filteredPrompts = prompts.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.categoria === selectedCategory;
    const query = searchQuery.toLowerCase();
    const matchesSearch = !query || 
      item.nombre.toLowerCase().includes(query) || 
      item.categoria.toLowerCase().includes(query) || 
      item.prompt.toLowerCase().includes(query) ||
      (item.ejemplos && item.ejemplos.toLowerCase().includes(query));
      
    return matchesCategory && matchesSearch;
  });
  
  const existingCards = DOM.promptsGrid.querySelectorAll('.prompt-card');
  existingCards.forEach(card => card.remove());
  
  if (filteredPrompts.length === 0) {
    DOM.emptyView.style.display = 'flex';
    return;
  }
  
  DOM.emptyView.style.display = 'none';
  const fragment = document.createDocumentFragment();
  
  filteredPrompts.forEach(item => {
    const card = document.createElement('div');
    card.className = 'prompt-card';
    card.dataset.id = item.id;
    
    const countExamples = item.ejemplos ? item.ejemplos.split('\n').filter(line => line.trim()).length : 0;
    
    card.innerHTML = `
      <div class="card-header">
        <div class="card-title-group">
          <span class="card-category">${escapeHTML(item.categoria)}</span>
          <h4 class="card-title" title="${escapeHTML(item.nombre)}">${escapeHTML(item.nombre)}</h4>
        </div>
        <div class="card-actions">
          <button class="action-btn btn-edit" title="Editar prompt">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button class="action-btn btn-delete" title="Eliminar prompt">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </div>
      <div class="card-content-preview">${escapeHTML(item.prompt)}</div>
      <div class="card-footer">
        <span class="examples-badge">
          <i class="fa-solid fa-lightbulb"></i> ${countExamples} ejemplo(s)
        </span>
        <span class="examples-badge" style="margin-left: 0.5rem;" title="Fecha de creación">
          <i class="fa-regular fa-calendar"></i> ${item.fecha || 'N/A'}
        </span>
        <button class="btn btn-card-copy" style="margin-left: auto;">
          <i class="fa-regular fa-copy"></i> Copiar
        </button>
      </div>
    `;
    
    card.querySelector('.btn-edit').addEventListener('click', (e) => {
      e.stopPropagation();
      openEditForm(item.id);
    });
    
    card.querySelector('.btn-delete').addEventListener('click', (e) => {
      e.stopPropagation();
      confirmDelete(item.id);
    });
    
    const btnCopy = card.querySelector('.btn-card-copy');
    btnCopy.addEventListener('click', (e) => {
      e.stopPropagation();
      copyPromptText(btnCopy, item.prompt);
    });
    
    card.addEventListener('click', () => openDetailModal(item));
    fragment.appendChild(card);
  });
  
  DOM.promptsGrid.appendChild(fragment);
}

// MODALES
function openModal(modal) {
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal(modal) {
  modal.classList.remove('active');
  document.body.style.overflow = '';
}

document.querySelectorAll('.modal-overlay').forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal(modal);
  });
});

// EVENT LISTENERS
function setupEventListeners() {
  DOM.themeToggle.addEventListener('click', toggleTheme);
  
  DOM.btnConfig.addEventListener('click', () => openModal(DOM.modalConfig));
  DOM.btnOpenConfigDb.addEventListener('click', () => openModal(DOM.modalConfig));
  
  DOM.btnOpenCreate.addEventListener('click', openCreateForm);
  DOM.btnEmptyCreate.addEventListener('click', openCreateForm);
  
  DOM.btnCloseFormModal.addEventListener('click', () => closeModal(DOM.modalForm));
  DOM.btnCancelForm.addEventListener('click', () => closeModal(DOM.modalForm));
  DOM.btnCloseDetailModal.addEventListener('click', () => closeModal(DOM.modalDetail));
  DOM.btnClosedetail.addEventListener('click', () => closeModal(DOM.modalDetail));
  DOM.btnCloseDeleteModal.addEventListener('click', () => closeModal(DOM.modalDelete));
  DOM.btnCancelDelete.addEventListener('click', () => closeModal(DOM.modalDelete));
  DOM.btnCloseConfigModal.addEventListener('click', () => closeModal(DOM.modalConfig));
  DOM.btnCancelConfig.addEventListener('click', () => closeModal(DOM.modalConfig));
  
  DOM.configForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const url = DOM.configApiUrl.value.trim();
    if (url) {
      localStorage.setItem('prompt_api_url', url);
      closeModal(DOM.modalConfig);
      showToast('API URL Guardada. Conectando...', 'warning');
      DOM.loadingView.style.display = 'flex';
      const cards = DOM.promptsGrid.querySelectorAll('.prompt-card');
      cards.forEach(c => c.remove());
      DOM.emptyView.style.display = 'none';
      isUsingLocalDb = false;
      testConnection(url);
    }
  });
  
  DOM.btnUseLocalDb.addEventListener('click', () => {
    localStorage.removeItem('prompt_api_url');
    DOM.configApiUrl.value = "";
    closeModal(DOM.modalConfig);
    showToast('Cargando base de datos del navegador...', 'success');
    DOM.loadingView.style.display = 'flex';
    const cards = DOM.promptsGrid.querySelectorAll('.prompt-card');
    cards.forEach(c => c.remove());
    DOM.emptyView.style.display = 'none';
    activateLocalStorageMode();
  });
  
  DOM.promptForm.addEventListener('submit', handleFormSubmit);
  DOM.btnConfirmDelete.addEventListener('click', handleDeleteConfirm);
  DOM.searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderPrompts();
  });
}

// CRUD ACTIONS
function openCreateForm() {
  DOM.formPromptId.value = "";
  DOM.promptForm.reset();
  DOM.formModalTitle.textContent = "Agregar Nuevo Prompt";
  openModal(DOM.modalForm);
  DOM.formCategoria.focus();
}

function openEditForm(id) {
  const promptItem = prompts.find(p => p.id === id);
  if (!promptItem) return;
  
  DOM.formModalTitle.textContent = "Editar Prompt";
  DOM.formPromptId.value = promptItem.id;
  DOM.formCategoria.value = promptItem.categoria;
  DOM.formNombre.value = promptItem.nombre;
  DOM.formPrompt.value = promptItem.prompt;
  DOM.formEjemplos.value = promptItem.ejemplos || "";
  
  openModal(DOM.modalForm);
  DOM.formCategoria.focus();
}

async function handleFormSubmit(e) {
  e.preventDefault();
  
  const id = DOM.formPromptId.value;
  const isEditing = id !== "";
  
  const promptData = {
    categoria: DOM.formCategoria.value.trim(),
    nombre: DOM.formNombre.value.trim(),
    prompt: DOM.formPrompt.value.trim(),
    ejemplos: DOM.formEjemplos.value.trim()
  };
  
  DOM.btnSubmitForm.disabled = true;
  DOM.btnSubmitForm.textContent = "Guardando...";
  
  try {
    if (isEditing) {
      const updatedItem = await callAPI('update', promptData, id);
      const idx = prompts.findIndex(p => p.id === id);
      if (idx !== -1) prompts[idx] = updatedItem;
      showToast('Prompt actualizado correctamente', 'success');
    } else {
      const newItem = await callAPI('create', promptData);
      prompts.push(newItem);
      showToast('Prompt creado con éxito', 'success');
    }
    
    updateState();
    renderCategories();
    renderPrompts();
    closeModal(DOM.modalForm);
  } catch (error) {
    console.error(error);
    showToast('Error al guardar el prompt', 'danger');
  } finally {
    DOM.btnSubmitForm.disabled = false;
    DOM.btnSubmitForm.textContent = "Guardar Prompt";
  }
}

function confirmDelete(id) {
  const promptItem = prompts.find(p => p.id === id);
  if (!promptItem) return;
  
  deletingPromptId = id;
  DOM.deletePromptName.textContent = promptItem.nombre;
  openModal(DOM.modalDelete);
}

async function handleDeleteConfirm() {
  if (!deletingPromptId) return;
  
  DOM.btnConfirmDelete.disabled = true;
  DOM.btnConfirmDelete.textContent = "Eliminando...";
  
  try {
    await callAPI('delete', null, deletingPromptId);
    prompts = prompts.filter(p => p.id !== deletingPromptId);
    
    updateState();
    renderCategories();
    renderPrompts();
    showToast('Prompt eliminado correctamente', 'success');
    closeModal(DOM.modalDelete);
  } catch (error) {
    console.error(error);
    showToast('No se pudo eliminar el prompt', 'danger');
  } finally {
    DOM.btnConfirmDelete.disabled = false;
    DOM.btnConfirmDelete.textContent = "Sí, Eliminar";
    deletingPromptId = null;
  }
}

// DETALLE Y COPIADO
function openDetailModal(item) {
  DOM.detailCategoria.textContent = item.categoria;
  DOM.detailNombre.textContent = item.nombre;
  DOM.detailPrompt.textContent = item.prompt;
  
  const detailFechaEl = document.getElementById('detail-fecha');
  if (detailFechaEl) {
    detailFechaEl.textContent = item.fecha ? `• ${item.fecha}` : '';
  }
  
  if (item.ejemplos) {
    DOM.detailEjemplos.textContent = item.ejemplos;
    DOM.detailEjemplosSection.style.display = 'block';
  } else {
    DOM.detailEjemplosSection.style.display = 'none';
  }
  
  DOM.btnCopyPrompt.onclick = () => {
    copyPromptText(DOM.btnCopyPrompt, item.prompt);
  };
  
  openModal(DOM.modalDetail);
}

function copyPromptText(button, text) {
  navigator.clipboard.writeText(text).then(() => {
    const originalContent = button.innerHTML;
    button.innerHTML = '<i class="fa-solid fa-check"></i> Copiado!';
    button.style.background = 'var(--success)';
    button.style.color = 'white';
    button.style.borderColor = 'transparent';
    
    showToast('Prompt copiado al portapapeles', 'success');
    
    setTimeout(() => {
      button.innerHTML = originalContent;
      button.style.background = '';
      button.style.color = '';
      button.style.borderColor = '';
    }, 2000);
  }).catch(err => {
    console.error(err);
    showToast('Error al copiar el texto', 'danger');
  });
}

// UTILERÍA: TOASTS & ESCAPING
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let iconClass = 'fa-check-circle';
  if (type === 'danger') iconClass = 'fa-times-circle';
  if (type === 'warning') iconClass = 'fa-exclamation-circle';
  
  toast.innerHTML = `
    <div class="toast-content">
      <i class="fa-solid ${iconClass} toast-icon"></i>
      <span class="toast-message">${escapeHTML(message)}</span>
    </div>
    <button class="toast-close">&times;</button>
  `;
  
  toast.querySelector('.toast-close').addEventListener('click', () => removeToast(toast));
  DOM.toastContainer.appendChild(toast);
  
  setTimeout(() => {
    if (toast.parentNode) removeToast(toast);
  }, 4000);
}

function removeToast(toast) {
  toast.classList.add('removing');
  toast.addEventListener('animationend', () => toast.remove());
}

function escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeJsString(str) {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}
