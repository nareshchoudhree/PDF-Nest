let organizeFile = null;
let pageOrder = [];
let thumbnails = [];

function resetOrganizeTool() {
    const organizePreview = document.getElementById('organizePreview');
    const dropZone = document.querySelector('.dropzone');
    const thumbnailContainer = document.getElementById('pageThumbnails');
    const fileList = document.getElementById('organizeFileList');
    if (organizePreview && dropZone && thumbnailContainer && fileList) {
        organizePreview.classList.add('hidden');
        dropZone.classList.remove('hidden');
        thumbnailContainer.innerHTML = '';
        fileList.innerHTML = '';
        organizeFile = null;
        pageOrder = [];
        thumbnails = [];
    } else {
        console.error('Required elements not found for resetOrganizeTool');
        showToast('Error resetting tool. Please refresh the page.', 'error');
    }
}

function setupOrganizeDropzone() {
    const dropZone = document.querySelector('.dropzone');
    const fileInput = document.getElementById('organizeFile');
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
            handleOrganizeFile(e.target.files[0]);
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
            handleOrganizeFile(files[0]);
        }
    });
}

function updateOrganizeFileList() {
    const fileList = document.getElementById('organizeFileList');
    if (!fileList) {
        console.error('organizeFileList not found');
        showToast('Error displaying file list.', 'error');
        return;
    }
    fileList.innerHTML = '';
    if (organizeFile) {
        const fileItem = document.createElement('div');
        fileItem.className = 'flex items-center justify-between p-2 border-b';
        const fileInfo = document.createElement('div');
        fileInfo.className = 'flex items-center';
        const icon = document.createElement('i');
        icon.className = 'fas fa-file-pdf text-red-600 mr-2';
        const fileName = document.createElement('span');
        fileName.className = 'text-sm text-gray-700';
        fileName.textContent = organizeFile.name;
        const fileSize = document.createElement('span');
        fileSize.className = 'text-xs text-gray-500 ml-2';
        fileSize.textContent = formatFileSize(organizeFile.size);
        const removeBtn = document.createElement('button');
        removeBtn.className = 'text-red-600 hover:text-red-800';
        removeBtn.innerHTML = '<i class="fas fa-times"></i>';
        removeBtn.onclick = () => {
            organizeFile = null;
            updateOrganizeFileList();
            resetOrganizeTool();
        };
        fileInfo.appendChild(icon);
        fileInfo.appendChild(fileName);
        fileInfo.appendChild(fileSize);
        fileItem.appendChild(fileInfo);
        fileItem.appendChild(removeBtn);
        fileList.appendChild(fileItem);
    }
}

async function handleOrganizeFile(file) {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        showToast('Please upload a valid PDF file', 'error');
        console.error('Invalid file type:', file.type);
        return;
    }
    organizeFile = file;
    updateOrganizeFileList();
    const dropZone = document.querySelector('.dropzone');
    const organizePreview = document.getElementById('organizePreview');
    if (dropZone && organizePreview) {
        dropZone.classList.add('hidden');
        organizePreview.classList.remove('hidden');
    } else {
        console.error('dropZone or organizePreview not found');
        showToast('Error updating UI. Please refresh the page.', 'error');
        return;
    }
    try {
        await renderPageThumbnails();
        setupDragAndDrop();
    } catch (error) {
        console.error('Error processing PDF for thumbnails:', error);
        showToast('Failed to load PDF for preview.', 'error');
        resetOrganizeTool();
    }
}

async function renderPageThumbnails() {
    try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.12.313/pdf.worker.min.js';
        const fileBytes = await readFileAsArrayBuffer(organizeFile);
        const pdf = await pdfjsLib.getDocument({ data: fileBytes }).promise;
        pageOrder = Array.from({ length: pdf.numPages }, (_, i) => i);
        thumbnails = [];
        const thumbnailContainer = document.getElementById('pageThumbnails');
        if (!thumbnailContainer) {
            throw new Error('pageThumbnails container not found');
        }
        thumbnailContainer.innerHTML = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 0.2 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvasContext: context, viewport }).promise;
            const thumbnail = document.createElement('div');
            thumbnail.className = 'page-thumbnail';
            thumbnail.draggable = true;
            thumbnail.dataset.page = i - 1;
            thumbnail.innerHTML = `
                <img src="${canvas.toDataURL('image/jpeg', 0.8)}" />
                <div class="page-number">${i}</div>
            `;
            thumbnail.addEventListener('click', () => {
                thumbnail.classList.toggle('selected');
            });
            thumbnailContainer.appendChild(thumbnail);
            thumbnails.push(thumbnail);
        }
    } catch (error) {
        console.error('Error rendering thumbnails:', error);
        throw error;
    }
}

