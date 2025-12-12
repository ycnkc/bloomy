// config
const CONFIG = {
    canvas: { width: 600, height: 600 },
    colors: {
        selection: "#FE6A86",
        text: "#5c4033",
        shadow: 'rgba(0, 0, 0, 0.3)'
    },
    ui: {
        btnSize: 20,
        handleOffset: 25,
        rotateTriggerDist: 10,
        resizeTriggerDist: 15
    },
    paths: {
        flowers: {
            'allium': ['images/allium.png'],
            'allium-white': ['images/allium-white.png'],
            'carnation': ['images/carnation.png'],
            'carnation-red': ['images/carnation-red.png'],
            'daffodil': ['images/daffodil.png'],
            'daffodil-pink': ['images/daffodil-pink.png'],
            'daisy': ['images/daisy.png'],
            'daisy-pink': ['images/daisy-pink.png'],
            'mimosa': ['images/mimosa.png'],
            'mimosa-red': ['images/mimosa-red.png'],
            'rose': ['images/rose.png'],
            'rose-white': ['images/rose-white.png'],
            'tulip': ['images/tulip.png'],
            'tulip-yellow': ['images/tulip-yellow.png']


        },
        wrappers: ['pink', 'purple', 'blue', 'green'],
        note: {
            open: 'images/note-card-open.png',
            closed: 'images/note-card.png'
        }
    }
};

