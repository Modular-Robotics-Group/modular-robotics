const canvas = document.getElementById('canvas-grid');
const ctx = canvas.getContext('2d');

canvas.width = canvas.parentElement.clientWidth;
canvas.height = canvas.parentElement.clientHeight;

const rows = 5;
const cols = 5;
const cellWidth = canvas.width / cols;
const cellHeight = canvas.height / rows;

for (let i = 0; i < rows; i++) {
  for (let j = 0; j < cols; j++) {
    ctx.strokeStyle = '#000';
    ctx.strokeRect(j * cellWidth, i * cellHeight, cellWidth, cellHeight);
  }
}

canvas.addEventListener('click', (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const colIndex = Math.floor(x / cellWidth);
  const rowIndex = Math.floor(y / cellHeight);
  
  ctx.fillStyle = 'blue';
  ctx.fillRect(colIndex * cellWidth, rowIndex * cellHeight, cellWidth, cellHeight);
  ctx.strokeStyle = '#000';
  ctx.strokeRect(colIndex * cellWidth, rowIndex * cellHeight, cellWidth, cellHeight);
  
  window.dispatchEvent(new CustomEvent('gridCellSelected', { detail: { row: rowIndex, col: colIndex } }));
  
  if (typeof window.addModuleAtPosition === 'function') {
    let z_index = 0;
    window.addModuleAtPosition(colIndex, z_index, rowIndex);
  }
});
