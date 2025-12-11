const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

let flowers = [];
let selectedFlowerIndex = null;

let isDragging = false;
let isResizing = false;
let isRotating = false; 

let startX, startY;


const assets = {
    'allium':    { src: 'images/allium.png' },
    'carnation': { src: 'images/carnation.png' },
    'daffodil':  { src: 'images/daffodil.png' },
    'daisy':     { src: 'images/daisy.png' },
    'mimosa':    { src: 'images/mimosa.png' },
    'rose':      { src: 'images/rose.png' },
    'tulip':     { src: 'images/tulip.png' }
};


for (let key in assets) {
    const img = new Image();
    img.src = assets[key].src;
    assets[key].imgObject = img;
}

function dragStart(e, type) {
    e.dataTransfer.setData("flowerType", type);
}

function allowDrop(e) { e.preventDefault(); }

function drop(e) {
    e.preventDefault();
    const type = e.dataTransfer.getData("flowerType");
    const mouse = getMousePos(e);
    if (assets[type]) addFlowerAt(type, mouse.x, mouse.y);
}


function addFlowerAt(type, x, y) {
    const baseSize = 60;
    const newFlower = {
        type: type,
        x: x - baseSize / 2,
        y: y - baseSize / 2,
        width: baseSize,
        height: baseSize,
        angle: 0, 
        isSelected: true
    };
    flowers.forEach(f => f.isSelected = false);
    flowers.push(newFlower);
    selectedFlowerIndex = flowers.length - 1;
    draw();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    flowers.forEach((flower) => {
        const img = assets[flower.type].imgObject;

        if (img.complete) {
            ctx.save();
            const centerX = flower.x + flower.width / 2;
            const centerY = flower.y + flower.height / 2;
            ctx.translate(centerX, centerY);
            
            ctx.rotate(flower.angle * Math.PI / 180);
            
            ctx.drawImage(img, -flower.width / 2, -flower.height / 2, flower.width, flower.height);
            ctx.restore();
        }

        if (flower.isSelected) {
            drawSelectionUI(flower);
        }
    });
}

function drawSelectionUI(flower) {
    ctx.save();
    
    ctx.strokeStyle = "#FE6A86"; // Mor
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 3]);
    ctx.strokeRect(flower.x, flower.y, flower.width, flower.height);
    
    const handleSize = 10;
    ctx.fillStyle = "#FE6A86";
    ctx.setLineDash([]);
    ctx.fillRect(
        flower.x + flower.width - handleSize, 
        flower.y + flower.height - handleSize, 
        handleSize, handleSize
    );

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
        const centerX = f.x + f.width / 2;
        const topHandleY = f.y - 25;

        const distToRotate = Math.sqrt((mouse.x - centerX)**2 + (mouse.y - topHandleY)**2);
        if (distToRotate < 10) {
            isRotating = true;
            return;
        }

        const handleSize = 15;
        if (mouse.x >= f.x + f.width - handleSize && mouse.x <= f.x + f.width + handleSize &&
            mouse.y >= f.y + f.height - handleSize && mouse.y <= f.y + f.height + handleSize) {
            isResizing = true;
            return;
        }
    }

    let clickedIndex = null;
    for (let i = flowers.length - 1; i >= 0; i--) {
        const f = flowers[i];
        if (mouse.x >= f.x && mouse.x <= f.x + f.width &&
            mouse.y >= f.y && mouse.y <= f.y + f.height) {
            clickedIndex = i;
            break;
        }
    }

    if (clickedIndex !== null) {
        flowers.forEach(f => f.isSelected = false);
        flowers[clickedIndex].isSelected = true;
        selectedFlowerIndex = clickedIndex;
        
        isDragging = true;
        startX = mouse.x - flowers[clickedIndex].x;
        startY = mouse.y - flowers[clickedIndex].y;
        
        const item = flowers.splice(clickedIndex, 1)[0];
        flowers.push(item);
        selectedFlowerIndex = flowers.length - 1;
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
            draw();
            return;
        }

        if (isResizing) {
            f.width = Math.max(20, mouse.x - f.x);
            f.height = Math.max(20, mouse.y - f.y);
            draw();
            return;
        }

        if (isDragging) {
            f.x = mouse.x - startX;
            f.y = mouse.y - startY;
            draw();
            return;
        }

        const centerX = f.x + f.width / 2;
        const topHandleY = f.y - 25;
        const distToRotate = Math.sqrt((mouse.x - centerX)**2 + (mouse.y - topHandleY)**2);
        
        if (distToRotate < 10) {
            canvas.style.cursor = "grab"; // Veya "url('rotate-icon.png'), auto"
        } else if (mouse.x >= f.x + f.width - 15 && mouse.y >= f.y + f.height - 15) {
            canvas.style.cursor = "nwse-resize";
        } else if (mouse.x >= f.x && mouse.x <= f.x + f.width && mouse.y >= f.y && mouse.y <= f.y + f.height) {
            canvas.style.cursor = "move";
        } else {
            canvas.style.cursor = "default";
        }
    }
});

window.addEventListener('mouseup', () => {
    isDragging = false;
    isResizing = false;
    isRotating = false;
});

