document.addEventListener('DOMContentLoaded', () => {
    // Structural Drawer Selectors
    const menuToggle = document.getElementById('menu-toggle');
    const closeSidebar = document.getElementById('close-sidebar');
    const sidebarDrawer = document.getElementById('sidebar-drawer');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    // Standard Functional Component Selectors
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const uploadText = document.getElementById('upload-text');
    const filePill = document.getElementById('file-pill');
    const fileNameDisplay = document.getElementById('file-name');
    const removeFileBtn = document.getElementById('remove-file');
    const promptInput = document.getElementById('prompt-input');
    const sendBtn = document.getElementById('send-btn');
    const chatHistory = document.getElementById('chat-history');
    const optionCards = document.querySelectorAll('.option-card');
    
    let activeFile = null;

    // Responsive Drawer Interaction Logic
    function openDrawer() {
        sidebarDrawer.classList.add('open');
        sidebarOverlay.classList.add('active');
        document.body.style.overflow = 'hidden'; // Lock scrolling background
    }

    function closeDrawer() {
        sidebarDrawer.classList.remove('open');
        sidebarOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    menuToggle.addEventListener('click', openDrawer);
    closeSidebar.addEventListener('click', closeDrawer);
    sidebarOverlay.addEventListener('click', closeDrawer);

    // Mock dataset matching Merlin configurations
    const mockDatabase = {
        radiology_report: {
            text: "The 3D volumetric analysis reveals a distinct, irregular soft-tissue nodule localized within the peripheral zone of the right lower pulmonary lobe, measuring roughly 14.2mm. Prominent ground-glass opacity mapping is observed flanking the primary region. No distinct calcification patterns are detected. The adjacent hilar structural profiles remain stable within regular limits.",
            json: {
                status: "success",
                task_executed: "radiology_report",
                metadata: { volume_shape: [512, 512, 164], pipeline: "merlin-3d-report-v2" }
            }
        },
        five_year_risk: {
            text: "Predictive validation mapping evaluated cross-sectional target metrics against known indicators. The system identifies a high probability trajectory regarding type-2 metabolic degradation signatures over a 60-month window.",
            metrics: [
                { name: "Metabolic Pathway Imbalance", value: "84%", critical: true },
                { name: "Cardiovascular Stress Projection", value: "41%", critical: false },
                { name: "Osteoporosis Structural Index", value: "19%", critical: false }
            ],
            json: {
                status: "success",
                task_executed: "five_year_risk",
                scores: { metabolic_t2: 0.84, cardiovascular: 0.41, skeletal_ost: 0.19 }
            }
        },
        phenotype_classification: {
            text: "Automated extraction maps structural phenotype properties against clinical classification sets.",
            metrics: [
                { name: "ICD-10 R91.1 (Solitary Pulmonary Nodule)", value: "Match Confirmed", critical: true },
                { name: "ICD-10 J98.4 (Other Lung Diseases)", value: "Low Correlation", critical: false }
            ],
            json: {
                status: "success",
                task_executed: "phenotype_mapping",
                icd_alignments: [{ code: "R91.1", confidence: 0.96 }, { code: "J98.4", confidence: 0.12 }]
            }
        },
        zero_shot_findings: {
            text: "Target verification query completed. The system evaluated the volume using the custom zero-shot prompt criteria specified.",
            json: {
                status: "success",
                task_executed: "zero_shot_query",
                target_detected: true,
                relative_bounding_box_voxels: { min: [210, 140, 88], max: [238, 172, 102] }
            }
        }
    };

    // UI Handle: Radio buttons option layout switching
    optionCards.forEach(card => {
        card.addEventListener('click', () => {
            optionCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            card.querySelector('input[type="radio"]').checked = true;
            
            // Auto collapse drawer on mobile selection to focus immediately on results
            if (window.innerWidth <= 768) {
                setTimeout(closeDrawer, 150);
            }
        });
    });

    // File Management Interaction
    dropZone.addEventListener('click', () => { if(!activeFile) fileInput.click(); });
    
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if(e.dataTransfer.files.length > 0) handleFileSelection(e.dataTransfer.files[0]);
    });

    fileInput.addEventListener('change', (e) => {
        if(e.target.files.length > 0) handleFileSelection(e.target.files[0]);
    });

    function handleFileSelection(file) {
        activeFile = file;
        uploadText.classList.add('hidden');
        document.querySelector('.upload-icon').classList.add('hidden');
        filePill.classList.remove('hidden');
        fileNameDisplay.textContent = file.name;
        validateInputState();
    }

    removeFileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        activeFile = null;
        fileInput.value = '';
        filePill.classList.add('hidden');
        uploadText.classList.remove('hidden');
        document.querySelector('.upload-icon').classList.remove('hidden');
        validateInputState();
    });

    // Input Validation & Auto Expansion
    promptInput.addEventListener('input', () => {
        validateInputState();
        promptInput.style.height = 'auto';
        promptInput.style.height = Math.min(promptInput.scrollHeight, 120) + 'px';
    });

    function validateInputState() {
        sendBtn.disabled = !(activeFile && promptInput.value.trim().length > 0);
    }

    // Submission Processing
    sendBtn.addEventListener('click', () => {
        const queryText = promptInput.value.trim();
        const selectedTask = document.querySelector('input[name="merlin-task"]:checked').value;
        
        if(!queryText || !activeFile) return;

        // Clean initial state screen if welcome text is visible
        const welcome = document.querySelector('.system-welcome');
        if(welcome) welcome.remove();

        // 1. Render User Message Node
        appendMessage('user', `<p><strong>Query Task Parameters:</strong></p><p>${queryText}</p><div class="structured-block">Dataset Ref: ${activeFile.name}</div>`);
        
        promptInput.value = '';
        promptInput.style.height = 'auto';
        validateInputState();

        // 2. Provision Pending Indicator from Server
        const loadingId = appendMessage('assistant', `
            <div class="spinner">
                <span></span><span></span><span></span>
            </div>
            <span style="font-size:12px; color:var(--text-muted); margin-left:8px;">Mapping tensor blocks...</span>
        `);

        // Smooth scroll view context
        chatHistory.scrollTop = chatHistory.scrollHeight;

        // 3. Trigger Mock Delay
        setTimeout(() => {
            const loadingNode = document.getElementById(loadingId);
            if(loadingNode) loadingNode.remove();

            const mockData = mockDatabase[selectedTask];
            let responseHTML = `<p>${mockData.text}</p>`;

            if(mockData.metrics) {
                responseHTML += `<div class="metrics-grid">`;
                mockData.metrics.forEach(m => {
                    responseHTML += `
                        <div class="metric-item">
                            <span class="metric-meta">${m.name}</span>
                            <span class="metric-val ${m.critical ? 'high-risk' : ''}">${m.value}</span>
                        </div>`;
                });
                responseHTML += `</div>`;
            }

            responseHTML += `<div class="structured-block">${JSON.stringify(mockData.json, null, 2)}</div>`;

            appendMessage('assistant', responseHTML);
            chatHistory.scrollTop = chatHistory.scrollHeight;

        }, 2200);
    });

    function appendMessage(sender, content) {
        const messageId = 'msg-' + Math.random().toString(36).substr(2, 9);
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${sender}`;
        bubble.id = messageId;

        const avatarIcon = sender === 'user' ? 'fa-user-md' : 'fa-brain';
        
        bubble.innerHTML = `
            <div class="bubble-avatar">
                <i class="fa-solid ${avatarIcon}"></i>
            </div>
            <div class="bubble-content">
                ${content}
            </div>
        `;
        
        chatHistory.appendChild(bubble);
        return messageId;
    }
});