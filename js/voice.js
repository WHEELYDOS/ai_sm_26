/**
 * voice.js - Voice Input Module
 * Handles voice recording and speech-to-text conversion
 * Uses Web Speech API for voice input
 */

const voice = {
    // Speech recognition instance
    recognition: null,
    isListening: false,
    transcript: '',

    /**
     * Initialize voice module
     */
    init() {
        // Check browser support for Web Speech API
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            console.warn('Speech Recognition API not supported in this browser');
            this.disableVoiceButton();
            return;
        }

        this.recognition = new SpeechRecognition();
        this.setupRecognitionEvents();
        this.setupVoiceButton();
    },

    /**
     * Setup speech recognition event listeners
     */
    setupRecognitionEvents() {
        // Start event
        this.recognition.onstart = () => {
            this.isListening = true;
            this.updateVoiceStatus('Recording...', 'recording');
            console.log('Voice recording started');
        };

        // Result event - captures interim and final results
        this.recognition.onresult = (event) => {
            let interimTranscript = '';
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                
                if (event.results[i].isFinal) {
                    this.transcript += transcript + ' ';
                } else {
                    interimTranscript += transcript;
                }
            }

            // Display results
            const voiceTextElement = document.getElementById('voice-text');
            if (voiceTextElement) {
                voiceTextElement.innerHTML = `
                    <div class="final-transcript">${this.transcript}</div>
                    <div class="interim-transcript">${interimTranscript}</div>
                `;
            }
        };

        // Error event
        this.recognition.onerror = (event) => {
            console.error('Voice recognition error:', event.error);
            this.updateVoiceStatus(`Error: ${event.error}`, 'error');
        };

        // End event
        this.recognition.onend = () => {
            this.isListening = false;
            this.updateVoiceStatus('Recording stopped', 'stopped');
            console.log('Voice recording ended');
            
            // Update form with transcript if available
            if (this.transcript) {
                this.populateDiagnosisField(this.transcript);
            }
        };
    },

    /**
     * Setup voice button event listeners
     */
    setupVoiceButton() {
        const voiceBtn = document.getElementById('voice-btn');
        if (!voiceBtn) return;

        voiceBtn.addEventListener('click', (e) => {
            e.preventDefault();
            
            if (this.isListening) {
                this.stopRecording();
            } else {
                this.startRecording();
            }
        });
    },

    /**
     * Start voice recording
     */
    startRecording() {
        if (!this.recognition) {
            console.error('Speech Recognition not available');
            return;
        }

        this.transcript = '';
        this.recognition.language = i18n.getLang() === 'hi' ? 'hi-IN' : 'en-US';
        this.recognition.start();
        
        // Update button UI
        const voiceBtn = document.getElementById('voice-btn');
        if (voiceBtn) {
            voiceBtn.classList.add('recording');
            voiceBtn.querySelector('[data-i18n]').setAttribute('data-i18n', 'stop_recording');
            i18n.applyLanguage(i18n.currentLang);
        }
    },

    /**
     * Stop voice recording
     */
    stopRecording() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
            
            // Update button UI
            const voiceBtn = document.getElementById('voice-btn');
            if (voiceBtn) {
                voiceBtn.classList.remove('recording');
                voiceBtn.querySelector('[data-i18n]').setAttribute('data-i18n', 'start_recording');
                i18n.applyLanguage(i18n.currentLang);
            }
        }
    },

    /**
     * Update voice status display
     * @param {string} message - Status message
     * @param {string} status - Status type (recording, stopped, error)
     */
    updateVoiceStatus(message, status) {
        const statusElement = document.getElementById('voice-status');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = `voice-status status-${status}`;
        }
    },

    /**
     * Populate diagnosis field with voice transcript
     * @param {string} transcript - Transcribed text
     */
    populateDiagnosisField(transcript) {
        const diagnosisField = document.getElementById('diagnosis');
        if (diagnosisField) {
            // Append transcript to existing content with a space
            if (diagnosisField.value) {
                diagnosisField.value += '\n' + transcript;
            } else {
                diagnosisField.value = transcript;
            }
        }
    },

    /**
     * Get current transcript
     * @returns {string} - Current transcript
     */
    getTranscript() {
        return this.transcript;
    },

    /**
     * Clear transcript
     */
    clearTranscript() {
        this.transcript = '';
        const voiceTextElement = document.getElementById('voice-text');
        if (voiceTextElement) {
            voiceTextElement.innerHTML = '';
        }
    },

    /**
     * Disable voice button if not supported
     */
    disableVoiceButton() {
        const voiceBtn = document.getElementById('voice-btn');
        if (voiceBtn) {
            voiceBtn.disabled = true;
            voiceBtn.title = 'Voice input not supported in your browser';
            const statusElement = document.getElementById('voice-status');
            if (statusElement) {
                statusElement.textContent = 'Voice input not supported';
                statusElement.className = 'voice-status status-error';
            }
        }
    },

    /**
     * Check if speech recognition is available
     * @returns {boolean} - True if available
     */
    isAvailable() {
        return !!this.recognition;
    }
};

// Initialize voice module when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => voice.init());
} else {
    voice.init();
}
