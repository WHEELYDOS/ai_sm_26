/**
 * chart-utils.js - Chart Utilities Module
 * Simple chart rendering without external libraries
 * Creates canvas-based charts for dashboard visualization
 */

const chartUtils = {
    /**
     * Draw a simple bar chart
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @param {array} labels - X-axis labels
     * @param {array} data - Y-axis data values
     * @param {string} title - Chart title
     * @param {string} color - Bar color
     */
    drawBarChart(canvas, labels, data, title, color = '#0066cc') {
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const padding = 40;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Calculate dimensions
        const chartWidth = width - 2 * padding;
        const chartHeight = height - 2 * padding;
        const barWidth = chartWidth / labels.length * 0.8;
        const barSpacing = chartWidth / labels.length;

        // Find max value for scaling
        const maxValue = Math.max(...data, 1);

        // Draw background
        ctx.fillStyle = '#f9f9f9';
        ctx.fillRect(padding, padding, chartWidth, chartHeight);

        // Draw grid lines
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
            const y = padding + (chartHeight / 5) * i;
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(width - padding, y);
            ctx.stroke();
        }

        // Draw bars
        ctx.fillStyle = color;
        data.forEach((value, index) => {
            const x = padding + (index * barSpacing) + (barSpacing - barWidth) / 2;
            const barHeight = (value / maxValue) * chartHeight;
            const y = height - padding - barHeight;

            ctx.fillRect(x, y, barWidth, barHeight);

            // Draw value label on bar
            ctx.fillStyle = '#000';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(value, x + barWidth / 2, y - 5);
            ctx.fillStyle = color;
        });

        // Draw axes
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, height - padding);
        ctx.lineTo(width - padding, height - padding);
        ctx.stroke();

        // Draw X-axis labels
        ctx.fillStyle = '#000';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        labels.forEach((label, index) => {
            const x = padding + (index * barSpacing) + barSpacing / 2;
            const y = height - padding + 20;
            ctx.fillText(label, x, y);
        });

        // Draw Y-axis labels
        ctx.textAlign = 'right';
        for (let i = 0; i <= 5; i++) {
            const value = Math.round((maxValue / 5) * i);
            const y = height - padding - (chartHeight / 5) * i;
            ctx.fillText(value, padding - 10, y + 5);
        }
    },

    /**
     * Draw a simple line chart
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @param {array} labels - X-axis labels
     * @param {array} data - Y-axis data values
     * @param {string} title - Chart title
     * @param {string} color - Line color
     */
    drawLineChart(canvas, labels, data, title, color = '#0066cc') {
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const padding = 40;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Calculate dimensions
        const chartWidth = width - 2 * padding;
        const chartHeight = height - 2 * padding;
        const pointSpacing = chartWidth / (labels.length - 1 || 1);

        // Find max value for scaling
        const maxValue = Math.max(...data, 1);

        // Draw background
        ctx.fillStyle = '#f9f9f9';
        ctx.fillRect(padding, padding, chartWidth, chartHeight);

        // Draw grid lines
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
            const y = padding + (chartHeight / 5) * i;
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(width - padding, y);
            ctx.stroke();
        }

        // Draw line
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();

        data.forEach((value, index) => {
            const x = padding + (index * pointSpacing);
            const pointHeight = (value / maxValue) * chartHeight;
            const y = height - padding - pointHeight;

            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });

        ctx.stroke();

        // Draw points
        ctx.fillStyle = color;
        data.forEach((value, index) => {
            const x = padding + (index * pointSpacing);
            const pointHeight = (value / maxValue) * chartHeight;
            const y = height - padding - pointHeight;

            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fill();

            // Draw value label
            ctx.fillStyle = '#000';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(value, x, y - 10);
            ctx.fillStyle = color;
        });

        // Draw axes
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, height - padding);
        ctx.lineTo(width - padding, height - padding);
        ctx.stroke();

        // Draw X-axis labels
        ctx.fillStyle = '#000';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        labels.forEach((label, index) => {
            const x = padding + (index * pointSpacing);
            const y = height - padding + 20;
            ctx.fillText(label, x, y);
        });

        // Draw Y-axis labels
        ctx.textAlign = 'right';
        for (let i = 0; i <= 5; i++) {
            const value = Math.round((maxValue / 5) * i);
            const y = height - padding - (chartHeight / 5) * i;
            ctx.fillText(value, padding - 10, y + 5);
        }
    },

    /**
     * Draw a simple pie chart
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @param {array} labels - Slice labels
     * @param {array} data - Slice values
     * @param {array} colors - Slice colors
     */
    drawPieChart(canvas, labels, data, colors = []) {
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const centerX = width / 2;
        const centerY = height / 2 - 20;
        const radius = Math.min(width, height) / 2 - 40;

        // Default colors if not provided
        const defaultColors = ['#0066cc', '#ff6b6b', '#51cf66', '#ffd43b', '#a78bfa', '#ff922b'];
        const chartColors = colors.length > 0 ? colors : defaultColors;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Calculate total
        const total = data.reduce((sum, value) => sum + value, 0);

        // Draw slices
        let currentAngle = -Math.PI / 2;

        data.forEach((value, index) => {
            const sliceAngle = (value / total) * 2 * Math.PI;
            const color = chartColors[index % chartColors.length];

            // Draw slice
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
            ctx.lineTo(centerX, centerY);
            ctx.fill();

            // Draw border
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw label
            const labelAngle = currentAngle + sliceAngle / 2;
            const labelX = centerX + Math.cos(labelAngle) * (radius * 0.7);
            const labelY = centerY + Math.sin(labelAngle) * (radius * 0.7);

            ctx.fillStyle = '#fff';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const percentage = ((value / total) * 100).toFixed(1);
            ctx.fillText(percentage + '%', labelX, labelY);

            currentAngle += sliceAngle;
        });

        // Draw legend
        const legendX = width / 2;
        let legendY = height - 30;

        ctx.textAlign = 'center';
        labels.forEach((label, index) => {
            const color = chartColors[index % chartColors.length];
            
            // Color box
            ctx.fillStyle = color;
            ctx.fillRect(legendX - 100, legendY - 8, 12, 12);
            
            // Label
            ctx.fillStyle = '#000';
            ctx.font = '11px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(label, legendX - 80, legendY);
            
            legendY -= 18;
        });
    },

    /**
     * Create distribution chart from raw data
     * @param {array} data - Array of numeric values
     * @returns {object} - Bins and frequencies
     */
    createDistribution(data, bins = 5) {
        if (data.length === 0) return { labels: [], frequencies: [] };

        const min = Math.min(...data);
        const max = Math.max(...data);
        const binSize = (max - min) / bins || 1;

        const distribution = new Array(bins).fill(0);
        const labels = [];

        data.forEach(value => {
            const binIndex = Math.min(Math.floor((value - min) / binSize), bins - 1);
            distribution[binIndex]++;
        });

        for (let i = 0; i < bins; i++) {
            const start = Math.round(min + (i * binSize));
            const end = Math.round(min + ((i + 1) * binSize));
            labels.push(`${start}-${end}`);
        }

        return {
            labels: labels,
            frequencies: distribution
        };
    }
};
