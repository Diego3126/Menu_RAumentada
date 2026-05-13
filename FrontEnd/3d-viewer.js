/**
 * VISOR 3D INTERACTIVO - Three.js
 * Carga y visualiza modelos GLB/GLTF con rotación interactiva
 * Integración con RA-Service para obtener modelos 3D de platos
 */

class Viewer3D {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.model = null;
        this.autoRotate = false;
        this.scale = 1;
        this.isLoading = false;
        
        // Elementos del DOM
        this.canvasElement = document.getElementById('viewer3D-canvas');
        this.containerElement = document.getElementById('viewer3D-container');
        this.loadingElement = document.getElementById('viewer3D-loading');
        this.scaleSlider = document.getElementById('scaleSlider');
        this.scaleValue = document.getElementById('scaleValue');
        this.autoRotateToggle = document.getElementById('autoRotateToggle');
        
        this.init();
        this.setupEventListeners();
    }

    /**
     * Inicializa Three.js
     */
    init() {
        // Proteger contra páginas que no tienen el visor 3D
        if (!this.containerElement || !this.canvasElement) {
            return;
        }
        const width = this.containerElement.clientWidth;
        const height = this.containerElement.clientHeight;

        // Escena
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf5f5f5);

        // Cámara
        this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        this.camera.position.z = 3;

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: this.canvasElement, 
            antialias: true, 
            alpha: true 
        });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;

        // Luces
        this.setupLights();

        // Controles de ratón/touch
        this.setupControls();

        // Animación
        this.animate();

        // Handle resize
        window.addEventListener('resize', () => this.onWindowResize());
    }

    /**
     * Configura las luces de la escena
     */
    setupLights() {
        // Luz ambiental (ilumina todo uniformemente)
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        // Luz directional (simula luz solar)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 5, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);

        // Luz de relleno (desde el otro lado)
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
        fillLight.position.set(-5, 3, -5);
        this.scene.add(fillLight);
    }

    /**
     * Configura controles interactivos (ratón/touch)
     */
    setupControls() {
        // Variables para el control manual de rotación
        this.mouseDown = false;
        this.mouseX = 0;
        this.mouseY = 0;
        this.targetRotationX = 0;
        this.targetRotationY = 0;

        this.canvasElement.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvasElement.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvasElement.addEventListener('mouseup', () => this.onMouseUp());
        this.canvasElement.addEventListener('mouseleave', () => this.onMouseUp());
        
        // Touch events para móviles
        this.canvasElement.addEventListener('touchstart', (e) => this.onTouchStart(e));
        this.canvasElement.addEventListener('touchmove', (e) => this.onTouchMove(e));
        this.canvasElement.addEventListener('touchend', () => this.onTouchEnd());

        // Zoom con rueda
        this.canvasElement.addEventListener('wheel', (e) => this.onMouseWheel(e));
    }

    onMouseDown(e) {
        this.mouseDown = true;
        this.mouseX = e.clientX;
        this.mouseY = e.clientY;
    }

    onMouseMove(e) {
        if (!this.mouseDown || !this.model) return;

        const deltaX = e.clientX - this.mouseX;
        const deltaY = e.clientY - this.mouseY;

        this.targetRotationY += deltaX * 0.005;
        this.targetRotationX += deltaY * 0.005;

        this.mouseX = e.clientX;
        this.mouseY = e.clientY;
    }

    onMouseUp() {
        this.mouseDown = false;
    }

    onTouchStart(e) {
        if (e.touches.length === 1) {
            this.mouseDown = true;
            this.mouseX = e.touches[0].clientX;
            this.mouseY = e.touches[0].clientY;
        }
    }

    onTouchMove(e) {
        if (!this.mouseDown || !this.model) return;

        const touch = e.touches[0];
        const deltaX = touch.clientX - this.mouseX;
        const deltaY = touch.clientY - this.mouseY;

        this.targetRotationY += deltaX * 0.005;
        this.targetRotationX += deltaY * 0.005;

        this.mouseX = touch.clientX;
        this.mouseY = touch.clientY;
    }

    onTouchEnd() {
        this.mouseDown = false;
    }

    onMouseWheel(e) {
        e.preventDefault();
        if (!this.model) return;

        const zoomSpeed = 0.1;
        const direction = e.deltaY > 0 ? 1 : -1;
        
        this.camera.position.z += direction * zoomSpeed;
        this.camera.position.z = Math.max(1, Math.min(10, this.camera.position.z));
    }

    /**
     * Configura event listeners de controles
     */
    setupEventListeners() {
        if (!this.containerElement) return;
        // Slider de escala
        this.scaleSlider.addEventListener('input', (e) => {
            this.scale = parseFloat(e.target.value);
            this.scaleValue.textContent = this.scale.toFixed(1) + 'x';
            if (this.model) {
                this.model.scale.set(this.scale, this.scale, this.scale);
            }
        });

        // Toggle auto-rotate
        this.autoRotateToggle.addEventListener('click', () => {
            this.autoRotate = !this.autoRotate;
            this.autoRotateToggle.classList.toggle('active');
            this.autoRotateToggle.innerHTML = this.autoRotate 
                ? '<i class="fas fa-sync"></i> Desactivar' 
                : '<i class="fas fa-sync"></i> Activar';
        });
    }

    /**
     * Carga un modelo GLB desde URL o desde RA-Service
     * @param {string} modelPath - Ruta del modelo o ID de plato
     * @param {object} dishData - Datos del plato
     */
    async loadModel(modelPath, dishData = {}) {
        this.toggleLoading(true);

        try {
            // Intenta cargar desde RA-Service primero
            let finalModelPath = modelPath;

            if (dishData.dishId && !modelPath.includes('http')) {
                try {
                    const raServiceUrl = window.location.hostname === 'localhost' ? 'http://localhost:5300' : window.BACKEND_URL;
                    const raResponse = await fetch(`${raServiceUrl}/api/ra/session`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            dishId: dishData.dishId,
                            fallbackModelPath: modelPath || '/models/default.glb'
                        })
                    });

                    if (raResponse.ok) {
                        const raData = await raResponse.json();
                        finalModelPath = raData.data?.modelUrl || raData.data?.modelPath || modelPath;
                        console.log('Modelo cargado desde RA-Service:', finalModelPath);
                    }
                } catch (raError) {
                    console.warn('RA-Service no disponible, usando ruta local', raError);
                }
            }

            // Cargar modelo con GLTFLoader
            const loader = new THREE.GLTFLoader();
            
            loader.load(
                finalModelPath,
                (gltf) => this.onModelLoaded(gltf, dishData),
                (progress) => this.onLoadProgress(progress),
                (error) => this.onLoadError(error)
            );

        } catch (error) {
            this.onLoadError(error);
        }
    }

    /**
     * Callback cuando el modelo se carga exitosamente
     */
    onModelLoaded(gltf, dishData) {
        // Eliminar modelo anterior si existe
        if (this.model) {
            this.scene.remove(this.model);
        }

        this.model = gltf.scene;
        this.model.scale.set(this.scale, this.scale, this.scale);
        
        // Ajustar posición
        const box = new THREE.Box3().setFromObject(this.model);
        const center = box.getCenter(new THREE.Vector3());
        this.model.position.sub(center);

        // Agregar sombras
        this.model.traverse((node) => {
            if (node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;
            }
        });

        this.scene.add(this.model);
        this.toggleLoading(false);

        // Actualizar info del plato
        if (dishData) {
            this.updateDishInfo(dishData);
        }

        // Reset de rotación
        this.targetRotationX = 0;
        this.targetRotationY = 0;

        console.log('Modelo cargado:', dishData.nombre || 'Desconocido');
    }

    onLoadProgress(progress) {
        const percent = (progress.loaded / progress.total * 100).toFixed(0);
        console.log('Cargando modelo:', percent + '%');
    }

    onLoadError(error) {
        this.toggleLoading(false);
        console.error('Error al cargar modelo:', error);
        
        // Mostrar modelo de placeholder
        this.createPlaceholderModel();
    }

    /**
     * Crea un modelo placeholder (cubo) si no se puede cargar el GLB
     */
    createPlaceholderModel() {
        if (this.model) {
            this.scene.remove(this.model);
        }

        const geometry = new THREE.BoxGeometry(1, 1.2, 1);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0xFFA500,
            metalness: 0.3,
            roughness: 0.4
        });
        
        this.model = new THREE.Mesh(geometry, material);
        this.model.castShadow = true;
        this.model.receiveShadow = true;
        
        this.scene.add(this.model);
        this.toggleLoading(false);
    }

    /**
     * Actualiza la info del plato en el modal
     */
    updateDishInfo(dishData) {
        const infoElement = document.getElementById('dishInfoAR');
        const nameElement = document.getElementById('dishNameAR');

        nameElement.textContent = dishData.nombre || 'Plato';

        infoElement.innerHTML = `
            <div class="dish-detail">
                <p><strong>Precio:</strong> $${dishData.precio?.toFixed(2) || '0.00'}</p>
                <p><strong>Descripción:</strong> ${dishData.descripcion || 'Sin descripción'}</p>
                <p><strong>Categoría:</strong> ${dishData.categoria || 'Desconocida'}</p>
                ${dishData.ingredientes_base ? `
                    <div class="ingredients-list">
                        <strong>Ingredientes Base:</strong>
                        <ul>
                            ${dishData.ingredientes_base.map(ing => `<li>${ing.nombre} (${ing.proteina}g proteína)</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Loop de animación
     */
    animate = () => {
        requestAnimationFrame(this.animate);

        if (this.model) {
            // Rotación manual suave
            this.model.rotation.x += (this.targetRotationX - this.model.rotation.x) * 0.1;
            this.model.rotation.y += (this.targetRotationY - this.model.rotation.y) * 0.1;

            // Auto-rotate
            if (this.autoRotate) {
                this.model.rotation.y += 0.005;
            }
        }

        this.renderer.render(this.scene, this.camera);
    };

    /**
     * Maneja redimensionamiento de ventana
     */
    onWindowResize() {
        const width = this.containerElement.clientWidth;
        const height = this.containerElement.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    /**
     * Muestra/oculta indicador de carga
     */
    toggleLoading(show) {
        this.isLoading = show;
        this.loadingElement.style.display = show ? 'flex' : 'none';
    }

    /**
     * Resetea el visor
     */
    reset() {
        if (this.model) {
            this.scene.remove(this.model);
            this.model = null;
        }
        this.scaleSlider.value = 1;
        this.scaleValue.textContent = '1.0x';
        this.autoRotate = false;
        this.autoRotateToggle.classList.remove('active');
        this.autoRotateToggle.innerHTML = '<i class="fas fa-sync"></i> Activar';
    }
}

// Instancia global del visor
let viewer3D = null;

// Inicializar cuando el DOM está listo
document.addEventListener('DOMContentLoaded', () => {
    viewer3D = new Viewer3D();
});