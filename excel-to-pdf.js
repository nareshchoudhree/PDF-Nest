let selectedFile = null;

function showToast(message, icon = 'fa-info-circle') {
    const toast = document.getElementById('toast');
    const toastIcon = document.getElementById('toastIcon');
    const toastMessage = document.getElementById('toastMessage');
    toastIcon.className = `fas ${icon} mr-2`;
    toastMessage.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function showProcessingModal() {
    document.getElementById('processingModal').classList.remove('hidden');
    updateProgress(0);
}

function hideProcessingModal() {
    document.getElementById('processingModal').classList.add('hidden');
}

function updateProgress(percentage) {
    const progressBar = document.getElementById('progressBar').children[0];
    progressBar.style.width = `${percentage}%`;
}

function showResultModal(downloadUrl, filename) {
    const resultModal = document.getElementById('resultModal');
    const downloadLink = document.getElementById('downloadResult');
    downloadLink.href = downloadUrl;
    downloadLink.download = filename;
    resultModal.classList.remove('hidden');
}

function closeResultModal() {
    document.getElementById('resultModal').classList.add('hidden');
}

function setupDropzone() {
    const dropzone = document.getElementById('toolDropzone');
    const fileInput = document.getElementById('toolFile');
    const selectButton = dropzone.querySelector('button');

    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('active');
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('active');
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('active');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            fileInput.files = files;
            handleFileSelection(files[0]);
        }
    });

    selectButton.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            handleFileSelection(fileInput.files[0]);
        }
    });
}

function handleFileSelection(file) {
    selectedFile = file;
    const extension = '.' + file.name.split('.').pop().toLowerCase();
    if (!['.xlsx', '.xls'].includes(extension)) {
        showToast('Please select an Excel file (.xlsx or .xls).', 'fa-exclamation-circle');
        return;
    }
    document.getElementById('toolOptions').classList.remove('hidden');
}

function resetTool() {
    document.getElementById('toolOptions').classList.add('hidden');
    document.getElementById('toolFile').value = '';
    selectedFile = null;
}

async function processFile(tool) {
    if (!selectedFile) {
        showToast('Please select a file.', 'fa-exclamation-circle');
        return;
    }
    showProcessingModal();
    try {
        // Read Excel file
        const arrayBuffer = await selectedFile.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
        updateProgress(50);

        // Create PDF using jsPDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.setFontSize(12);
        let y = 10;
        data.forEach(row => {
            doc.text(row.join(' | '), 10, y);
            y += 10;
            if (y > 280) {
                doc.addPage();
                y = 10;
            }
        });
        updateProgress(80);
        const blob = doc.output('blob');
        const url = URL.createObjectURL(blob);
        updateProgress(100);
        hideProcessingModal();
        showResultModal(url, selectedFile.name.replace(/\.xlsx?$/i, '.pdf'));
    } catch (error) {
        hideProcessingModal();
        showToast(`An error occurred: ${error.message}`, 'fa-exclamation-circle');
    }
}

window.onload = function() {
    // Load jsPDF and XLSX
    const jspdfScript = document.createElement('script');
    jspdfScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    document.head.appendChild(jspdfScript);

    const xlsxScript = document.createElement('script');
    xlsxScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    document.head.appendChild(xlsxScript);

    setupDropzone();
};