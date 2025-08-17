document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const chatForm = document.getElementById('chat-form');
    const messageInput = document.getElementById('message-input');
    const chatMessages = document.getElementById('chat-messages');
    const clearChatBtn = document.getElementById('clear-chat-btn');
    const newChatBtn = document.getElementById('new-chat-btn');
    const uploadResumeBtn = document.getElementById('upload-resume-btn');
    const settingsBtn = document.getElementById('settings-btn');
    const resumeModal = new bootstrap.Modal(document.getElementById('resumeModal'));
    const settingsModal = new bootstrap.Modal(document.getElementById('settingsModal'));
    const resumeUploadBtn = document.getElementById('resume-upload-btn');
    const resumeFile = document.getElementById('resume-file');
    const resumePreview = document.getElementById('resume-preview');
    const resumeFilename = document.getElementById('resume-filename');
    const removeResumeBtn = document.getElementById('remove-resume-btn');
    const loadingOverlay = document.getElementById('loading-overlay');
    const animationToggle = document.getElementById('animation-toggle');
    const themeSelect = document.getElementById('theme-select');
    
    // Session management
    let sessionId = generateSessionId();
    let resumeData = null;
    let messages = [];
    
    // Create shooting stars
    createShootingStars();
    
    // Initialize auto-resizing for textarea
    messageInput.addEventListener('input', autoResizeTextarea);
    
    // Event Listeners
    chatForm.addEventListener('submit', handleChatSubmit);
    clearChatBtn.addEventListener('click', clearChat);
    newChatBtn.addEventListener('click', startNewChat);
    uploadResumeBtn.addEventListener('click', () => resumeModal.show());
    settingsBtn.addEventListener('click', () => settingsModal.show());
    resumeUploadBtn.addEventListener('click', handleResumeUpload);
    removeResumeBtn.addEventListener('click', removeResume);
    
    // Add event listeners for copy buttons
    document.addEventListener('click', function(e) {
        if (e.target && e.target.closest('.copy-message-btn')) {
            const messageEl = e.target.closest('.message');
            const messageText = messageEl.querySelector('.message-text').innerText;
            copyToClipboard(messageText);
            
            // Show copy feedback
            const copyBtn = e.target.closest('.copy-message-btn');
            const originalIcon = copyBtn.innerHTML;
            copyBtn.innerHTML = '<i class="bi bi-check"></i>';
            setTimeout(() => {
                copyBtn.innerHTML = originalIcon;
            }, 2000);
        }
    });
    
    // Settings event listeners
    animationToggle.addEventListener('change', function() {
        const particlesContainer = document.getElementById('particles-js');
        const shootingStars = document.querySelectorAll('.shooting-star');
        
        if (this.checked) {
            particlesContainer.style.display = 'block';
            document.querySelector('.glow-container').style.display = 'block';
            shootingStars.forEach(star => star.style.display = 'block');
        } else {
            particlesContainer.style.display = 'none';
            document.querySelector('.glow-container').style.display = 'none';
            shootingStars.forEach(star => star.style.display = 'none');
        }
        
        // Save preference
        localStorage.setItem('animation-enabled', this.checked);
    });
    
    themeSelect.addEventListener('change', function() {
        // Theme switching could be implemented here
        localStorage.setItem('theme-preference', this.value);
    });
    
    // Load saved preferences
    function loadPreferences() {
        const animationEnabled = localStorage.getItem('animation-enabled');
        if (animationEnabled !== null) {
            animationToggle.checked = animationEnabled === 'true';
            if (animationEnabled === 'false') {
                document.getElementById('particles-js').style.display = 'none';
                document.querySelector('.glow-container').style.display = 'none';
                const shootingStars = document.querySelectorAll('.shooting-star');
                shootingStars.forEach(star => star.style.display = 'none');
            }
        }
        
        const themePreference = localStorage.getItem('theme-preference');
        if (themePreference) {
            themeSelect.value = themePreference;
            // Apply theme changes here
        }
    }
    
    // Create shooting stars
    function createShootingStars() {
        const container = document.body;
        for (let i = 1; i <= 3; i++) {
            const star = document.createElement('div');
            star.className = 'shooting-star';
            star.style.top = `${Math.random() * 70}%`;
            container.appendChild(star);
        }
    }
    
    // Call to load preferences
    loadPreferences();

    // Auto-resize textarea as user types
    function autoResizeTextarea() {
        this.style.height = 'auto';
        const newHeight = Math.min(this.scrollHeight, 150);
        this.style.height = newHeight + 'px';
    }
    
    // Generate random session ID
    function generateSessionId() {
        return 'session_' + Math.random().toString(36).substring(2, 15);
    }
    
    // Handle chat form submission
    async function handleChatSubmit(e) {
        e.preventDefault();
        
        const userMessage = messageInput.value.trim();
        if (!userMessage) return;
        
        // Add user message to chat
        addMessageToChat('user', userMessage);
        
        // Clear input
        messageInput.value = '';
        messageInput.style.height = 'auto';
        
        // Add message to array
        messages.push({
            role: 'user',
            content: userMessage
        });
        
        // Show typing indicator
        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'typing-indicator';
        typingIndicator.innerHTML = `
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        `;
        chatMessages.appendChild(typingIndicator);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        try {
            // Prepare the request
            const requestData = {
                messages: messages,
                session_id: sessionId
            };
            
            // Send request to backend
            const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData)
            });
            
            // Remove typing indicator
            typingIndicator.remove();
            
            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Add AI response to messages array
            messages.push({
                role: 'assistant',
                content: data.response
            });
            
            // Add AI response to chat
            addMessageToChat('ai', data.response);
            
        } catch (error) {
            // Remove typing indicator
            typingIndicator.remove();
            
            console.error('Error:', error);
            // Add error message
            addMessageToChat('ai', 'Sorry, I encountered an error while processing your request. Please try again.');
        }
    }
    
    // Add message to chat
    function addMessageToChat(role, content) {
        const messageEl = document.createElement('div');
        messageEl.className = `message ${role}-message`;
        
        let avatarIcon = role === 'user' ? 'person' : 'robot';
        
        messageEl.innerHTML = `
            <div class="message-avatar">
                <i class="bi bi-${avatarIcon}"></i>
            </div>
            <div class="message-content">
                <div class="message-text">
                    <p>${formatMessageContent(content)}</p>
                </div>
                <div class="message-actions">
                    <button class="copy-message-btn" title="Copy message">
                        <i class="bi bi-clipboard"></i>
                    </button>
                </div>
            </div>
        `;
        
        chatMessages.appendChild(messageEl);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // Format message content (handle line breaks, code blocks, etc.)
    function formatMessageContent(content) {
        // Replace line breaks with <br>
        let formattedContent = content.replace(/\n/g, '<br>');
        
        // Simple code block formatting
        formattedContent = formattedContent.replace(/```(.+?)```/gs, '<pre><code>$1</code></pre>');
        
        return formattedContent;
    }
    
    // Clear chat
    function clearChat() {
        // Confirm before clearing
        if (confirm('Are you sure you want to clear the chat history?')) {
            // Keep the welcome message
            const welcomeMessage = chatMessages.querySelector('.message');
            chatMessages.innerHTML = '';
            chatMessages.appendChild(welcomeMessage);
            
            // Reset messages array but keep the welcome message
            messages = [];
            
            // Send request to clear chat session on server
            fetch('/clear-chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `session_id=${sessionId}`
            }).catch(error => {
                console.error('Error clearing chat session:', error);
            });
            
            // Update chat history
            updateChatHistory();
        }
    }
    
    // Start new chat
    function startNewChat() {
        // Reset
        sessionId = generateSessionId();
        messages = [];
        
        // Clear chat messages except welcome
        clearChat();
        
        // Update UI
        document.getElementById('current-chat-title').textContent = 'General Assistant';
    }
    
    // Handle resume upload
    function handleResumeUpload() {
        const file = resumeFile.files[0];
        if (!file) {
            alert('Please select a file first.');
            return;
        }
        
        if (file.type !== 'application/pdf') {
            alert('Please upload a PDF file.');
            return;
        }
        
        // Create form data
        const formData = new FormData();
        formData.append('file', file);
        formData.append('session_id', sessionId);
        
        // Show loading overlay
        loadingOverlay.classList.add('active');
        
        // Send to backend
        fetch('/upload-resume', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Resume upload failed');
            }
            return response.json();
        })
        .then(data => {
            // Store resume data
            resumeData = {
                name: file.name,
                size: file.size,
                type: file.type
            };
            
            // Update UI
            resumeFilename.textContent = file.name;
            resumePreview.style.display = 'flex';
            
            // Add AI message to chat about resume
            addMessageToChat('ai', data.analysis || `I've analyzed your resume "${file.name}". How can I help you with it?`);
            
            // Hide modal and loading
            resumeModal.hide();
            loadingOverlay.classList.remove('active');
            
            // Reset file input
            resumeFile.value = '';
        })
        .catch(error => {
            console.error('Error uploading resume:', error);
            loadingOverlay.classList.remove('active');
            alert('Failed to upload resume. Please try again.');
            resumeFile.value = '';
        });
    }
    
    // Remove resume
    function removeResume() {
        resumeData = null;
        resumePreview.style.display = 'none';
        addMessageToChat('ai', 'Resume has been removed from the conversation context.');
    }
    
    // Copy to clipboard
    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).catch(err => {
            console.error('Could not copy text: ', err);
        });
    }
    
    // Update chat history in sidebar
    function updateChatHistory() {
        // This would normally load and display chat history
        const chatHistory = document.querySelector('.chat-history');
        
        // For demo, we'll just add the current chat
        if (chatHistory.children.length === 0) {
            const historyItem = document.createElement('div');
            historyItem.className = 'chat-history-item';
            historyItem.innerHTML = `
                <i class="bi bi-chat-dots"></i>
                <span>Current Chat</span>
            `;
            chatHistory.appendChild(historyItem);
        }
    }
    
    // Add the floating animation to logo
    function animateLogo() {
        const logo = document.querySelector('.logo-svg');
        if (logo) {
            logo.style.animation = 'float-logo 3s ease-in-out infinite';
        }
    }
    
    // Initialize chat history
    updateChatHistory();
    
    // Add floating animation to logo
    animateLogo();
});