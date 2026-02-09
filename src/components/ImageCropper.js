/**
 * Image Cropper Component
 * Allows users to select and crop a specific region of an image
 * Supports both mouse (desktop) and touch (mobile) interactions
 */

export class ImageCropper {
    constructor(containerId, imageBlob, onComplete, onCancel) {
        this.container = document.getElementById(containerId);
        this.imageBlob = imageBlob;
        this.onComplete = onComplete;
        this.onCancel = onCancel;

        // Canvas and image
        this.canvas = null;
        this.ctx = null;
        this.image = null;
        this.imageLoaded = false;

        // Selection state
        this.selection = {
            x: 0,
            y: 0,
            width: 0,
            height: 0
        };

        // Interaction state
        this.isDragging = false;
        this.isResizing = false;
        this.resizeHandle = null;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.initialSelection = null;

        // Constants
        this.HANDLE_SIZE = 20;
        this.MIN_SIZE = 50;
        this.TOUCH_HANDLE_SIZE = 30; // Larger for mobile
    }

    async render() {
        // Create UI
        this.container.innerHTML = `
            <div class="crop-container">
                <div class="crop-header">
                    <h3>切り取り範囲を選択</h3>
                    <p class="crop-hint">ドラッグして範囲を調整してください</p>
                </div>
                <div class="crop-canvas-wrapper" id="cropCanvasWrapper">
                    <canvas id="cropCanvas"></canvas>
                </div>
                <div class="crop-controls">
                    <button id="cropCancelBtn" class="btn btn-secondary">キャンセル</button>
                    <button id="cropConfirmBtn" class="btn btn-primary">切り取り実行</button>
                </div>
            </div>
        `;

        this.canvas = document.getElementById('cropCanvas');
        this.ctx = this.canvas.getContext('2d');

        // Load image
        await this.loadImage();

        // Setup event listeners
        this.setupEventListeners();

        // Initialize selection (center 80% of image)
        this.initializeSelection();

        // Draw initial state
        this.draw();
    }

    async loadImage() {
        return new Promise((resolve, reject) => {
            this.image = new Image();
            this.image.onload = () => {
                this.imageLoaded = true;
                this.setupCanvas();
                resolve();
            };
            this.image.onerror = reject;
            this.image.src = URL.createObjectURL(this.imageBlob);
        });
    }

    setupCanvas() {
        const wrapper = document.getElementById('cropCanvasWrapper');
        const maxWidth = wrapper.clientWidth;
        const maxHeight = window.innerHeight * 0.6; // 60% of viewport height

        // Calculate scaled dimensions
        let scale = Math.min(
            maxWidth / this.image.width,
            maxHeight / this.image.height,
            1 // Don't scale up
        );

        this.canvas.width = this.image.width * scale;
        this.canvas.height = this.image.height * scale;

        // Store scale for later use
        this.scale = scale;
    }

    initializeSelection() {
        const margin = 0.1; // 10% margin
        this.selection = {
            x: this.canvas.width * margin,
            y: this.canvas.height * margin,
            width: this.canvas.width * (1 - 2 * margin),
            height: this.canvas.height * (1 - 2 * margin)
        };
    }

