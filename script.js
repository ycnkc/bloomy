const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const hitCanvas = document.createElement('canvas');
hitCanvas.width = 600;
hitCanvas.height = 600;
const hitCtx = hitCanvas.getContext('2d');

function isPixelVisible(flower, x, y) {
    hitCtx.clearRect(0, 0, hitCanvas.width, hitCanvas.height);
    hitCtx.save();

    const centerX = flower.x + flower.width / 2;
    const centerY = flower.y + flower.height / 2;
    hitCtx.translate(centerX, centerY);
    hitCtx.rotate(flower.angle * Math.PI / 180);
    if (flower.isMirrored) hitCtx.scale(-1, 1);

    if (flower.type === 'note') {
        if (flower.isOpen && noteAssets.open.complete) {
            const openScale = 1.5;
            hitCtx.drawImage(noteAssets.open, -flower.width/2 * openScale, -flower.height/2 * openScale, flower.width * openScale, flower.height * openScale);
        } else if (!flower.isOpen && noteAssets.closed.complete) {
            hitCtx.drawImage(noteAssets.closed, -flower.width / 2, -flower.height / 2, flower.width, flower.height);
        }
    } else {
        if (assets[flower.type]) {
            const img = assets[flower.type].imgObjects[flower.variant];
            if (img && img.complete) {
                hitCtx.drawImage(img, -flower.width / 2, -flower.height / 2, flower.width, flower.height);
            }
        }
    }
    hitCtx.restore();

    const pixelData = hitCtx.getImageData(x, y, 1, 1).data;
    
    return pixelData[3] > 0;
}

let flowers = [];
let selectedFlowerIndex = null;
let isDragging = false;
let isResizing = false;
let isRotating = false; 
let startX, startY;
let currentWrapperColor = 'pink';

const assets = {
    'allium':    { srcs: ['images/allium.png'] },
    'carnation': { srcs: ['images/carnation.png'] },
    'daffodil':  { srcs: ['images/daffodil.png'] },
    'daisy':     { srcs: ['images/daisy.png'] },
    'mimosa':    { srcs: ['images/mimosa.png'] },
    'rose':      { srcs: ['images/rose.png'] },
    'tulip':     { srcs: ['images/tulip.png'] }
};

for (let key in assets) {
    assets[key].imgObjects = [];
    assets[key].srcs.forEach(src => {
        const img = new Image();
        img.src = src;
        assets[key].imgObjects.push(img);
    });
}

const wrapperAssets = {
    'pink':   { inner: new Image(), outer: new Image() },
    'purple': { inner: new Image(), outer: new Image() },
    'blue':   { inner: new Image(), outer: new Image() },
    'green':  { inner: new Image(), outer: new Image() }
};

Object.keys(wrapperAssets).forEach(color => {
    wrapperAssets[color].inner.src = `images/wrapping-paper-inner-${color}.png`;
    wrapperAssets[color].outer.src = `images/wrapping-paper-outer-${color}.png`;
    
    wrapperAssets[color].inner.onload = () => draw();
});


const noteAssets = {
    open: new Image(),
    closed: new Image() 
};
noteAssets.open.src = 'images/note-card-open.png';
noteAssets.closed.src = 'images/note-card.png';

function openNoteModal() {
    document.getElementById('noteModal').style.display = 'flex';
    document.getElementById('noteInput').value = ''; 
    document.getElementById('noteInput').focus();
}

function closeNoteModal() {
    document.getElementById('noteModal').style.display = 'none';
}

function addNoteToCanvas() {
    const text = document.getElementById('noteInput').value;
    if (!text.trim()) return;

    const noteWidth = 100; 
    const ratio = noteAssets.closed.height / noteAssets.closed.width; 
    const noteHeight = noteWidth * (ratio || 0.7); 

    const newNote = {
        type: 'note',
        text: text,
        isOpen: false, 
        x: (canvas.width - noteWidth) / 2,
        y: (canvas.height - noteHeight) / 2,
        width: noteWidth,
        height: noteHeight,
        angle: 0,
        isMirrored: false,
        isSelected: true
    };

    flowers.forEach(f => f.isSelected = false);
    flowers.push(newNote); 
    selectedFlowerIndex = flowers.length - 1;
    
    closeNoteModal();
    draw();
}


function setWrapperColor(color) {
    currentWrapperColor = color;
    draw(); 
}


