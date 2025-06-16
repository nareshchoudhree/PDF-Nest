let rotateFile = null;

function resetRotateTool() {
    const rotatePreview = document.getElementById('rotatePreview');
    const dropZone = document.querySelector('.dropzone');
    const rotatePages = document.getElementById('rotatePages');
    const defaultAngle = document.querySelector('input[name="rotationAngle"][value="90"]');
    if (rotatePreview && dropZone && rotatePages && defaultAngle) {
        rotatePreview.classList.add('hidden');
        dropZone.classList.remove('hidden');
        rotatePages.value = '';
        defaultAngle.checked = true;
        rotateFile = null;
        document.getElementById('rotateFileList').innerHTML = '';
    } else {
        console.error('Required elements not found for resetRotateTool');
        showToast('Error resetting tool. Please refresh the page.', 'error');
    }
}

function setupRotateDropzone() {
    const dropZone = document.querySelector('.dropzone');
    const fileInput = document.getElementById('rotateFile');
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
            handleRotateFile(e.target.files[0]);
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
            handleRotateFile(files[0]);
        }
    });
}

function handleRotateFile(file) {
    console.log('File received:', file);
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        showToast('Please upload a PDF file', 'error');
        return;
    }
    rotateFile = file;
    updateRotateFileList();
    const dropZone = document.querySelector('.dropzone');
    const rotatePreview = document.getElementById('rotatePreview');
    if (dropZone && rotatePreview) {
        dropZone.classList.add('hidden');
        rotatePreview.classList.remove('hidden');
    } else {
        console.error('dropZone or rotatePreview not found');
        showToast('Error updating UI. Please refresh the page.', 'error');
    }
}

function updateRotateFileList() {
    const fileList = document.getElementById('rotateFileList');
    if (!fileList) {
        console.error('rotateFileList not found');
        showToast('Error displaying file list.', 'error');
        return;
    }
    fileList.innerHTML = '';
    if (rotateFile) {
        const fileItem = document.createElement('div');
        fileItem.className = 'flex items-center justify-between p-2 border-b';
        const fileInfo = document.createElement('div');
        fileInfo.className = 'flex items-center';
        const icon = document.createElement('i');
        icon.className = 'fas fa-file-pdf text-red-600 mr-2';
        const fileName = document.createElement('span');
        fileName.className = 'text-sm text-gray-700';
        fileName.textContent = rotateFile.name;
        const fileSize = document.createElement('span');
        fileSize.className = 'text-xs text-gray-500 ml-2';
        fileSize.textContent = formatFileSize(rotateFile.size);
        const removeBtn = document.createElement('button');
        removeBtn.className = 'text-red-600 hover:text-red-800';
        removeBtn.innerHTML = '<i class="fas fa-times"></i>';
        removeBtn.onclick = () => {
            rotateFile = null;
            updateRotateFileList();
            resetRotateTool();
        };
        fileInfo.appendChild(icon);
        fileInfo.appendChild(fileName);
        fileInfo.appendChild(fileSize);
        fileItem.appendChild(fileInfo);
        fileItem.appendChild(removeBtn);
        fileList.appendChild(fileItem);
    }
}

function parsePageRanges(input, totalPages) {
    if (!input.trim()) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages = [];
    const ranges = input.split(',').map(range => range.trim());
    for (const range of ranges) {
        if (range.includes('-')) {
            const [start, end] = range.split('-').map(n => parseInt(n.trim()));
            if (isNaN(start) || isNaN(end) || start < 1 || end > totalPages || start > end) {
                throw new Error(`Invalid page range: ${range}`);
            }
            for (let i = start; i <= end; i++) {
                if (!pages.includes(i)) pages.push(i);
            }
        } else {
            const page = parseInt(range);
            if (isNaN(page) || page < 1 || page > totalPages) {
                throw new Error(`Invalid page number: ${range}`);
            }
            if (!pages.includes(page)) pages.push(page);
        }
    }
    return pages.sort((a, b) => a - b);
}

async function processRotate() {
    if (!rotateFile) {
        showToast('Please upload a PDF file first', 'error');
        return;
    }
    showProcessing('Rotating PDF pages', 'Please wait while we rotate your PDF pages...');
    try {
        const { PDFDocument } = PDFLib;
        const fileBytes = await readFileAsArrayBuffer(rotateFile);
        const pdfDoc = await PDFDocument.load(fileBytes);
        const totalPages = pdfDoc.getPageCount();
        const pagesInput = document.getElementById('rotatePages').value;
        const pagesToRotate = parsePageRanges(pagesInput, totalPages);
        const angle = parseInt(document.querySelector('input[name="rotationAngle"]:checked').value);
        pagesToRotate.forEach((pageNum, index) => {
            const page = pdfDoc.getPage(pageNum - 1);
            const rotation = (page.getRotation().angle + angle) % 360;
            page.setRotation({ type: PDFLib.RotationTypes.Degrees, angle: rotation });
            updateProgress(((index + 1) / pagesToRotate.length) * 100);
        });
        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        hideProcessing();
        showResult('PDF Rotated Successfully', 'Your PDF pages have been rotated.', blob, 'rotated.pdf');
    } catch (error) {
        hideProcessing();
        showToast('Error rotating PDF pages: ' + error.message, 'error');
        console.error('Rotate error:', error);
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
    setupRotateDropzone();
});