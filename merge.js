let mergeFiles = [];

function resetMergeTool() {
    const mergePreview = document.getElementById('mergePreview');
    const dropZone = document.querySelector('.dropzone');
    const mergeFileList = document.getElementById('mergeFileList');
    if (mergePreview && dropZone && mergeFileList) {
        mergePreview.classList.add('hidden');
        dropZone.classList.remove('hidden');
        mergeFileList.innerHTML = '';
        mergeFiles = [];
    } else {
        console.error('Required elements not found for resetMergeTool');
        showToast('Error resetting tool. Please refresh the page.', 'error');
    }
}

function setupMergeDropzone() {
    const dropZone = document.querySelector('.dropzone');
    const fileInput = document.getElementById('mergeFiles');
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
            handleMergeFiles(e.target.files);
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
            handleMergeFiles(files);
        }
    });
}

function handleMergeFiles(files) {
    console.log('Files received:', files);
    const pdfFiles = Array.from(files).filter(file => 
        file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    );
    console.log('PDF files filtered:', pdfFiles);
    if (pdfFiles.length === 0) {
        showToast('Please upload PDF files only', 'error');
        return;
    }
    const newTotal = mergeFiles.length + pdfFiles.length;
    if (newTotal > 10) {
        showToast(`Only the first ${10 - mergeFiles.length} files were added (max 10 files)`, 'error');
    }
    mergeFiles = [...mergeFiles, ...pdfFiles].slice(0, 10);
    console.log('Updated mergeFiles:', mergeFiles);
    updateMergeFileList();
    const dropZone = document.querySelector('.dropzone');
    const mergePreview = document.getElementById('mergePreview');
    if (dropZone && mergePreview) {
        dropZone.classList.add('hidden');
        mergePreview.classList.remove('hidden');
    } else {
        console.error('dropZone or mergePreview not found');
        showToast('Error updating UI. Please refresh the page.', 'error');
    }
}

function updateMergeFileList() {
    const fileList = document.getElementById('mergeFileList');
    if (!fileList) {
        console.error('mergeFileList not found');
        showToast('Error displaying file list.', 'error');
        return;
    }
    fileList.innerHTML = '';
    mergeFiles.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'flex items-center justify-between p-2 border-b';
        const fileInfo = document.createElement('div');
        fileInfo.className = 'flex items-center';
        const icon = document.createElement('i');
        icon.className = 'fas fa-file-pdf text-red-600 mr-2';
        const fileName = document.createElement('span');
        fileName.className = 'text-sm text-gray-700';
        fileName.textContent = file.name;
        const fileSize = document.createElement('span');
        fileSize.className = 'text-xs text-gray-500 ml-2';
        fileSize.textContent = formatFileSize(file.size);
        const removeBtn = document.createElement('button');
        removeBtn.className = 'text-red-600 hover:text-red-800';
        removeBtn.innerHTML = '<i class="fas fa-times"></i>';
        removeBtn.onclick = () => {
            mergeFiles.splice(index, 1);
            updateMergeFileList();
            if (mergeFiles.length === 0) {
                resetMergeTool();
            }
        };
        fileInfo.appendChild(icon);
        fileInfo.appendChild(fileName);
        fileInfo.appendChild(fileSize);
        fileItem.appendChild(fileInfo);
        fileItem.appendChild(removeBtn);
        fileList.appendChild(fileItem);
    });
}

async function processMerge() {
    if (mergeFiles.length < 2) {
        showToast('Please upload at least 2 PDF files to merge', 'error');
        return;
    }
    showProcessing('Merging PDF files', 'Please wait while we merge your PDF files...');
    try {
        const { PDFDocument } = PDFLib;
        const mergedPdf = await PDFDocument.create();
        for (let i = 0; i < mergeFiles.length; i++) {
            updateProgress((i / mergeFiles.length) * 100);
            const file = mergeFiles[i];
            const fileBytes = await readFileAsArrayBuffer(file);
            const pdfDoc = await PDFDocument.load(fileBytes);
            const pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
            pages.forEach(page => mergedPdf.addPage(page));
        }
        const mergedPdfBytes = await mergedPdf.save();
        const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
        hideProcessing();
        showResult('PDFs Merged Successfully', 'Your PDF files have been merged into a single document.', blob, 'merged.pdf');
    } catch (error) {
        hideProcessing();
        showToast('Error merging PDF files: ' + error.message, 'error');
        console.error('Merge error:', error);
    }
}

function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-4 right-4 p-4 rounded-md text-white ${type === 'error' ? 'bg-red-600' : 'bg-green-600'}`;
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
    setupMergeDropzone();
});