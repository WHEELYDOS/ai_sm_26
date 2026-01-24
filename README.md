# Patient EHR - Progressive Web App (PWA)

A complete offline-first Progressive Web App for managing patient Electronic Health Records with voice input, multilingual support, and risk alerts.

## 🌟 Features

### Core Features
- **Offline-First Design**: Full functionality without internet connection
- **Progressive Web App**: Installable on mobile and desktop
- **Service Workers**: Automatic caching and background sync
- **IndexedDB Storage**: Persistent local data storage
- **Voice Input**: Hands-free diagnosis recording with speech-to-text
- **Multilingual UI**: English and Hindi language support
- **Responsive Design**: Works on mobile, tablet, and desktop

### Patient EHR Functionality
- **Patient Management**: Create and manage patient records
- **Medical Records**: Capture vital signs (BP, heart rate, blood sugar)
- **Body Metrics**: Height, weight, and BMI calculation
- **Diagnosis Recording**: Text and voice input for diagnoses
- **Dashboard**: Overview with charts and statistics
- **Risk Alerts**: Automatic detection of high-risk medical conditions
- **Patient List**: Search and view all patient records
- **Data Visualization**: Charts for BP and BMI distribution

## 📁 Project Structure

```
patient-ehr-pwa/
├── index.html              # Main HTML file with multilingual UI
├── manifest.json           # PWA manifest for installation
├── sw.js                   # Service Worker for offline functionality
│
├── css/
│   └── styles.css          # Responsive styling (600+ lines)
│
├── js/
│   ├── i18n.js             # Internationalization (English & Hindi)
│   ├── db.js               # IndexedDB database operations
│   ├── voice.js            # Speech-to-text voice input
│   ├── chart-utils.js      # Chart rendering utilities
│   └── app.js              # Main application logic
│
├── assets/                 # Icons and images (create manually)
│   ├── icon-192.png
│   ├── icon-512.png
│   └── icon-192-maskable.png
│
├── data/                   # Sample data
│   └── sample-patients.json
│
└── README.md              # This file
```

## 🚀 Getting Started

### Prerequisites
- Modern web browser (Chrome, Firefox, Edge, Safari)
- Python 3.x or Node.js (for local server)

### Installation & Running Locally

#### Option 1: Using Python (Recommended)

1. **Clone or download the project**
   ```bash
   cd patient-ehr-pwa
   ```

2. **Start a local server with Python 3**
   ```bash
   # Python 3
   python -m http.server 8000
   ```

3. **Open in browser**
   ```
   http://localhost:8000
   ```

#### Option 2: Using Node.js (http-server)

1. **Install http-server globally** (if not already installed)
   ```bash
   npm install -g http-server
   ```

2. **Start the server**
   ```bash
   http-server patient-ehr-pwa -p 8000
   ```

3. **Open in browser**
   ```
   http://localhost:8000
   ```

#### Option 3: Using Live Server VS Code Extension

1. **Install Live Server extension** in VS Code
2. **Right-click on index.html** → "Open with Live Server"
3. Browser opens automatically at `http://localhost:5500`

### Important: HTTPS Required for PWA Features

For full PWA functionality (Service Workers, offline mode), use HTTPS:

```bash
# Using Python with SSL
python -m http.server --bind 127.0.0.1 8443 --directory . --certfile cert.pem --keyfile key.pem

# Or use ngrok for local HTTPS tunnel
ngrok http 8000
```

## 📱 Installation as App

### On Mobile (Android/iOS)
1. Open the app in your mobile browser
2. Look for "Install App" or "Add to Home Screen" prompt
3. Tap and follow the installation steps
4. App installs as a standalone mobile app

### On Desktop
1. Open in Chrome/Edge
2. Click the "Install" icon in address bar
3. App installs and opens in a standalone window

## 🎯 How to Use

### Dashboard Tab
- **View Statistics**: Total patients, records today, risk alerts, average age
- **See Charts**: Blood pressure and BMI distribution visualizations
- **Recent Records**: Last 5 patient records at a glance

### New Record Tab
1. Enter patient details (name, age, gender)
2. Input medical measurements:
   - Height (cm) & Weight (kg) → Auto-calculate BMI
   - Blood Pressure (Systolic/Diastolic)
   - Heart Rate (bpm)
   - Blood Sugar (mg/dL)
3. **Voice Input**: Click microphone icon to record diagnosis
4. Click "Save Record" to store locally
5. Records sync when online (future enhancement)

### Patients Tab
- View all patient records in card format
- Search patients by name
- Click any card to view details

### Alerts Tab
- View all risk alerts by severity (High/Medium)
- Automatic alerts for:
  - **High Blood Pressure**: > 140 mmHg systolic
  - **High Blood Sugar**: > 200 mg/dL
  - **Low Heart Rate**: < 60 bpm
  - **High BMI**: > 30

## 🗣️ Voice Input Feature

### Supported Languages
- **English**: Enabled by default
- **Hindi**: Activate via language selector

### How to Use Voice Input
1. Navigate to "New Record" tab
2. Scroll to "Voice Input" section
3. Click the microphone button 🎤
4. Speak clearly in the selected language
5. Click again or wait for silence to stop recording
6. Transcription appears in the diagnosis field

