// Base de datos simulada
const dishesData = [
    { id: 1, name: "Ensalada César", category: "Entradas", description: "Lechuga romana, crutones, queso parmesano y aderezo César.", price: 8.90, img: "https://images.unsplash.com/photo-1746211108786-ca20c8f80ecd?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
    { id: 2, name: "Bruschetta", category: "Entradas", description: "Pan tostado con tomate, albahaca y aceite de oliva.", price: 6.50, img: "https://images.unsplash.com/photo-1594978583693-8dfdfc93f052?q=80&w=872&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
    { id: 3, name: "Solomillo a la Parrilla", category: "Platos Principales", description: "Solomillo de res con salsa de vino tinto y papas asadas.", price: 22.90, img: "https://plus.unsplash.com/premium_photo-1668446514260-d14ba955dbbd?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
    { id: 4, name: "Pasta al Pesto", category: "Platos Principales", description: "Pasta fresca con pesto genovés, piñones y queso parmesano.", price: 14.50, img: "https://plus.unsplash.com/premium_photo-1661293848626-1a6360b0dd34?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
    { id: 5, name: "Tiramisú", category: "Postres", description: "Postre italiano con café, mascarpone y cacao.", price: 6.90, img: "https://images.unsplash.com/photo-1724116379273-ba32b70d112c?q=80&w=725&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
    { id: 6, name: "Brownie con Helado", category: "Postres", description: "Brownie de chocolate caliente con bola de helado de vainilla.", price: 7.50, img: "https://images.unsplash.com/photo-1702827402870-7c33dc7b67be?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
    { id: 7, name: "Sopa de Tomate", category: "Entradas", description: "Crema de tomate orgánico con albahaca fresca.", price: 7.20, img: "https://images.unsplash.com/photo-1629978444632-9f63ba0eff47?q=80&w=871&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
    { id: 8, name: "Risotto de Setas", category: "Platos Principales", description: "Arroz arbóreo cremoso con setas silvestres y trufa.", price: 18.90, img: "https://plus.unsplash.com/premium_photo-1694850980351-683bd8436024?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" }
];

// Obtener categorías únicas
const categories = [...new Set(dishesData.map(dish => dish.category))];

// Elementos del DOM
const categoryListEl = document.getElementById('categoryList');
const dishesGrid = document.getElementById('dishesGrid');
const dishModal = document.getElementById('dishModal');
const arModal = document.getElementById('arModal');
const modalTitle = document.getElementById('modalTitle');
const modalDescription = document.getElementById('modalDescription');
const modalPrice = document.getElementById('modalPrice');
const viewARModalBtn = document.getElementById('viewARModalBtn');
const closeModalSpan = document.querySelector('.close-modal');
const closeArModalSpan = document.querySelector('.close-ar-modal');
const arExperienceBtn = document.getElementById('arExperienceBtn');

let currentCategory = "Todas";
let selectedDish = null;

// Función para renderizar categorías (MRA-5)
function renderCategories() {
    const cats = ["Todas", ...categories];
    categoryListEl.innerHTML = '';
    cats.forEach(cat => {
        const catDiv = document.createElement('div');
        catDiv.classList.add('category-item');
        if (currentCategory === cat) catDiv.classList.add('active');
        catDiv.textContent = cat;
        catDiv.addEventListener('click', () => {
            currentCategory = cat;
            renderCategories();
            renderDishes();
        });
        categoryListEl.appendChild(catDiv);
    });
}

// Función para renderizar platos según categoría (MRA-6)
function renderDishes() {
    let filtered = dishesData;
    if (currentCategory !== "Todas") {
        filtered = dishesData.filter(dish => dish.category === currentCategory);
    }

    dishesGrid.innerHTML = '';
    filtered.forEach(dish => {
        const card = document.createElement('div');
        card.classList.add('dish-card');
        card.innerHTML = `
            <div class="dish-img" style="background-image: url('${dish.img}');"></div>
            <div class="dish-info">
                <div class="dish-name">${dish.name}</div>
                <div class="dish-description">${dish.description}</div>
                <div class="dish-price">$${dish.price.toFixed(2)}</div>
            </div>
        `;
        // Al hacer click, mostrar modal con descripción y precio (MRA-7, MRA-8)
        card.addEventListener('click', () => {
            selectedDish = dish;
            modalTitle.textContent = dish.name;
            modalDescription.textContent = dish.description;
            modalPrice.textContent = `Precio: $${dish.price.toFixed(2)}`;
            dishModal.style.display = 'flex';
        });
        dishesGrid.appendChild(card);
    });
}

// Modal de AR desde botón general
arExperienceBtn.addEventListener('click', () => {
    arModal.style.display = 'flex';
});

// Botón "Ver en AR" dentro del modal del plato
viewARModalBtn.addEventListener('click', () => {
    dishModal.style.display = 'none';
    arModal.style.display = 'flex';
    // Aquí se podría cargar modelo 3D específico del plato
});

// Cerrar modales
closeModalSpan.onclick = () => dishModal.style.display = 'none';
closeArModalSpan.onclick = () => arModal.style.display = 'none';
window.onclick = (e) => {
    if (e.target === dishModal) dishModal.style.display = 'none';
    if (e.target === arModal) arModal.style.display = 'none';
};

// Inicializar
renderCategories();
renderDishes();