/**
 * i18n.js - Internationalization Module
 * Supports English and Hindi languages
 * Translates UI elements based on selected language
 */

const i18n = {
    // Current language
    currentLang: localStorage.getItem('language') || 'en',

    // Translation dictionary
    translations: {
        en: {
            // Header and Navigation
            'app-title': 'Patient EHR System',
            'dashboard': 'Dashboard',
            'new_record': 'New Record',
            'patients': 'Patients',
            'alerts': 'Alerts',
            
            // Dashboard
            'total_patients': 'Total Patients',
            'records_today': 'Records Today',
            'high_risk': 'High Risk Alerts',
            'avg_age': 'Average Age',
            'bp_distribution': 'Blood Pressure Distribution',
            'bmi_distribution': 'BMI Distribution',
            'recent_records': 'Recent Records',
            'no_records': 'No records yet',
            
            // Patient Form
            'patient_information': 'Patient Information',
            'personal_info': 'Personal Information',
            'first_name': 'First Name',
            'last_name': 'Last Name',
            'age': 'Age',
            'gender': 'Gender',
            'male': 'Male',
            'female': 'Female',
            'other': 'Other',
            'contact': 'Contact Number',
            'medical_info': 'Medical Information',
            'height': 'Height (cm)',
            'weight': 'Weight (kg)',
            'bp_systolic': 'BP Systolic (mmHg)',
            'bp_diastolic': 'BP Diastolic (mmHg)',
            'heart_rate': 'Heart Rate (bpm)',
            'blood_sugar': 'Blood Sugar (mg/dL)',
            'diagnosis': 'Diagnosis',
            'voice_input': 'Voice Input',
            'start_recording': 'Start Recording',
            'stop_recording': 'Stop Recording',
            'save': 'Save Record',
            'clear': 'Clear Form',
            'record_saved': 'Record saved successfully!',
            'record_error': 'Error saving record',
            
            // Patients List
            'patients_list': 'Patients List',
            'search_placeholder': 'Search patients...',
            'no_patients': 'No patients found',
            
            // Risk Alerts
            'risk_alerts': 'Risk Alerts',
            'no_alerts': 'No alerts at this time',
            'high_bp': 'High Blood Pressure',
            'high_blood_sugar': 'High Blood Sugar',
            'low_heart_rate': 'Low Heart Rate',
            'high_bmi': 'High BMI',
            
            // Delete & Actions
            'delete': 'Delete',
            'delete_patient': 'Delete Patient',
            'delete_record': 'Delete Record',
            'confirm_delete': 'Are you sure you want to delete this record?',
            'confirm_delete_patient': 'Are you sure? This will delete the patient and all their records.',
            'deleted_success': 'Record deleted successfully',
            'delete_error': 'Error deleting record',
            
            // Status Messages
            'online': 'Online',
            'offline': 'Offline',
            'sync_status': 'Data synced',
            'footer_text': '© 2026 Patient EHR System. All rights reserved.'
        },
        hi: {
            // Header and Navigation
            'app-title': 'रोगी EHR प्रणाली',
            'dashboard': 'डैशबोर्ड',
            'new_record': 'नया रिकॉर्ड',
            'patients': 'रोगी',
            'alerts': 'सतर्कता',
            
            // Dashboard
            'total_patients': 'कुल रोगी',
            'records_today': 'आज के रिकॉर्ड',
            'high_risk': 'उच्च जोखिम सतर्कता',
            'avg_age': 'औसत आयु',
            'bp_distribution': 'रक्त दबाव वितरण',
            'bmi_distribution': 'BMI वितरण',
            'recent_records': 'हाल के रिकॉर्ड',
            'no_records': 'अभी तक कोई रिकॉर्ड नहीं',
            
            // Patient Form
            'patient_information': 'रोगी की जानकारी',
            'personal_info': 'व्यक्तिगत जानकारी',
            'first_name': 'पहला नाम',
            'last_name': 'अंतिम नाम',
            'age': 'आयु',
            'gender': 'लिंग',
            'male': 'पुरुष',
            'female': 'महिला',
            'other': 'अन्य',
            'contact': 'संपर्क संख्या',
            'medical_info': 'चिकित्सा जानकारी',
            'height': 'ऊंचाई (सेमी)',
            'weight': 'वजन (किग्रा)',
            'bp_systolic': 'BP सिस्टोलिक (mmHg)',
            'bp_diastolic': 'BP डायस्टोलिक (mmHg)',
            'heart_rate': 'हृदय गति (bpm)',
            'blood_sugar': 'रक्त शर्करा (mg/dL)',
            'diagnosis': 'निदान',
            'voice_input': 'वॉयस इनपुट',
            'start_recording': 'रिकॉर्डिंग शुरू करें',
            'stop_recording': 'रिकॉर्डिंग बंद करें',
            'save': 'रिकॉर्ड सहेजें',
            'clear': 'फॉर्म साफ़ करें',
            'record_saved': 'रिकॉर्ड सफलतापूर्वक सहेजा गया!',
            'record_error': 'रिकॉर्ड सहेजने में त्रुटि',
            
            // Patients List
            'patients_list': 'रोगियों की सूची',
            'search_placeholder': 'रोगी खोजें...',
            'no_patients': 'कोई रोगी नहीं मिला',
            
            // Risk Alerts
            'risk_alerts': 'जोखिम सतर्कता',
            'no_alerts': 'इस समय कोई सतर्कता नहीं',
            'high_bp': 'उच्च रक्त दबाव',
            'high_blood_sugar': 'उच्च रक्त शर्करा',
            'low_heart_rate': 'कम हृदय गति',
            'high_bmi': 'उच्च BMI',
            
            // Delete & Actions
            'delete': 'हटाएं',
            'delete_patient': 'रोगी हटाएं',
            'delete_record': 'रिकॉर्ड हटाएं',
            'confirm_delete': 'क्या आप इस रिकॉर्ड को हटाना सुनिश्चित हैं?',
            'confirm_delete_patient': 'क्या आप सुनिश्चित हैं? यह रोगी और उनके सभी रिकॉर्ड को हटा देगा।',
            'deleted_success': 'रिकॉर्ड सफलतापूर्वक हटाया गया',
            'delete_error': 'रिकॉर्ड हटाने में त्रुटि',
            
            // Status Messages
            'online': 'ऑनलाइन',
            'offline': 'ऑफलाइन',
            'sync_status': 'डेटा सिंक किया गया',
            'footer_text': '© 2026 रोगी EHR प्रणाली। सर्वाधिकार सुरक्षित।'
        }
    },

    /**
     * Initialize i18n module
     */
    init() {
        this.applyLanguage(this.currentLang);
        this.setupLanguageSelector();
    },

    /**
     * Setup language selector dropdown
     */
    setupLanguageSelector() {
        const selector = document.getElementById('language-selector');
        if (selector) {
            selector.value = this.currentLang;
            selector.addEventListener('change', (e) => {
                this.setLanguage(e.target.value);
            });
        }
    },

    /**
     * Set language and apply translations
     * @param {string} lang - Language code ('en' or 'hi')
     */
    setLanguage(lang) {
        if (this.translations[lang]) {
            this.currentLang = lang;
            localStorage.setItem('language', lang);
            this.applyLanguage(lang);
            
            // Dispatch event so other modules know language changed
            window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
        }
    },

    /**
     * Apply translations to DOM elements
     * @param {string} lang - Language code
     */
    applyLanguage(lang) {
        const dict = this.translations[lang];
        
        // Update all elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            if (dict[key]) {
                if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                    element.placeholder = dict[key];
                } else {
                    element.textContent = dict[key];
                }
            }
        });

        // Update select options
        document.querySelectorAll('select option[data-i18n]').forEach(option => {
            const key = option.getAttribute('data-i18n');
            if (dict[key]) {
                option.textContent = dict[key];
            }
        });

        // Update page title
        const titleElement = document.getElementById('app-title');
        if (titleElement) {
            titleElement.textContent = dict['app-title'];
        }
    },

    /**
     * Get translated string
     * @param {string} key - Translation key
     * @param {object} params - Optional parameters for string interpolation
     * @returns {string} - Translated string
     */
    t(key, params = {}) {
        let text = this.translations[this.currentLang][key] || key;
        
        // Simple parameter substitution
        Object.keys(params).forEach(param => {
            text = text.replace(`{{${param}}}`, params[param]);
        });
        
        return text;
    },

    /**
     * Get current language
     * @returns {string} - Current language code
     */
    getLang() {
        return this.currentLang;
    }
};

// Initialize i18n when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => i18n.init());
} else {
    i18n.init();
}
