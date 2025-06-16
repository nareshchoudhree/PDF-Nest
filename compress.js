let compressFile = null;

const ILOVEPDF_PUBLIC_KEY = 'project_public_02df13949d7b9e1c81445796bcc65fcd_CvnxYe5fac75914baf701b286dbb55d5515d2';
const ILOVEPDF_PRIVATE_KEY = 'secret_key_c177238d47f20e6efd7e0eb5728f950f_e1O1h21c4a248b7298d643fb45cab598cf929';

function resetCompressTool() {
    const preview = document.getElementById('compressPreview');
    const dropzone = document.getElementById('compressDropzone');
    const compressionLevel = document.getElementById('compressionLevel');
    
    if (!preview || !dropzone || !compressionLevel) {
        console.error('Missing UI elements for reset:', { preview, dropzone, compressionLevel });
        showToast('UI initialization error. Please refresh the page.', 'error');
        return;
    }

    preview.classList.add('hidden');
    dropzone.classList.remove('hidden');
    compressionLevel.value = 'medium';
    compressFile = null;
}

function setupCompressDropzone() {
    const dropzone = document.getElementById('compressDropzone');
    const fileInput = document.getElementById('compressFile');
    
    if (!dropzone || !fileInput) {
        console.error('Dropzone or file input not found:', { dropzone, fileInput });
        showToast('UI initialization error. Please refresh the page.', 'error');
        return;
    }

    const selectButton = dropzone.querySelector('button');
    if (selectButton) {
        selectButton.addEventListener('click', () => fileInput.click());
    } else {
        console.warn('Select button not found in dropzone');
    }

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleCompressFile(e.target.files[0]);
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
        dropzone.addEventListener(eventName, () => dropzone.classList.add('active'));
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => dropzone.classList.remove('active'));
    });

    dropzone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleCompressFile(files[0]);
        }
    });
}

function handleCompressFile(file) {
    if (file.type !== 'application/pdf') {
        showToast('Please upload a PDF file', 'error');
        return;
    }
    
    compressFile = file;
    const dropzone = document.getElementById('compressDropzone');
    const preview = document.getElementById('compressPreview');
    
    if (!dropzone || !preview) {
        console.error('Dropzone or preview not found:', { dropzone, preview });
        showToast('UI error. Please refresh the page.', 'error');
        return;
    }

    dropzone.classList.add('hidden');
    preview.classList.remove('hidden');
}

