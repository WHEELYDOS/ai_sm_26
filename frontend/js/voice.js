/**
 * voice.js - Voice Input Module with Vosk Support
 * Offline-first voice recognition
 */

const voice = {
    recognition: null,
    isListening: false,
    transcript: '',
    useVosk: false,
    voskRecognizer: null,
    audioContext: null,
    mediaStream: null,

    /**
     * Initialize voice module
     */
    init() {
        this.setupVoiceButton();
        this.checkVoskAvailability();
    },

    /**
     * Check if Vosk models are cached
     */
    async checkVoskAvailability() {
        try {
            const cache = await caches.open('vosk-models');
            const keys = await cache.keys();
            this.useVosk = keys.length > 0;

            if (this.useVosk) {
                console.log('Vosk models available');
            } else {
                console.log('Using Web Speech API (online only)');
                this.initWebSpeech();
            }
        } catch (e) {
            console.log('Cache API not available, using Web Speech API');
            this.initWebSpeech();
        }
    },

    /**
     * Initialize Web Speech API as fallback
     */
    initWebSpeech() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            console.warn('Speech Recognition not supported');
            this.disableVoiceButton();
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;

        this.recognition.onstart = () => {
            this.isListening = true;
            this.updateStatus('Recording...', 'recording');
            this.updateButton(true);
        };

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

            this.displayTranscript(this.transcript, interimTranscript);
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.updateStatus(`Error: ${event.error}`, 'error');
        };

        this.recognition.onend = () => {
            this.isListening = false;
            this.updateStatus('Recording stopped', 'stopped');
            this.updateButton(false);

            if (this.transcript) {
                this.populateDiagnosis(this.transcript.trim());
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
    async startRecording() {
        const langSelect = document.getElementById('voice-language');
        const lang = langSelect ? langSelect.value : 'en-IN';

        this.transcript = '';

        if (this.useVosk) {
            await this.startVoskRecording(lang);
        } else if (this.recognition) {
            this.recognition.lang = lang;
            this.recognition.start();
        } else {
            this.updateStatus('Voice input not available', 'error');
        }
    },

    /**
     * Stop voice recording
     */
    stopRecording() {
        if (this.useVosk) {
            this.stopVoskRecording();
        } else if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
    },

    /**
     * Start Vosk recording (for offline use)
     */
    async startVoskRecording(lang) {
        try {
            this.updateStatus('Starting offline recognition...', 'recording');
            this.updateButton(true);
            this.isListening = true;

            // Get model path based on language
            const modelPath = lang === 'hi-IN' 
                ? '/models/vosk-model-small-hi-0.22'
                : '/models/vosk-model-small-en-in-0.4';

            // Check if Vosk is loaded
            if (typeof Vosk === 'undefined') {
                // Load Vosk dynamically
                await this.loadVoskScript();
            }

            // Create model
            const model = await Vosk.createModel(modelPath);
            this.voskRecognizer = new model.KaldiRecognizer(16000);

            // Setup audio
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
            this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    channelCount: 1,
                    sampleRate: 16000
                }
            });

            const source = this.audioContext.createMediaStreamSource(this.mediaStream);
            const processor = this.audioContext.createScriptProcessor(4096, 1, 1);

            processor.onaudioprocess = (event) => {
                if (!this.isListening) return;

                const data = event.inputBuffer.getChannelData(0);
                const int16Data = new Int16Array(data.length);

                for (let i = 0; i < data.length; i++) {
                    int16Data[i] = Math.max(-32768, Math.min(32767, data[i] * 32768));
                }

                if (this.voskRecognizer.acceptWaveform(int16Data)) {
                    const result = this.voskRecognizer.result();
                    if (result.text) {
                        this.transcript += result.text + ' ';
                        this.displayTranscript(this.transcript, '');
                    }
                } else {
                    const partial = this.voskRecognizer.partialResult();
                    if (partial.partial) {
                        this.displayTranscript(this.transcript, partial.partial);
                    }
                }
            };

            source.connect(processor);
            processor.connect(this.audioContext.destination);

            this.updateStatus('Recording (offline mode)...', 'recording');

        } catch (error) {
            console.error('Vosk recording error:', error);
            this.updateStatus('Error: ' + error.message, 'error');
            this.isListening = false;
            this.updateButton(false);

            // Fallback to Web Speech API
            if (navigator.onLine) {
                this.initWebSpeech();
                if (this.recognition) {
                    this.recognition.start();
                }
            }
        }
    },

    /**
     * Stop Vosk recording
     */
    stopVoskRecording() {
        this.isListening = false;

        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
        }

        if (this.audioContext) {
            this.audioContext.close();
        }

        this.updateStatus('Recording stopped', 'stopped');
        this.updateButton(false);

        if (this.transcript) {
            this.populateDiagnosis(this.transcript.trim());
        }
    },

    /**
     * Load Vosk script dynamically
     */
    loadVoskScript() {
        return new Promise((resolve, reject) => {
            if (typeof Vosk !== 'undefined') {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = '/js/vosk.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    },

    /**
     * Download voice models
     */
    async downloadModels(language, onProgress) {
        const modelUrls = {
            'en': '/models/vosk-model-small-en-in-0.4',
            'hi': '/models/vosk-model-small-hi-0.22'
        };

        const modelUrl = modelUrls[language];
        if (!modelUrl) {
            throw new Error('Unknown language');
        }

        try {
            const cache = await caches.open('vosk-models');

            // Fetch model files
            const response = await fetch(modelUrl + '/final.mdl');
            if (!response.ok) throw new Error('Model not found');

            await cache.put(modelUrl + '/final.mdl', response);

            this.useVosk = true;
            return true;
        } catch (error) {
            console.error('Model download failed:', error);
            throw error;
        }
    },

    /**
     * Update voice status display
     */
    updateStatus(message, status) {
        const statusEl = document.getElementById('voice-status');
        if (statusEl) {
            statusEl.textContent = message;
            statusEl.className = `voice-status status-${status}`;
        }
    },

    /**
     * Update voice button state
     */
    updateButton(isRecording) {
        const btn = document.getElementById('voice-btn');
        if (!btn) return;

        if (isRecording) {
            btn.classList.add('recording');
            btn.querySelector('span:last-child').textContent = 'Stop Recording';
        } else {
            btn.classList.remove('recording');
            btn.querySelector('span:last-child').textContent = 'Start Recording';
        }
    },

    /**
     * Display transcript
     */
    displayTranscript(finalText, interimText) {
        const voiceText = document.getElementById('voice-text');
        if (voiceText) {
            voiceText.innerHTML = `
                <span class="final-transcript">${finalText}</span>
                <span class="interim-transcript">${interimText}</span>
            `;
        }
    },

    /**
     * Populate diagnosis field
     */
    populateDiagnosis(text) {
        const diagnosisField = document.getElementById('diagnosis');
        if (diagnosisField) {
            if (diagnosisField.value) {
                diagnosisField.value += '\n' + text;
            } else {
                diagnosisField.value = text;
            }
        }
    },

    /**
     * Clear transcript
     */
    clearTranscript() {
        this.transcript = '';
        const voiceText = document.getElementById('voice-text');
        if (voiceText) {
            voiceText.innerHTML = '';
        }
    },

    /**
     * Disable voice button
     */
    disableVoiceButton() {
        const btn = document.getElementById('voice-btn');
        if (btn) {
            btn.disabled = true;
            btn.title = 'Voice input not available';
        }
        this.updateStatus('Voice input not available', 'error');
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => voice.init());
