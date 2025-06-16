let imageToPdfFiles = [];

function resetImageToPdfTool() {
    const imageToPdfPreview = document.getElementById('imageToPdfPreview');
    const dropZone = document.querySelector('.dropzone');
    const fileList = document.getElementById('imageToPdfFileList');
    if (imageToPdfPreview && dropZone && fileList) {
        imageToPdfPreview.classList.add('hidden');
        dropZone.classList.remove('hidden');
        fileList.innerHTML = '';
        imageToPdfFiles = [];
    } else {
        console.error('Required elements not found for resetImageToPdfTool:', {
            imageToPdfPreview: !!imageToPdfPreview,
            dropZone: !!dropZone,
            fileList: !!fileList
        });
        showToast('Error resetting tool. Please refresh the page.', 'error');
    }
}

function setupImageToPdfDropzone() {
    const dropZone = document.querySelector('.dropzone');
    const fileInput = document.getElementById('imageToPdfFiles');
    if (!dropZone) {
        console.error('dropZone element not found with class "dropzone"');
    }
    if (!fileInput) {
        console.error('fileInput element not found with ID "imageToPdfFiles"');
    }
    if (!dropZone || !fileInput) {
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
            handleImageToPdfFiles(e.target.files);
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
            handleImageToPdfFiles(files);
        }
    });
}

function handleImageToPdfFiles(files) {
    const supportedFormats = ['image/png', 'image/jpeg'];
    const imageFiles = Array.from(files).filter(file => supportedFormats.includes(file.type));
    if (imageFiles.length === 0) {
        showToast('Please upload PNG or JPEG images only.', 'error');
        return;
    }
    const newFiles = [...imageToPdfFiles, ...imageFiles].slice(0, 20);
    if (newFiles.length > 20) {
        showToast('Maximum 20 images allowed.', 'error');
    }
    imageToPdfFiles = newFiles;
    updateImageToPdfFileList();
    const dropZone = document.querySelector('.dropzone');
    const imageToPdfPreview = document.getElementById('imageToPdfPreview');
    if (dropZone && imageToPdfPreview) {
        dropZone.classList.add('hidden');
        imageToPdfPreview.classList.remove('hidden');
    } else {
        console.error('Error updating UI: dropZone or imageToPdfPreview not found', {
            dropZone: !!dropZone,
            imageToPdfPreview: !!imageToPdfPreview
        });
        showToast('Error updating UI. Please refresh the page.', 'error');
    }
}

function updateImageToPdfFileList() {
    const fileList = document.getElementById('imageToPdfFileList');
    if (!fileList) {
        console.error('imageToPdfFileList not found');
        showToast('Error displaying file list.', 'error');
        return;
    }
    fileList.innerHTML = '';
    imageToPdfFiles.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'flex items-center justify-between p-2 border-b';
        const fileInfo = document.createElement('div');
        fileInfo.className = 'flex items-center';
        const icon = document.createElement('i');
        icon.className = 'fas fa-image text-green-600 mr-2';
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
            imageToPdfFiles.splice(index, 1);
            updateImageToPdfFileList();
            if (imageToPdfFiles.length === 0) {
                resetImageToPdfTool();
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

async function processImageToPdf() {
    if (imageToPdfFiles.length === 0) {
        showToast('Please upload at least one image file.', 'error');
        return;
    }
    showProcessing('Converting images to PDF', 'Please wait while we convert your images to a PDF...');
    try {
        const { PDFDocument } = PDFLib;
        const pdfDoc = await PDFDocument.create();
        for (let i = 0; i < imageToPdfFiles.length; i++) {
            const file = imageToPdfFiles[i];
            const imageBytes = await readFileAsArrayBuffer(file);
            let image;
            try {
                if (file.type === 'image/png') {
                    image = await pdfDoc.embedPng(imageBytes);
                } else if (file.type === 'image/jpeg') {
                    image = await pdfDoc.embedJpg(imageBytes);
                } else {
                    throw new Error(`Unsupported image format: ${file.type}`);
                }
                const page = pdfDoc.addPage([image.width, image.height]);
                page.drawImage(image, {
                    x: 0,
                    y: 0,
                    width: image.width,
                    height: image.height,
                });
            } catch (e) {
                console.warn(`Failed to process image ${file.name}: ${e.message}`);
                showToast(`Skipped image ${file.name}: ${e.message}`, 'error');
                continue;
            }
            updateProgress(((i + 1) / imageToPdfFiles.length) * 100);
        }
        if (pdfDoc.getPageCount() === 0) {
            throw new Error('No valid images could be converted to PDF.');
        }
        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        hideProcessing();
        showResult('Images converted to PDF', 'Your images have been converted to a PDF.', blob, 'converted.pdf');
    } catch (error) {
        hideProcessing();
        showToast('Error converting images to PDF: ' + error.message, 'error');
        console.error('Image to PDF error:', error);
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
        console.error('Processing modal elements not found:', {
            modal: !!modal,
            titleEl: !!titleEl,
            messageEl: !!messageEl
        });
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
        console.error('Result modal elements not found:', {
            modal: !!modal,
            titleEl: !!titleEl,
            messageEl: !!messageEl,
            downloadLink: !!downloadLink
        });
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
    setupImageToPdfDropzone();
});