### Browser Compatibility
- ✅ Chrome/Chromium (best support)
- ✅ Firefox
- ✅ Safari (iOS 15+)
- ⚠️ Edge (partial support)

## 📊 Database Schema

### Patients Store
```javascript
{
  id: number,
  firstName: string,
  lastName: string,
  age: number,
  gender: string,
  contact: string,
  height: number,
  weight: number,
  createdDate: ISO8601,
  updatedDate: ISO8601
}
```

### Records Store
```javascript
{
  id: number,
  patientId: number,
  bpSystolic: number,
  bpDiastolic: number,
  heartRate: number,
  bloodSugar: number,
  diagnosis: string,
  date: ISO8601
}
```

## 🔒 Offline Functionality

### What Works Offline
- ✅ Create and save patient records
- ✅ View all stored patients and records
- ✅ Voice input recording
- ✅ Language switching
- ✅ Dashboard and charts
- ✅ Risk alert generation

### What Requires Internet
- ❌ Cloud backup (future enhancement)
- ❌ Server sync (future enhancement)
- ❌ Real-time updates (future enhancement)

### Caching Strategy
- **Service Worker**: Cache-first for static assets
- **IndexedDB**: Stores all patient data locally
- **Runtime Cache**: Dynamic assets cached on first load

## 🔧 Configuration

### Change Language Default
Edit `js/i18n.js`:
```javascript
currentLang: localStorage.getItem('language') || 'en', // Change 'en' to 'hi' for Hindi
```

### Customize Colors
Edit `css/styles.css` in `:root` section:
```css
--primary-color: #0066cc;      /* Change brand color */
--danger-color: #ff6b6b;       /* Change alert color */
```

### Modify Risk Alert Thresholds
Edit `js/app.js` in `generateRiskAlerts()` function:
```javascript
if (record.bpSystolic && record.bpSystolic > 140) { // Change 140 to desired value
```

## 📚 Technology Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Storage**: IndexedDB (Local Database)
- **Offline**: Service Workers, Cache API
- **Voice**: Web Speech API
- **Responsive**: CSS Grid & Flexbox
- **PWA**: Web App Manifest

## 🎨 Styling Features

- Modern gradient header
- Responsive grid layouts
- Dark/Light color schemes (extendable)
- Smooth animations and transitions
- Print-friendly styles
- Mobile-first design

## 🐛 Troubleshooting

### Service Worker Not Registering
- **Cause**: Not using HTTPS or localhost
- **Fix**: Use `http://localhost:8000` or HTTPS URL

### Voice Input Not Working
- **Cause**: Browser doesn't support Web Speech API
- **Fix**: Use Chrome, Firefox, or Safari

### Data Not Persisting
- **Cause**: Private/Incognito mode disabled IndexedDB
- **Fix**: Use normal browsing mode

### Charts Not Displaying
- **Cause**: Canvas API not supported
- **Fix**: Update to modern browser

## 📈 Future Enhancements

- [ ] Cloud backup with Firebase/AWS
- [ ] Real-time sync across devices
- [ ] Doctor-patient messaging
- [ ] Prescription management
- [ ] Appointment scheduling
- [ ] Integration with medical APIs
- [ ] Dark mode theme
- [ ] Multi-user support with authentication
- [ ] Advanced analytics and reporting
- [ ] PDF report generation

## 📝 Sample Data

To load sample patients for testing:

```javascript
// Add this to browser console (F12)
const samplePatients = [
  {
    firstName: "Raj",
    lastName: "Kumar",
    age: 45,
    gender: "male",
    contact: "9876543210",
    height: 175,
    weight: 75
  },
  {
    firstName: "Priya",
    lastName: "Sharma",
    age: 32,
    gender: "female",
    contact: "9123456789",
    height: 162,
    weight: 58
  }
];

// Save to database
samplePatients.forEach(patient => {
  db.savePatient(patient);
});
```

## 📱 Testing on Mobile Devices

### Android
1. Enable Developer Mode: Settings → About → Tap Build Number 7 times
2. Enable USB Debugging
3. Connect via USB
4. Open Chrome on desktop, go to `chrome://inspect`
5. Select device and open localhost:8000

### iOS
1. Connect to same WiFi as development machine
2. Get machine's IP: `ifconfig` (macOS/Linux) or `ipconfig` (Windows)
3. Open Safari on iOS: `http://<IP>:8000`
4. Tap Share → Add to Home Screen

## 📄 License

This project is open source and available for educational and healthcare use.

## 🤝 Contributing

Contributions welcome! Areas for improvement:
- Additional language support
- Enhanced UI/UX
- Additional medical metrics
- Integration with medical APIs
- Performance optimizations

## 📞 Support

For issues or questions:
1. Check the Troubleshooting section
2. Review browser console (F12) for errors
3. Verify browser compatibility
4. Test in offline mode by disconnecting internet

## 🔐 Privacy & Security

- All data stored locally on device
- No data sent to external servers
- HTTPS recommended for deployment
- IndexedDB encryption recommended for production

---

**Version**: 1.0.0  
**Last Updated**: January 2026  
**Status**: Production Ready

**Developed for**: Healthcare Management Systems  
**Tested on**: Chrome, Firefox, Safari, Edge
