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
    document.getElementById('signatureText').value = '';
    selectedFile = null;
}

async function processFile(tool) {
    if (!selectedFile) {
        showToast('Please select a file.', 'fa-exclamation-circle');
        return;
    }
    const signatureText = document.getElementById('signatureText').value.trim();
    if (!signatureText) {
        showToast('Please enter a signature.', 'fa-exclamation-circle');
        return;
    }
    showProcessingModal();
    try {
        // Load PDF
        const arrayBuffer = await selectedFile.arrayBuffer();
        const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
        updateProgress(50);

        // Add signature to first page
        const pages = pdfDoc.getPages();
        const firstPage = pages[0];
        const { height } = firstPage.getSize();
        firstPage.drawText(signatureText, {
            x: 50,
            y: height - 100,
            size: 24,
            color: PDFLib.rgb(0, 0, 0),
        });

        // Save modified PDF
        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        updateProgress(100);
        hideProcessingModal();
        showResultModal(url, `signed_${selectedFile.name}`);
    } catch (error) {
        hideProcessingModal();
        showToast(`An error occurred: ${error.message}`, 'fa-exclamation-circle');
    }
}

window.onload = function() {
    // Load pdf-lib.js
    const pdfLibScript = document.createElement('script');
    pdfLibScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js';
    document.head.appendChild(pdfLibScript);

    setupDropzone();
};