async function processCompress() {
    if (!compressFile) {
        showToast('Please upload a PDF file first', 'error');
        return;
    }

    showProcessing('Compressing PDF file', 'Please wait while we compress your PDF file...');

    try {
        // Step 1: Get authentication token
        const tokenResponse = await fetch('https://api.ilovepdf.com/v1/auth', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                public_key: ILOVEPDF_PUBLIC_KEY
            })
        });

        if (!tokenResponse.ok) {
            throw new Error(`Failed to authenticate: ${tokenResponse.statusText}`);
        }

        const { token } = await tokenResponse.json();

        // Step 2: Start compression task
        const startResponse = await fetch('https://api.ilovepdf.com/v1/start/compress', {
            headers: {
                'Authorization': `Bearer ${token}`,
            }
        });

        if (!startResponse.ok) {
            throw new Error(`Failed to start compression task: ${startResponse.statusText}`);
        }

        const { server, task } = await startResponse.json();

        // Step 3: Upload file
        const formData = new FormData();
        formData.append('task', task);
        formData.append('file', compressFile);

        const uploadResponse = await fetch(`https://${server}/v1/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            body: formData
        });

        if (!uploadResponse.ok) {
            throw new Error(`Failed to upload file: ${uploadResponse.statusText}`);
        }

        const uploadResult = await uploadResponse.json();
        const serverFilename = uploadResult.server_filename;

        // Step 4: Set compression level
        const compressionLevel = document.getElementById('compressionLevel').value || 'medium';
        const compressionParams = {
            low: 'low',
            medium: 'recommended',
            high: 'extreme'
        };

        const processResponse = await fetch(`https://${server}/v1/process`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                task: task,
                tool: 'compress',
                files: [{
                    server_filename: serverFilename,
                    filename: compressFile.name
                }],
                compression_level: compressionParams[compressionLevel]
            })
        });

        if (!processResponse.ok) {
            throw new Error(`Failed to process compression: ${processResponse.statusText}`);
        }

        // Step 5: Download compressed file
        const downloadResponse = await fetch(`https://${server}/v1/download/${task}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!downloadResponse.ok) {
            throw new Error(`Failed to download compressed file: ${downloadResponse.statusText}`);
        }

        const compressedBlob = await downloadResponse.blob();
        const originalSize = compressFile.size;
        const compressedSize = compressedBlob.size;
        const sizeReduction = ((originalSize - compressedSize) / originalSize) * 100;

        hideProcessing();
        showResult(
            'PDF Compressed Successfully',
            `Your PDF file has been compressed (compression level: ${compressionLevel}, Original: ${(originalSize / 1024).toFixed(2)} KB, Compressed: ${(compressedSize / 1024).toFixed(2)} KB, Reduction: ${sizeReduction.toFixed(2)}%)`,
            compressedBlob,
            `compressed_${compressFile.name}`
        );

        // Reset after successful compression
        resetCompressTool();
    } catch (error) {
        hideProcessing();
        showToast(`Error compressing PDF: ${error.message}`, 'error');
        console.error('Compression error:', error);
    }
}

// Helper functions for UI (unchanged)
function showToast(message, type) {
    const toast = document.getElementById('toast');
    const toastIcon = document.getElementById('toastIcon');
    const toastMessage = document.getElementById('toastMessage');
    
    if (!toast || !toastIcon || !toastMessage) {
        console.error('Toast elements not found:', { toast, toastIcon, toastMessage });
        return;
    }

    toastMessage.textContent = message;
    toast.className = `toast ${type === 'error' ? 'bg-red-400' : type === 'warning' ? 'bg-yellow-400' : 'bg-green-600'} text-white px-4 py-2 rounded-md shadow-lg`;
    toastIcon.className = `fas ${type === 'error' ? 'fa-exclamation-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-check-circle'} mr-2`;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function showProcessing(title, message) {
    const modal = document.getElementById('processingModal');
    const titleEl = document.getElementById('processingTitle');
    const messageEl = document.getElementById('processingMessage');
    
    if (!modal || !titleEl || !messageEl) {
        console.error('Processing modal elements not found:', { modal, titleEl, messageEl });
        showToast('UI error. Please refresh the page.', 'error');
        return;
    }

    titleEl.textContent = title;
    messageEl.textContent = message;
    modal.classList.remove('hidden');
}

function hideProcessing() {
    const modal = document.getElementById('processingModal');
    if (modal) {
        modal.classList.add('hidden');
        updateProgress(0);
    }
}

function updateProgress(percentage) {
    const progressBar = document.querySelector('#progressBar > div');
    if (progressBar) {
        progressBar.style.width = `${percentage}%`;
    }
}

function showResult(title, message, blob, filename) {
    const modal = document.getElementById('resultModal');
    const titleEl = document.getElementById('resultTitle');
    const messageEl = document.getElementById('resultMessage');
    const downloadLink = document.getElementById('downloadResult');
    
    if (!modal || !titleEl || !messageEl || !downloadLink) {
    console.error('Result modal elements not found:', { modal, titleEl, messageEl, downloadLink });
    showToast('UI error. Please refresh the page.', 'error');
    return;
}

    titleEl.textContent = title;
    messageEl.textContent = message;
    const blobUrl = blob;
    downloadLink.href = URL.createObjectURL(blobUrl);
    downloadLink.setAttribute('download', filename);
    downloadLink.onclick = (e) => {
        e.preventDefault();
        if (typeof saveAs === 'function') {
            saveAs(blob, filename);
        } else {
            console.error('FileSaver.js not loaded');
            showToast('Download error: FileSaver.js not found.', 'error');
        }
        URL.revokeObjectURL(blobUrl);
        closeResultModal();
    };
    modal.classList.remove('hidden');
}

function closeResultModal() {
    const modal = document.getElementById('resultModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}