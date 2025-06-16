pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.12.313/pdf.worker.min.js';

let currentTool = '';

function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(file);
    });
}

function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}

function formatFileSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }
    return `${size.toFixed(2)} ${units[unitIndex]}`;
}

function parsePageRanges(rangeString, totalPages) {
    if (!rangeString) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const ranges = [];
    const parts = rangeString.split(',').map(part => part.trim());
    for (const part of parts) {
        if (part.includes('-')) {
            const [start, end] = part.split('-').map(num => parseInt(num.trim()));
            if (isNaN(start) || isNaN(end) || start < 1 || end < start || end > totalPages) {
                throw new Error(`Invalid page range: ${part}`);
            }
            for (let i = start; i <= end; i++) {
                ranges.push(i);
            }
        } else {
            const page = parseInt(part);
            if (isNaN(page) || page < 1 || page > totalPages) {
                throw new Error(`Invalid page number: ${part}`);
            }
            ranges.push(page);
        }
    }
    return [...new Set(ranges)].sort((a, b) => a - b);
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastIcon = document.getElementById('toastIcon');
    const toastMessage = document.getElementById('toastMessage');
    toastMessage.textContent = message;
    toastIcon.className = `fas fa-${type === 'error' ? 'exclamation-circle' : 'info-circle'} mr-2`;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function showProcessing(title, message) {
    document.getElementById('processingTitle').textContent = title;
    document.getElementById('processingMessage').textContent = message;
    document.getElementById('progressBar').style.width = '0%';
    document.getElementById('processingModal').classList.remove('hidden');
}

function updateProgress(percentage) {
    document.getElementById('progressBar').style.width = `${percentage}%`;
}

function hideProcessing() {
    document.getElementById('processingModal').classList.add('hidden');
}

function showResult(title, message, blob, filename) {
    document.getElementById('resultTitle').textContent = title;
    document.getElementById('resultMessage').textContent = message;
    const downloadLink = document.getElementById('downloadResult');
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = filename;
    document.getElementById('resultModal').classList.remove('hidden');
}

function closeResultModal() {
    document.getElementById('resultModal').classList.add('hidden');
}

document.querySelector('[aria-controls="mobile-menu"]').addEventListener('click', function() {
    const menu = document.getElementById('mobile-menu');
    menu.classList.toggle('hidden');
});

function openToolModal(tool) {
    currentTool = tool;
    document.getElementById('toolModal').classList.remove('hidden');
    document.getElementById('modalTitle').textContent = getToolTitle(tool);
    document.querySelectorAll('#toolModal > div > div > div > div > div > div > div[id$="Tool"]').forEach(el => {
        el.classList.add('hidden');
    });
    document.getElementById(tool + 'Tool').classList.remove('hidden');
    resetTool(tool);
}

function closeToolModal() {
    document.getElementById('toolModal').classList.add('hidden');
    resetTool(currentTool);
}

function getToolTitle(tool) {
    const titles = {
        'merge': 'Merge PDF Files',
        'split': 'Split PDF File',
        'compress': 'Compress PDF File',
        'pdf-to-word': 'Convert PDF to Word',
        'word-to-pdf': 'Convert Word to PDF',
        'rotate': 'Rotate PDF Pages',
        'watermark': 'Add Watermark to PDF',
        'organize': 'Organize PDF Pages',
        'repair': 'Repair PDF File',
        'pdf-to-image': 'Convert PDF to Image',
        'image-to-pdf': 'Convert Image to PDF'
    };
    return titles[tool] || 'PDF Tool';
}

function resetTool(tool) {
    switch(tool) {
        case 'merge': resetMergeTool(); break;
        case 'split': resetSplitTool(); break;
        case 'compress': resetCompressTool(); break;
        case 'pdf-to-word': resetPdfToWordTool(); break;
        case 'word-to-pdf': resetWordToPdfTool(); break;
        case 'rotate': resetRotateTool(); break;
        case 'watermark': resetWatermarkTool(); break;
        case 'organize': resetOrganizeTool(); break;
        case 'repair': resetRepairTool(); break;
        case 'pdf-to-image': resetPdfToImageTool(); break;
        case 'image-to-pdf': resetImageToPdfTool(); break;
    }
}

window.onload = function() {
    setupMergeDropzone();
    setupSplitDropzone();
    setupCompressDropzone();
    setupPdfToWordDropzone();
    setupWordToPdfDropzone();
    setupRotateDropzone();
    setupWatermarkDropzone();
    setupOrganizeDropzone();
    setupRepairDropzone();
    setupPdfToImageDropzone();
    setupImageToPdfDropzone();
    document.getElementById('splitByRange').addEventListener('change', toggleSplitOptions);
    document.getElementById('splitByEvery').addEventListener('change', toggleSplitOptions);
    document.querySelectorAll('input[name="watermarkType"]').forEach(radio => {
        radio.addEventListener('change', toggleWatermarkType);
    });
    setupWatermarkImageDropzone();
};