function dragStart(e, type) { e.dataTransfer.setData("flowerType", type); }
function allowDrop(e) { e.preventDefault(); }
function drop(e) {
    e.preventDefault();
    const type = e.dataTransfer.getData("flowerType");
    const mouse = getMousePos(e);
    if (assets[type]) addFlowerAt(type, mouse.x, mouse.y);
}

function addFlowerAt(type, x, y) {
    const variants = assets[type].imgObjects;
    const randomIndex = Math.floor(Math.random() * variants.length);
    const selectedImg = variants[randomIndex];
    
    const safeWidth = selectedImg ? (selectedImg.width || 32) : 32;
    const safeHeight = selectedImg ? (selectedImg.height || 32) : 32;

    const scale = 1; 
    const w = safeWidth * scale;
    const h = safeHeight * scale;

    const newFlower = {
        type: type,
        variant: randomIndex,
        x: x - w / 2,
        y: y - h / 2,
        width: w,
        height: h,
        angle: (Math.random() * 40) - 20, 
        isMirrored: false,
        isSelected: true
    };

    flowers.forEach(f => f.isSelected = false);
    flowers.push(newFlower); 
    selectedFlowerIndex = flowers.length - 1;
    draw();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const currentInner = wrapperAssets[currentWrapperColor].inner;
    const currentOuter = wrapperAssets[currentWrapperColor].outer;
    
    let wrapperProps = null;

    if (currentInner.complete && currentInner.naturalWidth > 0) {
        const targetHeight = canvas.height * 0.70; 
        const scale = targetHeight / currentInner.height;
        const w = currentInner.width * scale;
        const h = currentInner.height * scale;
        const x = (canvas.width - w) / 2;
        const y = canvas.height - h - 80; 
        
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)'; 
        ctx.shadowBlur = 15; 
        ctx.shadowOffsetX = 5; 
        ctx.shadowOffsetY = 5;

        wrapperProps = { x, y, w, h };
        ctx.drawImage(currentInner, x, y, w, h);
    }

    flowers.forEach((flower) => {
        if (flower.type === 'note') return; 

        const variantList = assets[flower.type].imgObjects;
        const img = variantList[flower.variant];
        
        if (img && img.complete) {
            ctx.save();
            
            ctx.shadowColor = 'rgba(0, 0, 0, 0.3)'; 
            ctx.shadowBlur = 15; ctx.shadowOffsetX = 5; ctx.shadowOffsetY = 5;

            const centerX = flower.x + flower.width / 2;
            const centerY = flower.y + flower.height / 2;
            ctx.translate(centerX, centerY);
            ctx.rotate(flower.angle * Math.PI / 180);
            if (flower.isMirrored) ctx.scale(-1, 1);

            ctx.drawImage(img, -flower.width / 2, -flower.height / 2, flower.width, flower.height);
            
            ctx.restore();
        }
    });

    if (currentOuter.complete && wrapperProps) {
        ctx.drawImage(currentOuter, wrapperProps.x, wrapperProps.y, wrapperProps.w, wrapperProps.h);
    }

    flowers.forEach((flower) => {
        if (flower.type !== 'note') return; 

        ctx.save();
        
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)'; 
        ctx.shadowBlur = 15; ctx.shadowOffsetX = 5; ctx.shadowOffsetY = 5;

        const centerX = flower.x + flower.width / 2;
        const centerY = flower.y + flower.height / 2;
        ctx.translate(centerX, centerY);
        ctx.rotate(flower.angle * Math.PI / 180);
        

        if (flower.isOpen) {
    
            if (noteAssets.open.complete) {
                const openScale = 1.5; 
                ctx.drawImage(noteAssets.open, -flower.width/2 * openScale, -flower.height/2 * openScale, flower.width * openScale, flower.height * openScale);
                
                ctx.shadowColor = "transparent";
                ctx.fillStyle = "#5c4033"; 
                ctx.font = "14px 'Pixelify Sans', sans-serif"; 
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                
                printAtWordWrap(ctx, flower.text, 0, -10, 18, 100 * openScale);
            }
        } else {
            
            if (noteAssets.closed.complete) {
                ctx.drawImage(noteAssets.closed, -flower.width / 2, -flower.height / 2, flower.width, flower.height);
            }
        }

        ctx.restore();
    });

    flowers.forEach((flower) => {
        if (flower.isSelected) {
            drawSelectionUI(flower);
        }
    });
}