//utils
const Utils = {
    getMousePos(canvas, evt) {
        const rect = canvas.getBoundingClientRect();
        return { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
    },

    printAtWordWrap(context, text, x, y, lineHeight, fitWidth) {
        if (!fitWidth || fitWidth <= 0) {
            context.fillText(text, x, y);
            return;
        }
        let words = text.split(' ');
        let currentLine = 0;
        let idx = 1;
        while (words.length > 0 && idx <= words.length) {
            let str = words.slice(0, idx).join(' ');
            let w = context.measureText(str).width;
            if (w > fitWidth) {
                if (idx === 1) idx = 2;
                context.fillText(words.slice(0, idx - 1).join(' '), x, y + (lineHeight * currentLine));
                currentLine++;
                words = words.slice(idx - 1);
                idx = 1;
            } else {
                idx++;
            }
        }
        if (idx > 0) context.fillText(words.join(' '), x, y + (lineHeight * currentLine));
    }
};

//main app
class BouquetApp {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;

        this.hitCanvas = document.createElement('canvas');
        this.hitCanvas.width = CONFIG.canvas.width;
        this.hitCanvas.height = CONFIG.canvas.height;
        this.hitCtx = this.hitCanvas.getContext('2d');

        this.items = []; 
        this.selectedIndex = null;
        this.currentWrapperColor = 'pink';

        this.isViewMode = false;
        
        this.dragState = {
            active: false,
            resizing: false,
            rotating: false,
            startX: 0,
            startY: 0
        };

        this.assets = { flowers: {}, wrappers: {}, notes: {} };
        this.loadAssets().then(() => this.draw());

        this.bindEvents();

        this.loadFromURL();
    }

    //assets
    async loadAssets() {
        for (let [key, srcs] of Object.entries(CONFIG.paths.flowers)) {
            this.assets.flowers[key] = srcs.map(src => this.loadImage(src));
        }

        CONFIG.paths.wrappers.forEach(color => {
            this.assets.wrappers[color] = {
                inner: this.loadImage(`images/wrapping-paper-inner-${color}.png`, true),
                outer: this.loadImage(`images/wrapping-paper-outer-${color}.png`)
            };
        });

        this.assets.notes = {
            open: this.loadImage(CONFIG.paths.note.open),
            closed: this.loadImage(CONFIG.paths.note.closed)
        };
    }

    loadImage(src, shouldRedraw = false) {
        const img = new Image();
        img.src = src;
        if (shouldRedraw) {
            img.onload = () => this.draw();
        }
        return img;
    }

    
    //item management
    addItem(type, x, y) {
        if (type === 'note') {
            const text = document.getElementById('noteInput').value;
            if (!text.trim()) return;
            
            const noteWidth = 100;
            const ratio = this.assets.notes.closed.height / this.assets.notes.closed.width;
            const noteHeight = noteWidth * (ratio || 0.7);

            this.items.forEach(i => i.isSelected = false);
            this.items.push({
                type: 'note',
                text: text,
                isOpen: false,
                x: (this.canvas.width - noteWidth) / 2,
                y: (this.canvas.height - noteHeight) / 2,
                width: noteWidth, height: noteHeight,
                angle: 0, isMirrored: false, isSelected: true
            });
            this.selectedIndex = this.items.length - 1;
            closeNoteModal();
        } 

        else if (this.assets.flowers[type]) {
            const variants = this.assets.flowers[type];
            const variantIdx = Math.floor(Math.random() * variants.length);
            const img = variants[variantIdx];

            const w = img.width || 32;
            const h = img.height || 32;

            this.items.forEach(i => i.isSelected = false);
            this.items.push({
                type: type,
                variant: variantIdx,
                x: x - w / 2,
                y: y - h / 2,
                width: w, height: h,
                angle: (Math.random() * 40) - 20,
                isMirrored: false, isSelected: true
            });
            this.selectedIndex = this.items.length - 1;
        }
        this.draw();
    }

    setWrapper(color) {
        this.currentWrapperColor = color;
        this.draw();
    }

    deleteSelectedItem() {
        if (this.selectedIndex !== null) {
            this.items.splice(this.selectedIndex, 1);
            this.selectedIndex = null;
            this.draw();
        }
    }

    // hit detection
    isPixelVisible(item, x, y) {
        const hCtx = this.hitCtx;
        hCtx.clearRect(0, 0, this.hitCanvas.width, this.hitCanvas.height);
        hCtx.save();

        const cx = item.x + item.width / 2;
        const cy = item.y + item.height / 2;
        hCtx.translate(cx, cy);
        hCtx.rotate(item.angle * Math.PI / 180);
        if (item.isMirrored) hCtx.scale(-1, 1);

        if (item.type === 'note') {
            const asset = item.isOpen ? this.assets.notes.open : this.assets.notes.closed;
            if (asset && asset.complete) {
                const scale = (item.isOpen) ? 1.5 : 1;
                hCtx.drawImage(asset, -item.width/2 * scale, -item.height/2 * scale, item.width * scale, item.height * scale);
            }
        } else {
            const img = this.assets.flowers[item.type]?.[item.variant];
            if (img && img.complete) {
                hCtx.drawImage(img, -item.width / 2, -item.height / 2, item.width, item.height);
            }
        }
        hCtx.restore();

        return hCtx.getImageData(x, y, 1, 1).data[3] > 0;
    }

    //events
    bindEvents() {
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            this.handleInputStart(e.clientX, e.clientY);
        });

        window.addEventListener('mousemove', (e) => {
            this.handleInputMove(e.clientX, e.clientY);
        });

        window.addEventListener('mouseup', () => {
            this.handleInputEnd();
        });

        this.canvas.addEventListener('touchstart', (e) => {
            if(e.cancelable) e.preventDefault(); 
            const touch = e.touches[0];
            this.handleInputStart(touch.clientX, touch.clientY);
        }, { passive: false });

        this.canvas.addEventListener('touchmove', (e) => {
            if(e.cancelable) e.preventDefault();
            const touch = e.touches[0];
            this.handleInputMove(touch.clientX, touch.clientY);
        }, { passive: false });

        window.addEventListener('touchend', () => {
            this.handleInputEnd();
        });

        window.addEventListener('keydown', (e) => {
            if (this.isViewMode) return;
            if (e.key === 'Delete' || e.key === 'Backspace') this.deleteSelectedItem();
        });
    }

    
    getScaledPos(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        return { 
            x: (clientX - rect.left) * scaleX, 
            y: (clientY - rect.top) * scaleY 
        };
    }

    handleInputStart(clientX, clientY) {
        const m = this.getScaledPos(clientX, clientY);

        if (this.isViewMode) {
            for (let i = this.items.length - 1; i >= 0; i--) {
                const item = this.items[i];
                if (item.type === 'note') {
                    const scale = item.isOpen ? 1.5 : 1;
                    const drawX = item.x - (item.width * (scale - 1)) / 2;
                    const drawY = item.y - (item.height * (scale - 1)) / 2;
                    const drawW = item.width * scale;
                    const drawH = item.height * scale;

                    if (m.x >= drawX && m.x <= drawX + drawW &&
                        m.y >= drawY && m.y <= drawY + drawH) {
                        if (this.isPixelVisible(item, m.x, m.y)) {
                            item.isOpen = !item.isOpen;
                            this.draw();
                            return;
                        }
                    }
                }
            }
            return;
        }

        if (this.selectedIndex !== null) {
            if (this.handleUIInteraction(m)) return;
        }

        this.handleSelection(m);
        this.draw();
    }

    handleInputMove(clientX, clientY) {
        const m = this.getScaledPos(clientX, clientY);

        if (this.isViewMode) {
            let hoveringNote = false;
            for (let item of this.items) {
                if (item.type === 'note') {
                     if (m.x > item.x - 20 && m.x < item.x + item.width + 20 && 
                         m.y > item.y - 20 && m.y < item.y + item.height + 20) {
                         hoveringNote = true;
                     }
                }
            }
            this.canvas.style.cursor = hoveringNote ? "pointer" : "default";
            return;
        }

        this.updateCursor(m);

        if (this.selectedIndex === null) return;
        const item = this.items[this.selectedIndex];

        if (this.dragState.rotating) {
            const cx = item.x + item.width / 2;
            const cy = item.y + item.height / 2;
            const rad = Math.atan2(m.y - cy, m.x - cx);
            item.angle = rad * (180 / Math.PI) + 90;
            this.draw();
        } else if (this.dragState.resizing) {
            item.width = Math.max(20, m.x - item.x);
            item.height = Math.max(20, m.y - item.y);
            this.draw();
        } else if (this.dragState.active) {
            item.x = m.x - this.dragState.startX;
            item.y = m.y - this.dragState.startY;
            this.draw();
        }
    }

    handleInputEnd() {
        this.dragState = { active: false, resizing: false, rotating: false, startX: 0, startY: 0 };
    }

    handleUIInteraction(mouse) {
        const item = this.items[this.selectedIndex];
        const btn = CONFIG.ui.btnSize;
        
        const scale = (item.type === 'note' && item.isOpen) ? 1.5 : 1;
        const drawX = item.x - (item.width * (scale - 1)) / 2;
        const drawY = item.y - (item.height * (scale - 1)) / 2;
        const drawW = item.width * scale;
        const drawH = item.height * scale;

        //rotate
        const cx = drawX + drawW / 2;
        const topY = drawY - CONFIG.ui.handleOffset;
        if (Math.sqrt((mouse.x - cx)**2 + (mouse.y - topY)**2) < CONFIG.ui.rotateTriggerDist) {
            this.dragState.rotating = true;
            return true;
        }

        //resize
        if (mouse.x >= drawX + drawW - 15 && mouse.x <= drawX + drawW + 15 &&
            mouse.y >= drawY + drawH - 15 && mouse.y <= drawY + drawH + 15) {
            this.dragState.resizing = true;
            return true;
        }

        //mirror/open
        if (mouse.x >= drawX - btn/2 && mouse.x <= drawX + btn/2 &&
            mouse.y >= drawY - btn/2 && mouse.y <= drawY + btn/2) {
            if (item.type === 'note') item.isOpen = !item.isOpen;
            else item.isMirrored = !item.isMirrored;
            this.draw();
            return true;
        }

        // layer change
        // send back
        if (mouse.x >= drawX - btn/2 && mouse.x <= drawX + btn/2 &&
            mouse.y >= drawY + drawH - btn/2 && mouse.y <= drawY + drawH + btn/2) {
            if (this.selectedIndex > 0) {
                // swap
                [this.items[this.selectedIndex], this.items[this.selectedIndex - 1]] = 
                [this.items[this.selectedIndex - 1], this.items[this.selectedIndex]];
                this.selectedIndex--;
                this.draw();
            }
            return true;
        }
        // send front
        const upX = drawX + btn * 1.5;
        if (mouse.x >= upX && mouse.x <= upX + btn && // Basit kontrol
            mouse.y >= drawY + drawH - btn/2 && mouse.y <= drawY + drawH + btn/2) {
            return true; 
        }

        return false;
    }

    handleSelection(mouse) {
        let clickedIndex = null;
        
        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            const scale = (item.type === 'note' && item.isOpen) ? 1.5 : 1;
            const drawX = item.x - (item.width * (scale - 1)) / 2;
            const drawY = item.y - (item.height * (scale - 1)) / 2;
            const drawW = item.width * scale;
            const drawH = item.height * scale;

            if (mouse.x >= drawX && mouse.x <= drawX + drawW &&
                mouse.y >= drawY && mouse.y <= drawY + drawH) {
                if (this.isPixelVisible(item, mouse.x, mouse.y)) {
                    clickedIndex = i;
                    break;
                }
            }
        }

        this.items.forEach(i => i.isSelected = false);
        
        if (clickedIndex !== null) {
            const item = this.items.splice(clickedIndex, 1)[0];
            this.items.push(item);
            this.selectedIndex = this.items.length - 1;
            item.isSelected = true;

            this.dragState.active = true;
            this.dragState.startX = mouse.x - item.x;
            this.dragState.startY = mouse.y - item.y;
        } else {
            this.selectedIndex = null;
        }
    }

    updateCursor(mouse) {
        if (this.selectedIndex === null) {
            this.canvas.style.cursor = "default";
            return;
        }
        
        const item = this.items[this.selectedIndex];
        const cx = item.x + item.width / 2;
        const topY = item.y - 25;
        const btn = CONFIG.ui.btnSize;
        
        const distRotate = Math.sqrt((mouse.x - cx)**2 + (mouse.y - topY)**2);

        if (distRotate < 10) this.canvas.style.cursor = "grab";
        else if (mouse.x >= item.x + item.width - 15 && mouse.y >= item.y + item.height - 15) this.canvas.style.cursor = "nwse-resize";
        else if (mouse.x >= item.x && mouse.x <= item.x + item.width && mouse.y >= item.y && mouse.y <= item.y + item.height) this.canvas.style.cursor = "move";
        else this.canvas.style.cursor = "default";
    }

    //rendering
    draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 1st Background
        const wrapper = this.assets.wrappers[this.currentWrapperColor];
        let wrapperRect = null;
        
        if (wrapper.inner.complete && wrapper.inner.naturalWidth > 0) {
            const targetH = this.canvas.height * 0.70;
            const scale = targetH / wrapper.inner.height;
            const w = wrapper.inner.width * scale;
            const h = wrapper.inner.height * scale;
            const x = (this.canvas.width - w) / 2;
            const y = this.canvas.height - h - 80;

            this.setShadows(true);
            wrapperRect = { x, y, w, h };
            ctx.drawImage(wrapper.inner, x, y, w, h);
        }

        // 2nd Flowers
        this.items.forEach(item => {
            if (item.type !== 'note') this.drawItem(item);
        });

        // 3rd Outer Wrapper
        if (wrapper.outer.complete && wrapperRect) {
            ctx.drawImage(wrapper.outer, wrapperRect.x, wrapperRect.y, wrapperRect.w, wrapperRect.h);
        }

        // 4th Notes
        this.items.forEach(item => {
            if (item.type === 'note') this.drawItem(item);
        });

        // 5th Selection UI
        if (!this.isViewMode) {
        const selected = (this.selectedIndex !== null) ? this.items[this.selectedIndex] : null;
        if (selected && selected.isSelected) {
            this.drawSelectionUI(selected);
        }
    }
    }

    drawItem(item) {
        const ctx = this.ctx;
        ctx.save();
        this.setShadows(true);

        const cx = item.x + item.width / 2;
        const cy = item.y + item.height / 2;
        ctx.translate(cx, cy);
        ctx.rotate(item.angle * Math.PI / 180);
        if (item.isMirrored) ctx.scale(-1, 1);

        if (item.type === 'note') {
            this.drawNoteContent(item);
        } else {
            const img = this.assets.flowers[item.type]?.[item.variant];
            if (img && img.complete) {
                ctx.drawImage(img, -item.width / 2, -item.height / 2, item.width, item.height);
            }
        }
        ctx.restore();
    }

    drawNoteContent(item) {
        const ctx = this.ctx;
        if (item.isOpen && this.assets.notes.open.complete) {
            const s = 1.5;
            ctx.drawImage(this.assets.notes.open, -item.width/2*s, -item.height/2*s, item.width*s, item.height*s);
            
            ctx.shadowColor = "transparent";
            ctx.fillStyle = CONFIG.colors.text;
            ctx.font = "14px 'Pixelify Sans', sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            Utils.printAtWordWrap(ctx, item.text, 0, -10, 18, 100 * s);
        } else if (!item.isOpen && this.assets.notes.closed.complete) {
            ctx.drawImage(this.assets.notes.closed, -item.width/2, -item.height/2, item.width, item.height);
        }
    }

    setShadows(active) {
        if (active) {
            this.ctx.shadowColor = CONFIG.colors.shadow;
            this.ctx.shadowBlur = 15;
            this.ctx.shadowOffsetX = 5;
            this.ctx.shadowOffsetY = 5;
        } else {
            this.ctx.shadowColor = 'transparent';
        }
    }

    drawSelectionUI(item) {
        const ctx = this.ctx;
        ctx.save();
        const btn = CONFIG.ui.btnSize;
        
        const scale = (item.type === 'note' && item.isOpen) ? 1.5 : 1;
        const x = item.x - (item.width * (scale - 1)) / 2;
        const y = item.y - (item.height * (scale - 1)) / 2;
        const w = item.width * scale;
        const h = item.height * scale;

        // outer rect
        ctx.strokeStyle = CONFIG.colors.selection;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        ctx.strokeRect(x, y, w, h);
        
        // reset
        ctx.setLineDash([]);
        ctx.font = "16px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // mirror/open button
        this.drawUIButton(x - btn/2, y - btn/2, item.type === 'note' ? (item.isOpen ? "✖" : "✉") : "⇄");

        // resize handle
        ctx.fillStyle = CONFIG.colors.selection;
        ctx.fillRect(x + w - 10, y + h - 10, 10, 10);

        // rotate handle
        const cx = x + w / 2;
        ctx.beginPath();
        ctx.moveTo(cx, y);
        ctx.lineTo(cx, y - 25);
        ctx.strokeStyle = CONFIG.colors.selection;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, y - 25, 6, 0, Math.PI * 2);
        ctx.fillStyle = "#fff";
        ctx.fill();
        ctx.stroke();

        // layer down
        this.drawUIButton(x - btn/2, y + h - btn/2, "▼");

        // layer up
        this.drawUIButton(x + btn * 1.5, y + h - btn/2, "▲");

        ctx.restore();
    }

    drawUIButton(x, y, text) {
        const s = CONFIG.ui.btnSize;
        this.ctx.fillStyle = CONFIG.colors.selection;
        this.ctx.fillRect(x, y, s, s);
        this.ctx.fillStyle = "#fff";
        this.ctx.fillText(text, x + s/2, y + s/2);
    }

    generateShareLink() {
        const state = {
            items: this.items,
            wrapper: this.currentWrapperColor
        };

        try {
            const jsonString = JSON.stringify(state);
            const encodedData = btoa(encodeURIComponent(jsonString));
            
            const url = `${window.location.origin}${window.location.pathname}?data=${encodedData}`;
            
            navigator.clipboard.writeText(url).then(() => {
                this.showToast("Copied to clipboard <3");
            });
            
            console.log("Generated Link:", url); 
            return url;

        } catch (e) {
            console.error("Error generating link:", e);
            alert("Too many flowers, link could not be generated.");
        }
    }

    showToast(message) {
        const toast = document.createElement("div");
        toast.textContent = message;
        toast.className = "custom-toast"; 
        
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add("hide"); 
            toast.addEventListener("transitionend", () => {
                toast.remove();
            });
        }, 3000);
    }

    loadFromURL() {
        const params = new URLSearchParams(window.location.search);
        const encodedData = params.get('data');

        if (encodedData) {
            try {
                const jsonString = decodeURIComponent(atob(encodedData));
                const state = JSON.parse(jsonString);

                if (state.items) this.items = state.items;
                if (state.wrapper) this.currentWrapperColor = state.wrapper;

                this.isViewMode = true;
                document.body.classList.add('view-mode');

                setTimeout(() => this.draw(), 500); 

            } catch (e) {
                console.error("Link corrupted:", e);
            }
        }
    }
}


