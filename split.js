let splitFile = null;

function resetSplitTool() {
    const splitPreview = document.getElementById('splitPreview');
    const dropZone = document.querySelector('.dropzone');
    const splitPages = document.getElementById('splitPages');
    const splitEveryPages = document.getElementById('splitEveryPages');
    const splitByRange = document.getElementById('splitByRange');
    if (splitPreview && dropZone && splitPages && splitEveryPages && splitByRange) {
        splitPreview.classList.add('hidden');
        dropZone.classList.remove('hidden');
        splitPages.value = '';
        splitEveryPages.value = '1';
        splitByRange.checked = true;
        toggleSplitOptions();
        splitFile = null;
        document.getElementById('splitFileList').innerHTML = '';
    } else {
        console.error('Required elements not found for resetSplitTool');
        showToast('Error resetting tool. Please refresh the page.', 'error');
    }
}

function setupSplitDropzone() {
    const dropZone = document.querySelector('.dropzone');
    const fileInput = document.getElementById('splitFile');
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
            handleSplitFile(e.target.files[0]);
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
            handleSplitFile(files[0]);
        }
    });
}

function handleSplitFile(file) {
    console.log('File received:', file);
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        showToast('Please upload a PDF file', 'error');
        return;
    }
    splitFile = file;
    updateSplitFileList();
    const dropZone = document.querySelector('.dropzone');
    const splitPreview = document.getElementById('splitPreview');
    if (dropZone && splitPreview) {
        dropZone.classList.add('hidden');
        splitPreview.classList.remove('hidden');
    } else {
        console.error('dropZone or splitPreview not found');
        showToast('Error updating UI. Please refresh the page.', 'error');
    }
}

function updateSplitFileList() {
    const fileList = document.getElementById('splitFileList');
    if (!fileList) {
        console.error('splitFileList not found');
        showToast('Error displaying file list.', 'error');
        return;
    }
    fileList.innerHTML = '';
    if (splitFile) {
        const fileItem = document.createElement('div');
        fileItem.className = 'flex items-center justify-between p-2 border-b';
        const fileInfo = document.createElement('div');
        fileInfo.className = 'flex items-center';
        const icon = document.createElement('i');
        icon.className = 'fas fa-file-pdf text-red-600 mr-2';
        const fileName = document.createElement('span');
        fileName.className = 'text-sm text-gray-700';
        fileName.textContent = splitFile.name;
        const fileSize = document.createElement('span');
        fileSize.className = 'text-xs text-gray-500 ml-2';
        fileSize.textContent = formatFileSize(splitFile.size);
        const removeBtn = document.createElement('button');
        removeBtn.className = 'text-red-600 hover:text-red-800';
        removeBtn.innerHTML = '<i class="fas fa-times"></i>';
        removeBtn.onclick = () => {
            splitFile = null;
            updateSplitFileList();
            resetSplitTool();
        };
        fileInfo.appendChild(icon);
        fileInfo.appendChild(fileName);
        fileInfo.appendChild(fileSize);
        fileItem.appendChild(fileInfo);
        fileItem.appendChild(removeBtn);
        fileList.appendChild(fileItem);
    }
}

function toggleSplitOptions() {
    const splitByRange = document.getElementById('splitByRange');
    const splitRangeSection = document.getElementById('splitRangeSection');
    const splitEveryPages = document.getElementById('splitEveryPages');
    const pagesLabel = document.getElementById('pagesLabel');
    if (splitByRange && splitRangeSection && splitEveryPages && pagesLabel) {
        const isRange = splitByRange.checked;
        splitRangeSection.classList.toggle('hidden', !isRange);
        splitEveryPages.classList.toggle('hidden', isRange);
        pagesLabel.classList.toggle('hidden', isRange);
    } else {
        console.error('Toggle split options elements not found');
        showToast('Error updating split options.', 'error');
    }
}

function parsePageRanges(input, totalPages) {
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

async function processSplit() {
    if (!splitFile) {
        showToast('Please upload a PDF file first', 'error');
        return;
    }
    showProcessing('Splitting PDF file', 'Please wait while we split your PDF file...');
    try {
        const { PDFDocument } = PDFLib;
        const fileBytes = await readFileAsArrayBuffer(splitFile);
        const pdfDoc = await PDFDocument.load(fileBytes);
        const totalPages = pdfDoc.getPageCount();
        let pdfFiles = [];
        if (document.getElementById('splitByRange').checked) {
            const pagesInput = document.getElementById('splitPages').value;
            if (!pagesInput.trim()) {
                throw new Error('Please enter page ranges to extract');
            }
            const pages = parsePageRanges(pagesInput, totalPages);
            const newPdf = await PDFDocument.create();
            const copiedPages = await newPdf.copyPages(pdfDoc, pages.map(p => p - 1));
            copiedPages.forEach(page => newPdf.addPage(page));
            const pdfBytes = await newPdf.save();
            pdfFiles.push({ name: 'split_output.pdf', blob: new Blob([pdfBytes], { type: 'application/pdf' }) });
        } else {
            const everyPages = parseInt(document.getElementById('splitEveryPages').value) || 1;
            if (everyPages < 1) {
                throw new Error('Pages per split must be at least 1');
            }
            for (let i = 0; i < totalPages; i += everyPages) {
                const newPdf = await PDFDocument.create();
                const end = Math.min(i + everyPages, totalPages);
                const pageIndices = Array.from({ length: end - i }, (_, j) => i + j);
                const copiedPages = await newPdf.copyPages(pdfDoc, pageIndices);
                copiedPages.forEach(page => newPdf.addPage(page));
                const pdfBytes = await newPdf.save();
                pdfFiles.push({ name: `split_output_${Math.floor(i / everyPages) + 1}.pdf`, blob: new Blob([pdfBytes], { type: 'application/pdf' }) });
                updateProgress((i / totalPages) * 100);
            }
        }
        if (pdfFiles.length === 1) {
            hideProcessing();
            showResult('PDF Split Successfully', 'Your PDF has been split into a new document.', pdfFiles[0].blob, pdfFiles[0].name);
        } else {
            const zip = new JSZip();
            pdfFiles.forEach(file => zip.file(file.name, file.blob));
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            hideProcessing();
            showResult('PDFs Split Successfully', 'Your PDF has been split into multiple files.', zipBlob, 'split_pdfs.zip');
        }
    } catch (error) {
        hideProcessing();
        showToast('Error splitting PDF file: ' + error.message, 'error');
        console.error('Split error:', error);
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
    setupSplitDropzone();
    const splitByRange = document.getElementById('splitByRange');
    const splitByEvery = document.getElementById('splitByEvery');
    if (splitByRange && splitByEvery) {
        splitByRange.addEventListener('change', toggleSplitOptions);
        splitByEvery.addEventListener('change', toggleSplitOptions);
    }
});