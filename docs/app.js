/* Tab navigation */
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.add('hidden'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.remove('hidden');
  });
});

/* Drop zone */
const dropZone = document.getElementById('drop-zone');
const photoInput = document.getElementById('photo-input');
const dropContent = document.getElementById('drop-content');
const previewImg = document.getElementById('preview-img');
let selectedFile = null;

function showPreview(file) {
  selectedFile = file;
  previewImg.src = URL.createObjectURL(file);
  previewImg.classList.remove('hidden');
  dropContent.classList.add('hidden');
}

photoInput.addEventListener('change', e => {
  if (e.target.files[0]) showPreview(e.target.files[0]);
});

dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) showPreview(file);
});
dropZone.addEventListener('click', e => {
  if (e.target !== photoInput && !e.target.closest('button')) photoInput.click();
});

/* Form submit — demo mode notice */
const form = document.getElementById('generate-form');
const errorPanel = document.getElementById('error-panel');
const resultPanel = document.getElementById('result-panel');

form.addEventListener('submit', e => {
  e.preventDefault();
  resultPanel.classList.add('hidden');
  errorPanel.innerHTML = `
    <div class="error-box" style="background:rgba(0,163,224,.1);border-color:rgba(0,163,224,.4);color:#00a3e0">
      ⚡ <strong>Demo mode</strong> — this UI is a preview hosted on GitHub Pages.<br>
      To generate real portraits, deploy the FastAPI backend and update the API URL.
      <br><br>
      <a href="https://github.com/mouad-gl/Esport-Test" target="_blank" style="color:#00ff88">View backend setup on GitHub →</a>
    </div>`;
  errorPanel.classList.remove('hidden');
});