function setupDragAndDrop() {
    thumbnails.forEach(thumbnail => {
        thumbnail.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', thumbnail.dataset.page);
            thumbnail.classList.add('dragging');
        });
        thumbnail.addEventListener('dragend', () => {
            thumbnail.classList.remove('dragging');
        });
        thumbnail.addEventListener('dragover', (e) => {
            e.preventDefault();
        });
        thumbnail.addEventListener('drop', (e) => {
            e.preventDefault();
            const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
            const toIndex = parseInt(thumbnail.dataset.page);
            const [movedPage] = pageOrder.splice(fromIndex, 1);
            pageOrder.splice(toIndex, 0, movedPage);
            renderThumbnailsFromOrder();
        });
    });
}

function renderThumbnailsFromOrder() {
    const thumbnailContainer = document.getElementById('pageThumbnails');
    if (!thumbnailContainer) {
        console.error('pageThumbnails not found');
        showToast('Error updating thumbnails.', 'error');
        return;
    }
    thumbnailContainer.innerHTML = '';
    pageOrder.forEach((pageIndex, i) => {
        const thumbnail = thumbnails[pageIndex];
        thumbnail.dataset.page = i;
        thumbnailContainer.appendChild(thumbnail);
    });
}

async function extractSelectedPages() {
    const selected = Array.from(document.querySelectorAll('.page-thumbnail.selected')).map(t => parseInt(t.dataset.page));
    if (selected.length === 0) {
        showToast('Please select at least one page', 'error');
        return;
    }
    showProcessing('Extracting pages', 'Please wait while we extract the selected pages...');
    try {
        const { PDFDocument } = PDFLib;
        const fileBytes = await readFileAsArrayBuffer(organizeFile);
        const pdfDoc = await PDFDocument.load(fileBytes);
        const newPdf = await PDFDocument.create();
        const selectedIndices = selected.map(i => pageOrder[i]).sort((a, b) => a - b);
        for (let i = 0; i < selectedIndices.length; i++) {
            updateProgress(((i + 1) / selectedIndices.length) * 100);
            const [page] = await newPdf.copyPages(pdfDoc, [selectedIndices[i]]);
            newPdf.addPage(page);
        }
        const pdfBytes = await newPdf.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        hideProcessing();
        showResult('Pages Extracted Successfully', 'The selected pages have been extracted.', blob, 'extracted.pdf');
    } catch (error) {
        hideProcessing();
        showToast('Error extracting pages: ' + error.message, 'error');
        console.error('Extract error:', error);
    }
}

async function deleteSelectedPages() {
    const selected = Array.from(document.querySelectorAll('.page-thumbnail.selected')).map(t => parseInt(t.dataset.page));
    if (selected.length === 0) {
        showToast('Please select at least one page', 'error');
        return;
    }
    pageOrder = pageOrder.filter((_, i) => !selected.includes(i));
    if (pageOrder.length === 0) {
        resetOrganizeTool();
        showToast('All pages deleted. Tool reset.', 'info');
        return;
    }
    renderThumbnailsFromOrder();
    showToast('Selected pages deleted', 'info');
}

async function saveOrganizedPdf() {
    if (!organizeFile || pageOrder.length === 0) {
        showToast('No pages to save', 'error');
        return;
    }
    showProcessing('Saving organized PDF', 'Please wait while we save your organized PDF...');
    try {
        const { PDFDocument } = PDFLib;
        const fileBytes = await readFileAsArrayBuffer(organizeFile);
        const pdfDoc = await PDFDocument.load(fileBytes);
        const newPdf = await PDFDocument.create();
        for (let i = 0; i < pageOrder.length; i++) {
            updateProgress(((i + 1) / pageOrder.length) * 100);
            const [page] = await newPdf.copyPages(pdfDoc, [pageOrder[i]]);
            newPdf.addPage(page);
        }
        const pdfBytes = await newPdf.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        hideProcessing();
        showResult('PDF Organized Successfully', 'Your PDF has been reorganized.', blob, 'organized.pdf');
    } catch (error) {
        hideProcessing();
        showToast('Error saving organized PDF: ' + error.message, 'error');
        console.error('Organize error:', error);
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
    setupOrganizeDropzone();
});