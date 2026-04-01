/**
 * VISOR 3D INTERACTIVO - Three.js
 * Carga y visualiza modelos GLB/GLTF con rotación interactiva
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
        this.fittedScale = 1;
        this.surfaceAnchor = { x: 0, y: -0.35, spread: 0.06, confidence: 0 };
        this.prevFeatureCentroid = null;
        this.prevFeatureSpread = null;
        this.anchorSmoothing = 0.18;
        this.maxAnchorStep = 0.085;
        
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

        this.targetRotationY += deltaX * 0.005;

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

        this.targetRotationY += deltaX * 0.005;

        this.mouseX = touch.clientX;
        this.mouseY = touch.clientY;
    }

    onTouchEnd() {
        this.mouseDown = false;
    }

    onMouseWheel(e) {
        e.preventDefault();
        // Interacción restringida a rotación horizontal.
    }

    /**
     * Configura event listeners de controles
     */
    setupEventListeners() {
        // Slider de escala
        this.scaleSlider.addEventListener('input', (e) => {
            this.scale = parseFloat(e.target.value);
            this.scaleValue.textContent = this.scale.toFixed(1) + 'x';
            if (this.model) {
                this.fitModelToView();
                this.placeModelOnSurface();
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
     * Carga un modelo GLB desde una ruta local o remota.
     * @param {string} modelPath - Ruta del modelo o ID de plato
     * @param {object} dishData - Datos del plato
     */
    async loadModel(modelPath, dishData = {}) {
        this.toggleLoading(true);

        try {
            const finalModelPath = modelPath || '/models/default.glb';

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

        this.fitModelToView();
        this.placeModelOnSurface();

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

    fitModelToView() {
        if (!this.model) return;

        const box = new THREE.Box3().setFromObject(this.model);
        const size = box.getSize(new THREE.Vector3());
        const maxDimension = Math.max(size.x, size.y, size.z);
        if (!maxDimension || maxDimension <= 0) return;

        const targetDimension = 1.15;
        const fitScale = targetDimension / maxDimension;
        this.fittedScale = fitScale;
        this.applyAnchorScale();
    }

    placeModelOnSurface() {
        if (!this.model) return;

        // Coloca el modelo cerca de la superficie estimada por keypoints.
        const box = new THREE.Box3().setFromObject(this.model);
        const anchor = this.surfaceAnchor || { x: 0, y: -0.35 };

        const horizontalSpan = 1.35;
        const verticalSpan = 1.15;
        const desiredGroundY = anchor.y * verticalSpan;

        this.model.position.x = anchor.x * horizontalSpan;
        this.model.position.y += desiredGroundY - box.min.y;
        this.model.position.z = 0;
    }

    applyAnchorScale() {
        if (!this.model) return;

        const anchor = this.surfaceAnchor || { y: -0.35, spread: 0.06 };
        const perspectiveBoost = 1 + Math.max(-0.2, Math.min(0.45, (-anchor.y - 0.1) * 0.4));
        const spreadBoost = 1 + Math.max(-0.25, Math.min(0.55, ((anchor.spread || 0.06) - 0.04) * 8));

        const finalScale = this.fittedScale * this.scale * perspectiveBoost * spreadBoost;
        this.model.scale.set(finalScale, finalScale, finalScale);
    }

    updateSurfaceAnchorFromFeatures(keypoints = [], imageWidth = 0, imageHeight = 0) {
        if (!Array.isArray(keypoints) || keypoints.length < 6 || !imageWidth || !imageHeight) {
            return false;
        }

        const lowerHalf = keypoints.filter((kp) => kp.y > imageHeight * 0.45);
        const sample = lowerHalf.length >= 8 ? lowerHalf : keypoints;
        if (sample.length < 6) {
            return false;
        }

        const xs = sample.map((kp) => kp.x).sort((a, b) => a - b);
        const ys = sample.map((kp) => kp.y).sort((a, b) => a - b);
        const mid = Math.floor(sample.length / 2);
        const medianX = xs[mid];
        const medianY = ys[mid];

        const meanX = sample.reduce((acc, kp) => acc + kp.x, 0) / sample.length;
        const meanY = sample.reduce((acc, kp) => acc + kp.y, 0) / sample.length;
        const variance = sample.reduce((acc, kp) => {
            const dx = kp.x - meanX;
            const dy = kp.y - meanY;
            return acc + dx * dx + dy * dy;
        }, 0) / sample.length;
        const spread = Math.sqrt(variance) / Math.max(imageWidth, imageHeight);

        const normalizedX = (medianX / imageWidth) * 2 - 1;
        const normalizedY = -((medianY / imageHeight) * 2 - 1);
        const measuredAnchor = {
            x: Math.max(-0.85, Math.min(0.85, normalizedX)),
            y: Math.max(-0.8, Math.min(0.35, normalizedY - 0.12)),
            spread: Math.max(0.02, Math.min(0.2, spread)),
            confidence: Math.max(0, Math.min(1, sample.length / keypoints.length))
        };

        const centroid = {
            x: medianX / imageWidth,
            y: medianY / imageHeight
        };

        let predictedAnchor = { ...measuredAnchor };
        if (this.prevFeatureCentroid) {
            const motionX = (centroid.x - this.prevFeatureCentroid.x) * 2;
            const motionY = -(centroid.y - this.prevFeatureCentroid.y) * 2;
            predictedAnchor = {
                ...measuredAnchor,
                x: this.surfaceAnchor.x + motionX,
                y: this.surfaceAnchor.y + motionY
            };
        }

        const confidenceWeight = 0.35 + measuredAnchor.confidence * 0.45;
        const blendedTarget = {
            x: predictedAnchor.x * (1 - confidenceWeight) + measuredAnchor.x * confidenceWeight,
            y: predictedAnchor.y * (1 - confidenceWeight) + measuredAnchor.y * confidenceWeight,
            spread: measuredAnchor.spread,
            confidence: measuredAnchor.confidence
        };

        this.surfaceAnchor = this.smoothAnchor(blendedTarget);
        this.prevFeatureCentroid = centroid;
        this.prevFeatureSpread = spread;

        if (this.model) {
            this.applyAnchorScale();
            this.placeModelOnSurface();
        }

        return true;
    }

    smoothAnchor(target) {
        const dx = target.x - this.surfaceAnchor.x;
        const dy = target.y - this.surfaceAnchor.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        let limitedX = target.x;
        let limitedY = target.y;
        if (distance > this.maxAnchorStep) {
            const ratio = this.maxAnchorStep / distance;
            limitedX = this.surfaceAnchor.x + dx * ratio;
            limitedY = this.surfaceAnchor.y + dy * ratio;
        }

        const alpha = this.anchorSmoothing + (target.confidence * 0.15);
        const nextX = this.surfaceAnchor.x + (limitedX - this.surfaceAnchor.x) * alpha;
        const nextY = this.surfaceAnchor.y + (limitedY - this.surfaceAnchor.y) * alpha;
        const nextSpread = this.surfaceAnchor.spread + (target.spread - this.surfaceAnchor.spread) * 0.25;

        return {
            x: Math.max(-0.85, Math.min(0.85, nextX)),
            y: Math.max(-0.8, Math.min(0.35, nextY)),
            spread: Math.max(0.02, Math.min(0.2, nextSpread)),
            confidence: target.confidence
        };
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
        this.fitModelToView();
        this.placeModelOnSurface();
        
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
            // Mantiene orientación vertical estable para simular objeto fijo en mesa.
            this.targetRotationX = 0;
            this.model.rotation.x += (this.targetRotationX - this.model.rotation.x) * 0.18;
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

        if (!width || !height) {
            return;
        }

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
        this.surfaceAnchor = { x: 0, y: -0.35, spread: 0.06, confidence: 0 };
        this.prevFeatureCentroid = null;
        this.prevFeatureSpread = null;
        this.fittedScale = 1;
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
