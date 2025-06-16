let watermarkFile = null;
let watermarkImageFile = null;

function resetWatermarkTool() {
    document.getElementById('watermarkPreview').classList.add('hidden');
    document.getElementById('watermarkDropzone').classList.remove('hidden');
    document.getElementById('watermarkPages').value = '';
    document.getElementById('watermarkText').value = '';
    document.getElementById('watermarkFontSize').value = '48';
    document.getElementById('watermarkOpacity').value = '0.6';
    document.getElementById('imageWatermarkOpacity').value = '0.6';
    document.getElementById('watermarkColor').value = '#000000';
    document.querySelector('input[name="watermarkType"][value="text"]').checked = true;
    toggleWatermarkType();
    watermarkFile = null;
    watermarkImageFile = null;
}

function setupWatermarkDropzone() {
    const dropzone = document.getElementById('watermarkDropzone');
    const fileInput = document.getElementById('watermarkFile');
    dropzone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleWatermarkFile(e.target.files[0]);
        }
    });
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, preventDefaults, false);
    });
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => dropzone.classList.add('active'), false);
    });
    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => dropzone.classList.remove('active'), false);
    });
    dropzone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleWatermarkFile(files[0]);
        }
    }, false);
}

function setupWatermarkImageDropzone() {
    const dropzone = document.getElementById('watermarkImageDropzone');
    const fileInput = document.getElementById('watermarkImageFile');
    dropzone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleWatermarkImageFile(e.target.files[0]);
        }
    });
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, preventDefaults, false);
    });
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => dropzone.classList.add('active'), false);
    });
    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => dropzone.classList.remove('active'), false);
    });
    dropzone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleWatermarkImageFile(files[0]);
        }
    }, false);
}

function handleWatermarkFile(file) {
    if (file.type !== 'application/pdf') {
        showToast('Please upload a PDF file', 'error');
        return;
    }
    watermarkFile = file;
    document.getElementById('watermarkDropzone').classList.add('hidden');
    document.getElementById('watermarkPreview').classList.remove('hidden');
}

function handleWatermarkImageFile(file) {
    if (!file.type.startsWith('image/')) {
        showToast('Please upload an image file', 'error');
        return;
    }
    watermarkImageFile = file;
    showToast('Watermark image uploaded successfully', 'info');
}

function toggleWatermarkType() {
    const isText = document.querySelector('input[name="watermarkType"][value="text"]').checked;
    document.getElementById('textWatermarkOptions').classList.toggle('hidden', !isText);
    document.getElementById('imageWatermarkOptions').classList.toggle('hidden', isText);
}

async function processWatermark() {
    if (!watermarkFile) {
        showToast('Please upload a PDF file first', 'error');
        return;
    }
    const isText = document.querySelector('input[name="watermarkType"][value="text"]').checked;
    if (isText && !document.getElementById('watermarkText').value) {
        showToast('Please enter watermark text', 'error');
        return;
    }
    if (!isText && !watermarkImageFile) {
        showToast('Please upload a watermark image', 'error');
        return;
    }
    showProcessing('Adding watermark to PDF', 'Please wait while we add the watermark to your PDF...');
    try {
        const { PDFDocument } = PDFLib;
        const fileBytes = await readFileAsArrayBuffer(watermarkFile);
        const pdfDoc = await PDFDocument.load(fileBytes);
        const totalPages = pdfDoc.getPageCount();
        const pagesInput = document.getElementById('watermarkPages').value;
        const pages = parsePageRanges(pagesInput, totalPages);
        if (isText) {
            const text = document.getElementById('watermarkText').value;
            const fontSize = parseInt(document.getElementById('watermarkFontSize').value);
            const opacity = parseFloat(document.getElementById('watermarkOpacity').value);
            const colorHex = document.getElementById('watermarkColor').value;
            const rgb = PDFLib.rgb(
                parseInt(colorHex.slice(1, 3), 16) / 255,
                parseInt(colorHex.slice(3, 5), 16) / 255,
                parseInt(colorHex.slice(5, 7), 16) / 255
            );
            const helvetica = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
            pages.forEach(pageNum => {
                const page = pdfDoc.getPage(pageNum - 1);
                const { width, height } = page.getSize();
                page.drawText(text, {
                    x: width / 2,
                    y: height / 2,
                    size: fontSize,
                    font: helvetica,
                    color: rgb,
                    opacity,
                    rotate: PDFLib.degrees(45),
                });
                updateProgress((pageNum / pages.length) * 100);
            });
        } else {
            const imageBytes = await readFileAsArrayBuffer(watermarkImageFile);
            let image;
            if (watermarkImageFile.type === 'image/png') {
                image = await pdfDoc.embedPng(imageBytes);
            } else {
                image = await pdfDoc.embedJpg(imageBytes);
            }
            const opacity = parseFloat(document.getElementById('imageWatermarkOpacity').value);
            pages.forEach(pageNum => {
                const page = pdfDoc.getPage(pageNum - 1);
                const { width, height } = page.getSize();
                const imgDims = image.scale(0.5);
                page.drawImage(image, {
                    x: width / 2 - imgDims.width / 2,
                    y: height / 2 - imgDims.height / 2,
                    width: imgDims.width,
                    height: imgDims.height,
                    opacity,
                });
                updateProgress((pageNum / pages.length) * 100);
            });
        }
        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        hideProcessing();
        showResult('Watermark Added Successfully', 'Your PDF has been watermarked.', blob, 'watermarked.pdf');
    } catch (error) {
        hideProcessing();
        showToast('Error adding watermark: ' + error.message, 'error');
        console.error('Watermark error:', error);
    }
}