function drawSelectionUI(flower) {
    ctx.save();
    const btnSize = 20; 

    const displayScale = (flower.type === 'note' && flower.isOpen) ? 1.5 : 1;
    const drawX = flower.x - (flower.width * (displayScale - 1)) / 2;
    const drawY = flower.y - (flower.height * (displayScale - 1)) / 2;
    const drawW = flower.width * displayScale;
    const drawH = flower.height * displayScale;

    ctx.strokeStyle = "#FE6A86"; 
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 3]);
    ctx.strokeRect(drawX, drawY, drawW, drawH);
    
    ctx.setLineDash([]);
    ctx.font = "16px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillStyle = "#FE6A86";
    ctx.fillRect(drawX - btnSize/2, drawY - btnSize/2, btnSize, btnSize);
    ctx.fillStyle = "#fff";
    
    if (flower.type === 'note') {
        ctx.fillText(flower.isOpen ? "✖" : "✉", drawX, drawY); 
    } else {
        ctx.fillText("⇄", drawX, drawY);
    }

    ctx.fillStyle = "#FE6A86";
    ctx.fillRect(drawX + drawW - 10, drawY + drawH - 10, 10, 10);

    const centerX = drawX + drawW / 2;
    ctx.beginPath();
    ctx.moveTo(centerX, drawY);
    ctx.lineTo(centerX, drawY - 25);
    ctx.strokeStyle = "#FE6A86";
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(centerX, drawY - 25, 6, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.stroke();

    const downX = drawX - btnSize/2;
    const downY = drawY + drawH - btnSize/2;
    ctx.fillStyle = "#FE6A86";
    ctx.fillRect(downX, downY, btnSize, btnSize);
    ctx.fillStyle = "#fff";
    ctx.fillText("▼", downX + btnSize/2, downY + btnSize/2); 

    const upX = drawX + btnSize * 1.5; 
    const upY = drawY + drawH - btnSize/2;
    ctx.fillStyle = "#FE6A86";
    ctx.fillRect(upX, upY, btnSize, btnSize);
    ctx.fillStyle = "#fff";
    ctx.fillText("▲", upX + btnSize/2, upY + btnSize/2); 

    ctx.restore();
}

function clearCanvas() {
    flowers = [];
    selectedFlowerIndex = null;
    draw();
}

function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}


window.addEventListener('keydown', (e) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedFlowerIndex !== null) {
            flowers.splice(selectedFlowerIndex, 1);
            selectedFlowerIndex = null;
            draw();
        }
    }
});

canvas.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return; 
    const mouse = getMousePos(e);
    
    if (selectedFlowerIndex !== null) {
        const f = flowers[selectedFlowerIndex];
        const btnSize = 20;
        
        const displayScale = (f.type === 'note' && f.isOpen) ? 1.5 : 1;
        const drawX = f.x - (f.width * (displayScale - 1)) / 2;
        const drawY = f.y - (f.height * (displayScale - 1)) / 2;
        const drawW = f.width * displayScale;
        const drawH = f.height * displayScale;

        const centerX = drawX + drawW / 2;
        const topHandleY = drawY - 25;
        if (Math.sqrt((mouse.x - centerX)**2 + (mouse.y - topHandleY)**2) < 10) { 
            isRotating = true; return; 
        }

        if (mouse.x >= drawX + drawW - 15 && mouse.x <= drawX + drawW + 15 && 
            mouse.y >= drawY + drawH - 15 && mouse.y <= drawY + drawH + 15) { 
            isResizing = true; return; 
        }

        if (mouse.x >= drawX - btnSize/2 && mouse.x <= drawX + btnSize/2 && 
            mouse.y >= drawY - btnSize/2 && mouse.y <= drawY + btnSize/2) { 
            
            if (f.type === 'note') {
                f.isOpen = !f.isOpen; 
            } else {
                f.isMirrored = !f.isMirrored; 
            }
            draw(); return; 
        }

        if (mouse.x >= drawX - btnSize/2 && mouse.x <= drawX + btnSize/2 &&
            mouse.y >= drawY + drawH - btnSize/2 && mouse.y <= drawY + drawH + btnSize/2) {
             if (selectedFlowerIndex > 0) {
                const temp = flowers[selectedFlowerIndex - 1];
                flowers[selectedFlowerIndex - 1] = flowers[selectedFlowerIndex];
                flowers[selectedFlowerIndex] = temp;
                selectedFlowerIndex--; 
                draw();
            }
            return;
        }

    }

    let clickedIndex = null;
    
    for (let i = flowers.length - 1; i >= 0; i--) {
        const f = flowers[i];
        
        const displayScale = (f.type === 'note' && f.isOpen) ? 1.5 : 1;
        
        const drawW = f.width * displayScale;
        const drawH = f.height * displayScale;
        const drawX = f.x - (f.width * (displayScale - 1)) / 2;
        const drawY = f.y - (f.height * (displayScale - 1)) / 2;

        if (mouse.x >= drawX && mouse.x <= drawX + drawW && 
            mouse.y >= drawY && mouse.y <= drawY + drawH) { 
            
            if (isPixelVisible(f, mouse.x, mouse.y)) {
                clickedIndex = i; 
                break; 
            }
        }
    }

    if (clickedIndex !== null) {
        flowers.forEach(f => f.isSelected = false);
        const selectedItem = flowers[clickedIndex];
        
        flowers.splice(clickedIndex, 1);
        flowers.push(selectedItem);
        
        selectedFlowerIndex = flowers.length - 1;
        flowers[selectedFlowerIndex].isSelected = true;

        isDragging = true;
        
        startX = mouse.x - flowers[selectedFlowerIndex].x;
        startY = mouse.y - flowers[selectedFlowerIndex].y;
    } else {
        flowers.forEach(f => f.isSelected = false);
        selectedFlowerIndex = null;
    }
    
    draw();
});

