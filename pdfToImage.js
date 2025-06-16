let pdfToImageFile = null;

function resetPdfToImageTool() {
    const pdfToImagePreview = document.getElementById('pdfToImagePreview');
    const dropZone = document.querySelector('.dropzone');
    const imageFormat = document.getElementById('imageFormat');
    const imagePages = document.getElementById('imagePages');
    const fileList = document.getElementById('pdfToImageFileList');
    if (pdfToImagePreview && dropZone && imageFormat && imagePages && fileList) {
        pdfToImagePreview.classList.add('hidden');
        dropZone.classList.remove('hidden');
        imageFormat.value = 'png';
        imagePages.value = '';
        fileList.innerHTML = '';
        pdfToImageFile = null;
    } else {
        console.error('Required elements not found for resetPdfToImageTool');
        showToast('Error resetting tool. Please refresh the page.', 'error');
    }
}

function setupPdfToImageDropzone() {
    const dropZone = document.querySelector('.dropzone');
    const fileInput = document.getElementById('pdfToImageFile');
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
            handlePdfToImageFile(e.target.files[0]);
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
            handlePdfToImageFile(files[0]);
        }
    });
}

function updatePdfToImageFileList() {
    const fileList = document.getElementById('pdfToImageFileList');
    if (!fileList) {
        console.error('pdfToImageFileList not found');
        showToast('Error displaying file list.', 'error');
        return;
    }
    fileList.innerHTML = '';
    if (pdfToImageFile) {
        const fileItem = document.createElement('div');
        fileItem.className = 'flex items-center justify-between p-2 border-b';
        const fileInfo = document.createElement('div');
        fileInfo.className = 'flex items-center';
        const icon = document.createElement('i');
        icon.className = 'fas fa-file-pdf text-red-600 mr-2';
        const fileName = document.createElement('span');
        fileName.className = 'text-sm text-gray-700';
        fileName.textContent = pdfToImageFile.name;
        const fileSize = document.createElement('span');
        fileSize.className = 'text-xs text-gray-500 ml-2';
        fileSize.textContent = formatFileSize(pdfToImageFile.size);
        const removeBtn = document.createElement('button');
        removeBtn.className = 'text-red-600 hover:text-red-800';
        removeBtn.innerHTML = '<i class="fas fa-times"></i>';
        removeBtn.onclick = () => {
            pdfToImageFile = null;
            updatePdfToImageFileList();
            resetPdfToImageTool();
        };
        fileInfo.appendChild(icon);
        fileInfo.appendChild(fileName);
        fileInfo.appendChild(fileSize);
        fileItem.appendChild(fileInfo);
        fileItem.appendChild(removeBtn);
        fileList.appendChild(fileItem);
    }
}

function handlePdfToImageFile(file) {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        showToast('Please upload a valid PDF file', 'error');
        console.error('Invalid file type:', file.type);
        return;
    }
    pdfToImageFile = file;
    updatePdfToImageFileList();
    const dropZone = document.querySelector('.dropzone');
    const pdfToImagePreview = document.getElementById('pdfToImagePreview');
    if (dropZone && pdfToImagePreview) {
        dropZone.classList.add('hidden');
        pdfToImagePreview.classList.remove('hidden');
    } else {
        console.error('dropZone or pdfToImagePreview not found');
        showToast('Error updating UI. Please refresh the page.', 'error');
    }
}

function parsePageRanges(input, totalPages) {
    if (!input.trim()) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages = new Set();
    const ranges = input.split(',').map(s => s.trim());
    for (const range of ranges) {
        if (/^\d+$/.test(range)) {
            const page = parseInt(range);
            if (page >= 1 && page <= totalPages) {
                pages.add(page);
            }
        } else if (/^\d+-\d+$/.test(range)) {
            const [start, end] = range.split('-').map(n => parseInt(n));
            if (start >= 1 && end <= totalPages && start <= end) {
                for (let i = start; i <= end; i++) {
                    pages.add(i);
                }
            }
        }
    }
    if (pages.size === 0) {
        throw new Error('Invalid page range or no valid pages specified.');
    }
    return Array.from(pages).sort((a, b) => a - b);
}

async function processPdfToImage() {
    if (!pdfToImageFile) {
        showToast('Please upload a PDF file first', 'error');
        return;
    }
    const format = document.getElementById('imageFormat').value;
    const pagesInput = document.getElementById('imagePages').value;
    showProcessing('Converting PDF to images', 'Please wait while we convert your PDF to images...');
    try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.12.313/pdf.worker.min.js';
        const fileBytes = await readFileAsArrayBuffer(pdfToImageFile);
        const pdf = await pdfjsLib.getDocument({ data: fileBytes }).promise;
        const totalPages = pdf.numPages;
        let pages;
        try {
            pages = parsePageRanges(pagesInput, totalPages);
        } catch (e) {
            throw new Error('Invalid page range format. Use numbers or ranges like 1-3,5,7-9.');
        }
        const imageFiles = [];
        for (let i = 0; i < pages.length; i++) {
            const pageNum = pages[i];
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 2.0 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = viewport.height;
            await page.render({ canvasContext: context, viewport }).promise;
            const blob = await new Promise(resolve => {
                canvas.toBlob(resolve, `image/${format === 'jpeg' ? 'jpeg' : 'png'}`, format === 'jpeg' ? 0.8 : 1.0);
            });
            imageFiles.push({ name: `page-${pageNum}.${format}`, blob });
            updateProgress(((i + 1) / pages.length) * 100);
        }
        if (imageFiles.length === 1) {
            hideProcessing();
            showResult('PDF page converted', 'Your PDF page has been converted to an image.', imageFiles[0].blob, imageFiles[0].name);
        } else {
            const zip = new JSZip();
            imageFiles.forEach(file => zip.file(file.name, file.blob));
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            hideProcessing();
            showResult('PDF pages converted', 'Your PDF pages have been converted to images.', zipBlob, 'images.zip');
        }
    } catch (error) {
        hideProcessing();
        showToast('Error converting PDF to images: ' + error.message, 'error');
        console.error('PDF to Image error:', error);
    }
}

function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-4 right-4 p-4 rounded-md text-white ${type === 'error' ? 'bg-red-600' : type === 'info' ? 'bg-blue-600' : 'bg-green-900'}`;
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
    setupPdfToImageDropzone();
});