    setupEventListeners() {
        // Cancel button
        document.getElementById('cropCancelBtn').addEventListener('click', () => {
            this.cleanup();
            this.onCancel();
        });

        // Confirm button
        document.getElementById('cropConfirmBtn').addEventListener('click', () => {
            this.cropAndComplete();
        });

        // Mouse events (desktop)
        this.canvas.addEventListener('mousedown', (e) => this.handlePointerDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handlePointerMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handlePointerUp(e));
        this.canvas.addEventListener('mouseleave', (e) => this.handlePointerUp(e));

        // Touch events (mobile)
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handlePointerDown(e.touches[0]);
        }, { passive: false });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this.handlePointerMove(e.touches[0]);
        }, { passive: false });

        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.handlePointerUp(e);
        }, { passive: false });

        // Update cursor style
        this.canvas.addEventListener('mousemove', (e) => {
            if (!this.isDragging && !this.isResizing) {
                this.updateCursor(e);
            }
        });
    }

    getPointerPosition(event) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (event.clientX - rect.left) * (this.canvas.width / rect.width),
            y: (event.clientY - rect.top) * (this.canvas.height / rect.height)
        };
    }

    handlePointerDown(event) {
        const pos = this.getPointerPosition(event);
        const handle = this.getResizeHandle(pos.x, pos.y);

        if (handle) {
            // Start resizing
            this.isResizing = true;
            this.resizeHandle = handle;
            this.dragStartX = pos.x;
            this.dragStartY = pos.y;
            this.initialSelection = { ...this.selection };
        } else if (this.isInsideSelection(pos.x, pos.y)) {
            // Start dragging
            this.isDragging = true;
            this.dragStartX = pos.x;
            this.dragStartY = pos.y;
            this.initialSelection = { ...this.selection };
        }
    }

    handlePointerMove(event) {
        const pos = this.getPointerPosition(event);

        if (this.isResizing) {
            this.handleResize(pos.x, pos.y);
            this.draw();
        } else if (this.isDragging) {
            this.handleDrag(pos.x, pos.y);
            this.draw();
        }
    }

    handlePointerUp(event) {
        this.isDragging = false;
        this.isResizing = false;
        this.resizeHandle = null;
        this.canvas.style.cursor = 'default';
    }

    handleDrag(x, y) {
        const dx = x - this.dragStartX;
        const dy = y - this.dragStartY;

        let newX = this.initialSelection.x + dx;
        let newY = this.initialSelection.y + dy;

        // Constrain to canvas bounds
        newX = Math.max(0, Math.min(newX, this.canvas.width - this.selection.width));
        newY = Math.max(0, Math.min(newY, this.canvas.height - this.selection.height));

        this.selection.x = newX;
        this.selection.y = newY;
    }

    handleResize(x, y) {
        const dx = x - this.dragStartX;
        const dy = y - this.dragStartY;
        const initial = this.initialSelection;

        let newSelection = { ...initial };

        // Handle different resize directions
        if (this.resizeHandle.includes('n')) {
            newSelection.y = initial.y + dy;
            newSelection.height = initial.height - dy;
        }
        if (this.resizeHandle.includes('s')) {
            newSelection.height = initial.height + dy;
        }
        if (this.resizeHandle.includes('w')) {
            newSelection.x = initial.x + dx;
            newSelection.width = initial.width - dx;
        }
        if (this.resizeHandle.includes('e')) {
            newSelection.width = initial.width + dx;
        }

        // Enforce minimum size
        if (newSelection.width < this.MIN_SIZE) {
            if (this.resizeHandle.includes('w')) {
                newSelection.x = initial.x + initial.width - this.MIN_SIZE;
            }
            newSelection.width = this.MIN_SIZE;
        }
        if (newSelection.height < this.MIN_SIZE) {
            if (this.resizeHandle.includes('n')) {
                newSelection.y = initial.y + initial.height - this.MIN_SIZE;
            }
            newSelection.height = this.MIN_SIZE;
        }

        // Constrain to canvas bounds
        newSelection.x = Math.max(0, Math.min(newSelection.x, this.canvas.width - this.MIN_SIZE));
        newSelection.y = Math.max(0, Math.min(newSelection.y, this.canvas.height - this.MIN_SIZE));
        newSelection.width = Math.min(newSelection.width, this.canvas.width - newSelection.x);
        newSelection.height = Math.min(newSelection.height, this.canvas.height - newSelection.y);

        this.selection = newSelection;
    }

    getResizeHandle(x, y) {
        const s = this.selection;
        const isMobile = 'ontouchstart' in window;
        const handleSize = isMobile ? this.TOUCH_HANDLE_SIZE : this.HANDLE_SIZE;

        const handles = {
            'nw': { x: s.x, y: s.y },
            'n': { x: s.x + s.width / 2, y: s.y },
            'ne': { x: s.x + s.width, y: s.y },
            'e': { x: s.x + s.width, y: s.y + s.height / 2 },
            'se': { x: s.x + s.width, y: s.y + s.height },
            's': { x: s.x + s.width / 2, y: s.y + s.height },
            'sw': { x: s.x, y: s.y + s.height },
            'w': { x: s.x, y: s.y + s.height / 2 }
        };

        for (const [name, pos] of Object.entries(handles)) {
            if (Math.abs(x - pos.x) < handleSize / 2 && Math.abs(y - pos.y) < handleSize / 2) {
                return name;
            }
        }

        return null;
    }

    isInsideSelection(x, y) {
        return x >= this.selection.x &&
            x <= this.selection.x + this.selection.width &&
            y >= this.selection.y &&
            y <= this.selection.y + this.selection.height;
    }

    updateCursor(event) {
        const pos = this.getPointerPosition(event);
        const handle = this.getResizeHandle(pos.x, pos.y);

        if (handle) {
            const cursors = {
                'nw': 'nw-resize', 'n': 'n-resize', 'ne': 'ne-resize',
                'e': 'e-resize', 'se': 'se-resize', 's': 's-resize',
                'sw': 'sw-resize', 'w': 'w-resize'
            };
            this.canvas.style.cursor = cursors[handle];
        } else if (this.isInsideSelection(pos.x, pos.y)) {
            this.canvas.style.cursor = 'move';
        } else {
            this.canvas.style.cursor = 'default';
        }
    }

    draw() {
        if (!this.imageLoaded) return;

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw image
        this.ctx.drawImage(this.image, 0, 0, this.canvas.width, this.canvas.height);

        // Draw overlay (darken non-selected area)
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Clear selection area
        this.ctx.clearRect(
            this.selection.x,
            this.selection.y,
            this.selection.width,
            this.selection.height
        );

        // Redraw image in selection area
        this.ctx.drawImage(
            this.image,
            this.selection.x / this.scale,
            this.selection.y / this.scale,
            this.selection.width / this.scale,
            this.selection.height / this.scale,
            this.selection.x,
            this.selection.y,
            this.selection.width,
            this.selection.height
        );

        // Draw selection border
        this.ctx.strokeStyle = '#4CAF50';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(
            this.selection.x,
            this.selection.y,
            this.selection.width,
            this.selection.height
        );

        // Draw resize handles
        this.drawHandles();
    }

    drawHandles() {
        const s = this.selection;
        const isMobile = 'ontouchstart' in window;
        const handleSize = isMobile ? this.TOUCH_HANDLE_SIZE : this.HANDLE_SIZE;

        const handles = [
            { x: s.x, y: s.y }, // nw
            { x: s.x + s.width / 2, y: s.y }, // n
            { x: s.x + s.width, y: s.y }, // ne
            { x: s.x + s.width, y: s.y + s.height / 2 }, // e
            { x: s.x + s.width, y: s.y + s.height }, // se
            { x: s.x + s.width / 2, y: s.y + s.height }, // s
            { x: s.x, y: s.y + s.height }, // sw
            { x: s.x, y: s.y + s.height / 2 } // w
        ];

        this.ctx.fillStyle = '#4CAF50';
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2;

        handles.forEach(handle => {
            this.ctx.beginPath();
            this.ctx.arc(handle.x, handle.y, handleSize / 2, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();
        });
    }

    async cropAndComplete() {
        // Create a temporary canvas for cropping
        const cropCanvas = document.createElement('canvas');
        const cropCtx = cropCanvas.getContext('2d');

        // Set canvas size to selection size (at original image scale)
        cropCanvas.width = this.selection.width / this.scale;
        cropCanvas.height = this.selection.height / this.scale;

        // Draw cropped portion
        cropCtx.drawImage(
            this.image,
            this.selection.x / this.scale,
            this.selection.y / this.scale,
            cropCanvas.width,
            cropCanvas.height,
            0,
            0,
            cropCanvas.width,
            cropCanvas.height
        );

        // Convert to blob
        cropCanvas.toBlob((blob) => {
            this.cleanup();
            this.onComplete(blob);
        }, this.imageBlob.type || 'image/png');
    }

    cleanup() {
        if (this.image && this.image.src) {
            URL.revokeObjectURL(this.image.src);
        }
    }
}
