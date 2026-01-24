/**
 * i18n.js - Internationalization Module
 * Supports English and Hindi
 */

const i18n = {
    currentLang: 'en',

    translations: {
        en: {
            // App
            dashboard: 'Dashboard',
            new_record: 'New Record',
            patients: 'Patients',
            alerts: 'Alerts',
            reminders: 'Reminders',
            
            // Status
            online: 'Online',
            offline: 'Offline',
            
            // Dashboard
            total_patients: 'Total Patients',
            records_today: "Today's Records",
            high_risk: 'High Risk',
            pending_reminders: 'Due Today',
            recent_records: 'Recent Records',
            bp_distribution: 'Blood Pressure',
            risk_distribution: 'Risk Distribution',
            
            // Patient Form
            patient_information: 'Patient Information',
            personal_info: 'Personal Information',
            physical_info: 'Physical Measurements',
            vital_signs: 'Vital Signs',
            symptoms: 'Symptoms',
            diagnosis: 'Diagnosis & Notes',
            
            // Fields
            first_name: 'First Name',
            last_name: 'Last Name',
            age: 'Age',
            gender: 'Gender',
            contact: 'Contact Number',
            height: 'Height (cm)',
            weight: 'Weight (kg)',
            bp_systolic: 'BP Systolic',
            bp_diastolic: 'BP Diastolic',
            heart_rate: 'Heart Rate',
            blood_sugar: 'Blood Sugar',
            
            // Gender options
            male: 'Male',
            female: 'Female',
            other: 'Other',
            
            // Voice
            start_recording: 'Start Recording',
            stop_recording: 'Stop Recording',
            voice_input: 'Voice Input',
            
            // Actions
            save: 'Save Record',
            clear: 'Clear Form',
            search_placeholder: 'Search patients...',
            
            // Lists
            patients_list: 'Patients List',
            risk_alerts: 'Health Alerts',
            no_records: 'No records yet',
            no_patients: 'No patients found',
            no_alerts: 'No alerts at this time',
            
            // Messages
            record_saved: 'Record saved successfully!',
            record_error: 'Error saving record. Please try again.',
            confirm_delete: 'Are you sure you want to delete this record?',
            confirm_delete_patient: 'Delete this patient and all records?',
            deleted_success: 'Deleted successfully',
            delete_error: 'Error deleting. Please try again.',
            
            // Footer
            footer_text: '© 2026 AshaCare. All rights reserved.'
        },
        hi: {
            // App
            dashboard: 'डैशबोर्ड',
            new_record: 'नया रिकॉर्ड',
            patients: 'मरीज़',
            alerts: 'अलर्ट',
            reminders: 'रिमाइंडर',
            
            // Status
            online: 'ऑनलाइन',
            offline: 'ऑफ़लाइन',
            
            // Dashboard
            total_patients: 'कुल मरीज़',
            records_today: 'आज के रिकॉर्ड',
            high_risk: 'उच्च जोखिम',
            pending_reminders: 'आज देय',
            recent_records: 'हाल के रिकॉर्ड',
            bp_distribution: 'रक्तचाप',
            risk_distribution: 'जोखिम वितरण',
            
            // Patient Form
            patient_information: 'मरीज़ की जानकारी',
            personal_info: 'व्यक्तिगत जानकारी',
            physical_info: 'शारीरिक माप',
            vital_signs: 'महत्वपूर्ण संकेत',
            symptoms: 'लक्षण',
            diagnosis: 'निदान और नोट्स',
            
            // Fields
            first_name: 'पहला नाम',
            last_name: 'उपनाम',
            age: 'उम्र',
            gender: 'लिंग',
            contact: 'संपर्क नंबर',
            height: 'ऊंचाई (सेमी)',
            weight: 'वज़न (किग्रा)',
            bp_systolic: 'बीपी सिस्टोलिक',
            bp_diastolic: 'बीपी डायस्टोलिक',
            heart_rate: 'हृदय गति',
            blood_sugar: 'रक्त शर्करा',
            
            // Gender options
            male: 'पुरुष',
            female: 'महिला',
            other: 'अन्य',
            
            // Voice
            start_recording: 'रिकॉर्डिंग शुरू करें',
            stop_recording: 'रिकॉर्डिंग बंद करें',
            voice_input: 'आवाज़ इनपुट',
            
            // Actions
            save: 'रिकॉर्ड सहेजें',
            clear: 'फ़ॉर्म साफ़ करें',
            search_placeholder: 'मरीज़ खोजें...',
            
            // Lists
            patients_list: 'मरीज़ों की सूची',
            risk_alerts: 'स्वास्थ्य अलर्ट',
            no_records: 'अभी तक कोई रिकॉर्ड नहीं',
            no_patients: 'कोई मरीज़ नहीं मिला',
            no_alerts: 'इस समय कोई अलर्ट नहीं',
            
            // Messages
            record_saved: 'रिकॉर्ड सफलतापूर्वक सहेजा गया!',
            record_error: 'रिकॉर्ड सहेजने में त्रुटि।',
            confirm_delete: 'क्या आप इस रिकॉर्ड को हटाना चाहते हैं?',
            confirm_delete_patient: 'इस मरीज़ और सभी रिकॉर्ड हटाएं?',
            deleted_success: 'सफलतापूर्वक हटा दिया गया',
            delete_error: 'हटाने में त्रुटि।',
            
            // Footer
            footer_text: '© 2026 आशाकेयर। सर्वाधिकार सुरक्षित।'
        }
    },

    /**
     * Get translation
     */
    t(key) {
        return this.translations[this.currentLang]?.[key] || 
               this.translations.en[key] || 
               key;
    },

    /**
     * Get current language
     */
    getLang() {
        return this.currentLang;
    },

    /**
     * Set language
     */
    setLang(lang) {
        if (this.translations[lang]) {
            this.currentLang = lang;
            localStorage.setItem('ashacare_lang', lang);
            this.applyLanguage();
            
            // Dispatch event
            window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
        }
    },

    /**
     * Apply language to all elements
     */
    applyLanguage() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translation = this.t(key);
            
            if (el.tagName === 'INPUT' && el.placeholder) {
                el.placeholder = translation;
            } else {
                el.textContent = translation;
            }
        });
    },

    /**
     * Initialize i18n
     */
    init() {
        // Load saved language
        const savedLang = localStorage.getItem('ashacare_lang') || 'en';
        this.currentLang = savedLang;

        // Setup language selector
        const langSelect = document.getElementById('language-selector');
        if (langSelect) {
            langSelect.value = this.currentLang;
            langSelect.addEventListener('change', (e) => {
                this.setLang(e.target.value);
            });
        }

        // Apply translations
        this.applyLanguage();
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => i18n.init());
