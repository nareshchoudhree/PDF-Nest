let repairFile = null;

function resetRepairTool() {
    const repairPreview = document.getElementById('repairPreview');
    const dropZone = document.querySelector('.dropzone');
    const repairMethod = document.getElementById('repairMethod');
    const fileList = document.getElementById('repairFileList');
    if (repairPreview && dropZone && repairMethod && fileList) {
        repairPreview.classList.add('hidden');
        dropZone.classList.remove('hidden');
        repairMethod.value = 'rebuild';
        fileList.innerHTML = '';
        repairFile = null;
    } else {
        console.error('Required elements not found for resetRepairTool');
        showToast('Error resetting tool. Please refresh the page.', 'error');
    }
}

function setupRepairDropzone() {
    const dropZone = document.querySelector('.dropzone');
    const fileInput = document.getElementById('repairFile');
    if (!dropZone || !fileInput) {
        console.error('dropZone or fileInput not found');
        showToast('Error initializing upload area.', 'error');
        return;
    }
    dropZone.addEventListener('click', () => {
        console.log('Dropzone clicked');
        fileInput.click();
    });
    fileInput.addEventListener('change', (e) => {
        console.log('File input change event');
        if (e.target.files.length > 0) {
            handleRepairFile(e.target.files[0]);
        }
    });
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.add('bg-gray-200'));
    });
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.remove('bg-gray-200'));
    });
    dropZone.addEventListener('drop', (e) => {
        console.log('Drop event');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleRepairFile(files[0]);
        }
    });
}

function handleRepairFile(file) {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        showToast('Please upload a PDF file', 'error');
        return;
    }
    repairFile = file;
    updateRepairFileList();
    const dropZone = document.querySelector('.dropzone');
    const repairPreview = document.getElementById('repairPreview');
    if (dropZone && repairPreview) {
        dropZone.classList.add('hidden');
        repairPreview.classList.remove('hidden');
    } else {
        console.error('dropZone or repairPreview not found');
        showToast('Error updating UI. Please refresh the page.', 'error');
    }
}

function updateRepairFileList() {
    const fileList = document.getElementById('repairFileList');
    if (!fileList) {
        console.error('repairFileList not found');
        showToast('Error displaying file list.', 'error');
        return;
    }
    fileList.innerHTML = '';
    if (repairFile) {
        const fileItem = document.createElement('div');
        fileItem.className = 'flex items-center justify-between p-2 border-b';
        const fileInfo = document.createElement('div');
        fileInfo.className = 'flex items-center';
        const icon = document.createElement('i');
        icon.className = 'fas fa-file-pdf text-red-600 mr-2';
        const fileName = document.createElement('span');
        fileName.className = 'text-sm text-gray-700';
        fileName.textContent = repairFile.name;
        const fileSize = document.createElement('span');
        fileSize.className = 'text-xs text-gray-500 ml-2';
        fileSize.textContent = formatFileSize(repairFile.size);
        const removeBtn = document.createElement('button');
        removeBtn.className = 'text-red-600 hover:text-red-800';
        removeBtn.innerHTML = '<i class="fas fa-times"></i>';
        removeBtn.onclick = () => {
            repairFile = null;
            updateRepairFileList();
            resetRepairTool();
        };
        fileInfo.appendChild(icon);
        fileInfo.appendChild(fileName);
        fileInfo.appendChild(fileSize);
        fileItem.appendChild(fileInfo);
        fileItem.appendChild(removeBtn);
        fileList.appendChild(fileItem);
    }
}

async function processRepair() {
    if (!repairFile) {
        showToast('Please upload a PDF file first', 'error');
        return;
    }
    const method = document.getElementById('repairMethod').value;
    showProcessing('Repairing PDF file', 'Please wait while we repair your PDF file...');
    try {
        const { PDFDocument } = PDFLib;
        const fileBytes = await readFileAsArrayBuffer(repairFile);
        let pdfDoc;
        try {
            pdfDoc = await PDFDocument.load(fileBytes, { ignoreEncryption: true });
        } catch (e) {
            showToast('PDF is severely corrupted. Attempting recovery...', 'info');
            pdfDoc = await PDFDocument.create();
        }
        const newPdf = await PDFDocument.create();
        if (method === 'rebuild') {
            const pageIndices = pdfDoc.getPageIndices();
            for (let i = 0; i < pageIndices.length; i++) {
                const [page] = await newPdf.copyPages(pdfDoc, [pageIndices[i]]);
                newPdf.addPage(page);
                updateProgress(((i + 1) / pageIndices.length) * 100);
            }
        } else {
            const pageCount = pdfDoc.getPageCount();
            let processedPages = 0;
            for (let i = 0; i < pageCount; i++) {
                try {
                    const [page] = await newPdf.copyPages(pdfDoc, [i]);
                    newPdf.addPage(page);
                } catch (e) {
                    console.warn(`Failed to recover page ${i + 1}: ${e.message}`);
                }
                processedPages++;
                updateProgress((processedPages / pageCount) * 100);
            }
            if (newPdf.getPageCount() === 0) {
                throw new Error('No pages could be recovered.');
            }
        }
        const pdfBytes = await newPdf.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        hideProcessing();
        showResult('PDF Repaired Successfully', 'Your PDF file has been repaired.', blob, 'repaired.pdf');
    } catch (error) {
        hideProcessing();
        showToast('Error repairing PDF file: ' + error.message, 'error');
        console.error('Repair error:', error);
    }
}

function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-4 right-4 p-4 rounded-md text-white ${type === 'error' ? 'bg-red-600' : type === 'info' ? 'bg-blue-600' : 'bg-green-600'}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function showProcessing(title, message) {
    const modal = document.getElementById('processingModal');
    const titleEl = document.getElementById('processingTitle');
    const messageEl = document.getElementById('processingMessage');
    if (modal && titleEl && messageEl) {
        titleEl.textContent = title;
        messageEl.textContent = message;
        modal.classList.remove('hidden');
    } else {
        console.error('Processing modal elements not found');
    }
}

function updateProgress(percent) {
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
        progressBar.style.width = `${percent}%`;
    } else {
        console.error('progressBar not found');
    }
}

function hideProcessing() {
    const modal = document.getElementById('processingModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function showResult(title, message, blob, filename) {
    const modal = document.getElementById('resultModal');
    const titleEl = document.getElementById('resultTitle');
    const messageEl = document.getElementById('resultMessage');
    const downloadLink = document.getElementById('downloadResult');
    if (modal && titleEl && messageEl && downloadLink) {
        titleEl.textContent = title;
        messageEl.textContent = message;
        const url = URL.createObjectURL(blob);
        downloadLink.href = url;
        downloadLink.download = filename;
        modal.classList.remove('hidden');
    } else {
        console.error('Result modal elements not found');
        showToast('Error displaying result.', 'error');
    }
}

function closeResultModal() {
    const modal = document.getElementById('resultModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    setupRepairDropzone();
});