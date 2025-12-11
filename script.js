const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

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
        const variantList = assets[flower.type].imgObjects;
        const img = variantList[flower.variant];
        
        if (img && img.complete) {
            ctx.save();

            ctx.shadowColor = 'rgba(0, 0, 0, 0.3)'; 
            ctx.shadowBlur = 15; 
            ctx.shadowOffsetX = 5; 
            ctx.shadowOffsetY = 5;

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
        if (flower.isSelected) {
            drawSelectionUI(flower);
        }
    });
}

function drawSelectionUI(flower) {
    ctx.save();
    const btnSize = 20; 

    ctx.strokeStyle = "#FE6A86"; 
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 3]);
    ctx.strokeRect(flower.x, flower.y, flower.width, flower.height);
    
    const handleSize = 10;
    ctx.fillStyle = "#FE6A86";
    ctx.setLineDash([]);
    ctx.fillRect(flower.x + flower.width - handleSize, flower.y + flower.height - handleSize, handleSize, handleSize);

    const centerX = flower.x + flower.width / 2;
    const topY = flower.y;
    const stemHeight = 25; 
    ctx.beginPath();
    ctx.moveTo(centerX, topY);
    ctx.lineTo(centerX, topY - stemHeight);
    ctx.strokeStyle = "#FE6A86";
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(centerX, topY - stemHeight, 6, 0, Math.PI * 2); 
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#FE6A86";
    ctx.fillRect(flower.x - btnSize/2, flower.y - btnSize/2, btnSize, btnSize);
    ctx.fillStyle = "#fff";
    ctx.font = "16px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("⇄", flower.x, flower.y); 

    const downX = flower.x - btnSize/2;
    const downY = flower.y + flower.height - btnSize/2;
    ctx.fillStyle = "#FE6A86";
    ctx.fillRect(downX, downY, btnSize, btnSize);
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo(downX + 5, downY + 8); 
    ctx.lineTo(downX + 15, downY + 8);
    ctx.lineTo(downX + 10, downY + 14);
    ctx.closePath();
    ctx.fill();

    const upX = flower.x + btnSize; 
    const upY = flower.y + flower.height - btnSize/2;
    ctx.fillStyle = "#FE6A86";
    ctx.fillRect(upX, upY, btnSize, btnSize);
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo(upX + 5, upY + 14); 
    ctx.lineTo(upX + 15, upY + 14);
    ctx.lineTo(upX + 10, upY + 6);
    ctx.closePath();
    ctx.fill();

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

        const centerX = f.x + f.width / 2;
        const topHandleY = f.y - 25;
        const distToRotate = Math.sqrt((mouse.x - centerX)**2 + (mouse.y - topHandleY)**2);
        if (distToRotate < 10) { isRotating = true; return; }

        // Resize
        const handleSize = 15;
        if (mouse.x >= f.x + f.width - handleSize && mouse.x <= f.x + f.width + handleSize && 
            mouse.y >= f.y + f.height - handleSize && mouse.y <= f.y + f.height + handleSize) { 
            isResizing = true; return; 
        }

        // Flip
        if (mouse.x >= f.x - btnSize/2 && mouse.x <= f.x + btnSize/2 && 
            mouse.y >= f.y - btnSize/2 && mouse.y <= f.y + btnSize/2) { 
            f.isMirrored = !f.isMirrored; draw(); return; 
        }

        // Layer Down
        if (mouse.x >= f.x - btnSize/2 && mouse.x <= f.x + btnSize/2 &&
            mouse.y >= f.y + f.height - btnSize/2 && mouse.y <= f.y + f.height + btnSize/2) {
            
            if (selectedFlowerIndex > 0) {
                const temp = flowers[selectedFlowerIndex - 1];
                flowers[selectedFlowerIndex - 1] = flowers[selectedFlowerIndex];
                flowers[selectedFlowerIndex] = temp;
                selectedFlowerIndex--; 
                draw();
            }
            return;
        }

        // Layer Up
        const upBtnX = f.x + btnSize * 1.5;
        if (mouse.x >= upBtnX - btnSize/2 && mouse.x <= upBtnX + btnSize/2 &&
            mouse.y >= f.y + f.height - btnSize/2 && mouse.y <= f.y + f.height + btnSize/2) {
            
            if (selectedFlowerIndex < flowers.length - 1) {
                const temp = flowers[selectedFlowerIndex + 1];
                flowers[selectedFlowerIndex + 1] = flowers[selectedFlowerIndex];
                flowers[selectedFlowerIndex] = temp;
                selectedFlowerIndex++;
                draw();
            }
            return;
        }
    }

    let clickedIndex = null;
    for (let i = flowers.length - 1; i >= 0; i--) {
        const f = flowers[i];
        if (mouse.x >= f.x && mouse.x <= f.x + f.width && 
            mouse.y >= f.y && mouse.y <= f.y + f.height) { 
            clickedIndex = i; break; 
        }
    }

    if (clickedIndex !== null) {
        flowers.forEach(f => f.isSelected = false);
        flowers[clickedIndex].isSelected = true;
        selectedFlowerIndex = clickedIndex;
        isDragging = true;
        startX = mouse.x - flowers[clickedIndex].x;
        startY = mouse.y - flowers[clickedIndex].y;
    } else {
        flowers.forEach(f => f.isSelected = false);
        selectedFlowerIndex = null;
    }
    
    draw();
});

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