function downloadCanvas() {
   // download 
}

canvas.addEventListener('mousemove', (e) => {
    const mouse = getMousePos(e);
    if (selectedFlowerIndex !== null) {
        const f = flowers[selectedFlowerIndex];
        
        if (isRotating) {
            const centerX = f.x + f.width / 2;
            const centerY = f.y + f.height / 2;
            const radians = Math.atan2(mouse.y - centerY, mouse.x - centerX);
            const angle = radians * (180 / Math.PI) + 90;
            f.angle = angle;
            draw(); return;
        }
        if (isResizing) {
            f.width = Math.max(20, mouse.x - f.x);
            f.height = Math.max(20, mouse.y - f.y);
            draw(); return;
        }
        if (isDragging) {
            f.x = mouse.x - startX;
            f.y = mouse.y - startY;
            draw(); return;
        }

        const centerX = f.x + f.width / 2;
        const topHandleY = f.y - 25;
        const distToRotate = Math.sqrt((mouse.x - centerX)**2 + (mouse.y - topHandleY)**2);
        const btnSize = 20;

        if (distToRotate < 10) { canvas.style.cursor = "grab"; } 
        else if (mouse.x >= f.x + f.width - 15 && mouse.y >= f.y + f.height - 15) { canvas.style.cursor = "nwse-resize"; } 
        else if (mouse.x >= f.x - btnSize/2 && mouse.x <= f.x + btnSize/2 && mouse.y >= f.y - btnSize/2 && mouse.y <= f.y + btnSize/2) { canvas.style.cursor = "pointer"; } 
        else if (mouse.x >= f.x - btnSize/2 && mouse.x <= f.x + btnSize/2 && mouse.y >= f.y + f.height - btnSize/2 && mouse.y <= f.y + f.height + btnSize/2) { canvas.style.cursor = "pointer"; }
        else if (mouse.x >= f.x + btnSize && mouse.x <= f.x + btnSize*2 && mouse.y >= f.y + f.height - btnSize/2 && mouse.y <= f.y + f.height + btnSize/2) { canvas.style.cursor = "pointer"; }
        else if (mouse.x >= f.x && mouse.x <= f.x + f.width && mouse.y >= f.y && mouse.y <= f.y + f.height) { canvas.style.cursor = "move"; } 
        else { canvas.style.cursor = "default"; }
    }
});

window.addEventListener('mouseup', () => { isDragging = false; isResizing = false; isRotating = false; });

function printAtWordWrap(context, text, x, y, lineHeight, fitWidth) {
    fitWidth = fitWidth || 0;
    
    if (fitWidth <= 0) {
        context.fillText(text, x, y);
        return;
    }
    
    var words = text.split(' ');
    var currentLine = 0;
    var idx = 1;
    while (words.length > 0 && idx <= words.length) {
        var str = words.slice(0, idx).join(' ');
        var w = context.measureText(str).width;
        if (w > fitWidth) {
            if (idx == 1) {
                idx = 2;
            }
            context.fillText(words.slice(0, idx - 1).join(' '), x, y + (lineHeight * currentLine));
            currentLine++;
            words = words.splice(idx - 1);
            idx = 1;
        } else {
            idx++;
        }
    }
    if (idx > 0)
        context.fillText(words.join(' '), x, y + (lineHeight * currentLine));
}