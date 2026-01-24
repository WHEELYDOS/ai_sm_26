/**
 * body-diagram.js - Body Diagram Visualization
 * SVG-based body diagram showing health risks
 */

const bodyDiagram = {
    /**
     * Body parts with their SVG paths
     */
    parts: {
        head: {
            path: 'M50,15 a15,15 0 1,0 0.1,0',
            cx: 50,
            cy: 20,
            label: 'Head'
        },
        chest: {
            path: 'M35,45 L65,45 L70,75 L30,75 Z',
            cx: 50,
            cy: 60,
            label: 'Chest'
        },
        heart: {
            path: 'M45,55 L55,55 L55,65 L45,65 Z',
            cx: 50,
            cy: 60,
            label: 'Heart'
        },
        lungs: {
            path: 'M35,50 L45,50 L45,70 L35,70 Z M55,50 L65,50 L65,70 L55,70 Z',
            cx: 50,
            cy: 60,
            label: 'Lungs'
        },
        abdomen: {
            path: 'M32,75 L68,75 L65,100 L35,100 Z',
            cx: 50,
            cy: 87,
            label: 'Abdomen'
        },
        pancreas: {
            path: 'M40,82 L60,82 L58,88 L42,88 Z',
            cx: 50,
            cy: 85,
            label: 'Pancreas'
        },
        arms: {
            path: 'M25,48 L35,48 L35,85 L25,85 Z M65,48 L75,48 L75,85 L65,85 Z',
            cx: 50,
            cy: 65,
            label: 'Arms'
        },
        legs: {
            path: 'M35,100 L45,100 L45,145 L35,145 Z M55,100 L65,100 L65,145 L55,145 Z',
            cx: 50,
            cy: 122,
            label: 'Legs'
        },
        blood: {
            path: 'M48,35 a5,5 0 1,0 0.1,0',
            cx: 50,
            cy: 35,
            label: 'Blood'
        }
    },

    /**
     * Severity colors
     */
    colors: {
        high: '#e53e3e',
        medium: '#dd6b20',
        low: '#38a169',
        normal: '#a0aec0'
    },

    /**
     * Generate SVG body diagram
     */
    generateSVG(riskMap = {}) {
        let svg = `
            <svg viewBox="0 0 100 160" xmlns="http://www.w3.org/2000/svg" 
                 style="max-width: 200px; width: 100%;">
                <defs>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                        <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                </defs>
                
                <!-- Body outline -->
                <g fill="none" stroke="#e2e8f0" stroke-width="1">
                    <!-- Head -->
                    <circle cx="50" cy="18" r="12" fill="#f7fafc"/>
                    
                    <!-- Neck -->
                    <rect x="45" y="30" width="10" height="8" fill="#f7fafc"/>
                    
                    <!-- Torso -->
                    <path d="M35,38 L65,38 L68,100 L32,100 Z" fill="#f7fafc"/>
                    
                    <!-- Arms -->
                    <path d="M35,40 L25,45 L20,85 L28,85 L32,50 L35,50" fill="#f7fafc"/>
                    <path d="M65,40 L75,45 L80,85 L72,85 L68,50 L65,50" fill="#f7fafc"/>
                    
                    <!-- Legs -->
                    <path d="M35,100 L32,145 L42,145 L45,100" fill="#f7fafc"/>
                    <path d="M55,100 L58,145 L68,145 L65,100" fill="#f7fafc"/>
                </g>
        `;

        // Add risk indicators
        for (const [partName, partData] of Object.entries(this.parts)) {
            const risk = riskMap[partName];
            const color = risk ? this.colors[risk.severity] : this.colors.normal;
            const hasRisk = !!risk;

            if (hasRisk) {
                svg += `
                    <circle 
                        cx="${partData.cx}" 
                        cy="${partData.cy}" 
                        r="8" 
                        fill="${color}" 
                        opacity="0.7"
                        class="risk-indicator ${partName}"
                        style="cursor: pointer;"
                        ${hasRisk ? 'filter="url(#glow)"' : ''}
                    >
                        ${risk?.severity === 'high' ? '<animate attributeName="opacity" values="0.5;0.9;0.5" dur="1.5s" repeatCount="indefinite"/>' : ''}
                    </circle>
                `;
            }
        }

        svg += '</svg>';
        return svg;
    },

    /**
     * Render body diagram in container
     */
    render(containerId, riskMap = {}) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const svg = this.generateSVG(riskMap);
        container.innerHTML = svg;

        // Add click handlers for risk indicators
        container.querySelectorAll('.risk-indicator').forEach(el => {
            el.addEventListener('click', (e) => {
                const partName = Array.from(el.classList).find(c => c !== 'risk-indicator');
                const risk = riskMap[partName];
                if (risk) {
                    this.showPartDetails(partName, risk);
                }
            });
        });
    },

    /**
     * Render legend
     */
    renderLegend(containerId, riskMap = {}) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const affectedParts = Object.entries(riskMap);

        if (affectedParts.length === 0) {
            container.innerHTML = '<span class="legend-item"><span class="legend-color legend-normal"></span> All Normal</span>';
            return;
        }

        let html = '';
        affectedParts.forEach(([part, risk]) => {
            const partLabel = this.parts[part]?.label || part;
            html += `
                <span class="legend-item">
                    <span class="legend-color legend-${risk.severity}"></span>
                    ${partLabel}
                </span>
            `;
        });

        container.innerHTML = html;
    },

    /**
     * Show part details popup
     */
    showPartDetails(partName, risk) {
        const partLabel = this.parts[partName]?.label || partName;
        let message = `${partLabel} - ${risk.severity.toUpperCase()} Risk\n\n`;

        risk.alerts.forEach(alert => {
            message += `• ${alert.message}\n  → ${alert.recommendation}\n\n`;
        });

        alert(message);
    }
};