//init app
const app = new BouquetApp();

function setWrapperColor(color) {
    app.setWrapper(color);
}

function openNoteModal() {
    document.getElementById('noteModal').style.display = 'flex';
    document.getElementById('noteInput').value = '';
    document.getElementById('noteInput').focus();
}

function closeNoteModal() {
    document.getElementById('noteModal').style.display = 'none';
}

function addNoteToCanvas() {
    app.addItem('note');
}

function clearCanvas() {
    app.items = [];
    app.selectedIndex = null;
    app.draw();
}

// drag and drop
function dragStart(e, type) { 
    e.dataTransfer.setData("flowerType", type); 
}
function allowDrop(e) { 
    e.preventDefault(); 
}
function drop(e) {
    e.preventDefault();
    const type = e.dataTransfer.getData("flowerType");
    const mouse = Utils.getMousePos(app.canvas, e);
    app.addItem(type, mouse.x, mouse.y);
}

function shareBouquet() {
    app.generateShareLink();
}

// mobile drag and drop
function initMobileDragDrop() {
    const flowerItems = document.querySelectorAll('.flower-item');
    const canvas = document.getElementById('canvas');
    let activeGhost = null;
    let activeType = null;

    flowerItems.forEach(item => {
        item.addEventListener('touchstart', handleTouchStart, { passive: false });
        item.addEventListener('touchmove', handleTouchMove, { passive: false });
        item.addEventListener('touchend', handleTouchEnd);
    });

    function handleTouchStart(e) {
        const dragAttr = this.getAttribute('ondragstart');
        const match = dragAttr.match(/'([^']+)'/);
        
        if (match && match[1]) {
            activeType = match[1];
            
            const img = this.querySelector('img');
            activeGhost = img.cloneNode(true);
            activeGhost.style.position = 'fixed';
            activeGhost.style.width = '60px'; 
            activeGhost.style.height = '60px';
            activeGhost.style.opacity = '0.8';
            activeGhost.style.pointerEvents = 'none'; 
            activeGhost.style.zIndex = '9999';
            activeGhost.style.transition = 'none';
            
            const touch = e.touches[0];
            activeGhost.style.left = (touch.clientX - 30) + 'px';
            activeGhost.style.top = (touch.clientY - 30) + 'px';
            
            document.body.appendChild(activeGhost);
        }
    }

    function handleTouchMove(e) {
        if (!activeGhost) return;
        
        const touch = e.touches[0];
        const targetElement = document.elementFromPoint(touch.clientX, touch.clientY);

        if (targetElement === canvas || canvas.contains(targetElement)) {
            e.preventDefault(); 
        }

        activeGhost.style.left = (touch.clientX - 30) + 'px';
        activeGhost.style.top = (touch.clientY - 30) + 'px';
    }

    function handleTouchEnd(e) {
        if (!activeGhost) return;

        const touch = e.changedTouches[0];
        const dropTarget = document.elementFromPoint(touch.clientX, touch.clientY);

        if (dropTarget === canvas) {
            const rect = canvas.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;

            app.addItem(activeType, x, y);
        }

        if (activeGhost) activeGhost.remove();
        activeGhost = null;
        activeType = null;
    }
}

initMobileDragDrop();