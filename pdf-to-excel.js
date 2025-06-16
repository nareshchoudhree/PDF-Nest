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
    if (extension !== '.pdf') {
        showToast('Please select a PDF file.', 'fa-exclamation-circle');
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
        // Load PDF.js
        const pdfjsLib = window['pdfjs-dist/build/pdf'];
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.14.305/pdf.worker.min.js';
        
        // Read PDF file
        const arrayBuffer = await selectedFile.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        updateProgress(50);

        // Extract text
        let text = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            text += content.items.map(item => item.str).join(' ') + '\n';
        }

        // Create Excel file using XLSX
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([[text]]);
        XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        updateProgress(100);
        hideProcessingModal();
        showResultModal(url, selectedFile.name.replace('.pdf', '.xlsx'));
    } catch (error) {
        hideProcessingModal();
        showToast(`An error occurred: ${error.message}`, 'fa-exclamation-circle');
    }
}

window.onload = function() {
    // Load required scripts
    const pdfjsScript = document.createElement('script');
    pdfjsScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.14.305/pdf.min.js';
    document.head.appendChild(pdfjsScript);

    const xlsxScript = document.createElement('script');
    xlsxScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    document.head.appendChild(xlsxScript);

    setupDropzone();
};