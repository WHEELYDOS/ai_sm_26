/**
 * chart-utils.js - Chart Utilities
 * Simple canvas-based charts without external libraries
 */

const chartUtils = {
    /**
     * Draw a bar chart
     */
    drawBarChart(canvas, labels, data, title, color = '#667eea') {
        const ctx = canvas.getContext('2d');
        const width = canvas.parentElement.clientWidth;
        const height = 200;
        
        canvas.width = width;
        canvas.height = height;

        const padding = 40;
        const chartWidth = width - padding * 2;
        const chartHeight = height - padding * 2;
        const barWidth = chartWidth / (data.length * 1.5);
        const maxValue = Math.max(...data, 1);

        // Clear
        ctx.clearRect(0, 0, width, height);

        // Draw bars
        data.forEach((value, i) => {
            const x = padding + i * (chartWidth / data.length) + barWidth / 2;
            const barHeight = (value / maxValue) * chartHeight;
            const y = height - padding - barHeight;

            // Bar
            ctx.fillStyle = color;
            ctx.fillRect(x, y, barWidth, barHeight);

            // Label
            ctx.fillStyle = '#4a5568';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(labels[i] || '', x + barWidth / 2, height - padding + 15);
            
            // Value on top
            ctx.fillText(value.toString(), x + barWidth / 2, y - 5);
        });

        // Y-axis
        ctx.strokeStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, height - padding);
        ctx.stroke();

        // X-axis
        ctx.beginPath();
        ctx.moveTo(padding, height - padding);
        ctx.lineTo(width - padding, height - padding);
        ctx.stroke();
    },

    /**
     * Draw a pie chart
     */
    drawPieChart(canvas, labels, data, colors) {
        const ctx = canvas.getContext('2d');
        const width = canvas.parentElement.clientWidth;
        const height = 200;
        
        canvas.width = width;
        canvas.height = height;

        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(centerX, centerY) - 30;
        const total = data.reduce((a, b) => a + b, 0) || 1;

        let startAngle = -Math.PI / 2;

        // Draw slices
        data.forEach((value, i) => {
            const sliceAngle = (value / total) * Math.PI * 2;
            const endAngle = startAngle + sliceAngle;

            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, startAngle, endAngle);
            ctx.closePath();
            ctx.fillStyle = colors[i] || '#667eea';
            ctx.fill();

            // Label
            const midAngle = startAngle + sliceAngle / 2;
            const labelX = centerX + (radius * 0.7) * Math.cos(midAngle);
            const labelY = centerY + (radius * 0.7) * Math.sin(midAngle);

            ctx.fillStyle = '#fff';
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            if (value > 0) {
                ctx.fillText(value.toString(), labelX, labelY);
            }

            startAngle = endAngle;
        });

        // Legend
        const legendY = height - 20;
        const legendWidth = width / labels.length;

        labels.forEach((label, i) => {
            const x = i * legendWidth + legendWidth / 2;

            ctx.fillStyle = colors[i] || '#667eea';
            ctx.fillRect(x - 30, legendY - 10, 12, 12);

            ctx.fillStyle = '#4a5568';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(label, x - 14, legendY);
        });
    },

    /**
     * Create frequency distribution for data
     */
    createDistribution(values, bins = 5) {
        if (values.length === 0) {
            return { labels: [], frequencies: [] };
        }

        const min = Math.min(...values);
        const max = Math.max(...values);
        const binSize = (max - min) / bins || 1;

        const labels = [];
        const frequencies = new Array(bins).fill(0);

        for (let i = 0; i < bins; i++) {
            const start = Math.round(min + i * binSize);
            const end = Math.round(min + (i + 1) * binSize);
            labels.push(`${start}-${end}`);
        }

        values.forEach(value => {
            const binIndex = Math.min(Math.floor((value - min) / binSize), bins - 1);
            frequencies[binIndex]++;
        });

        return { labels, frequencies };
    },

    /**
     * Draw risk distribution chart
     */
    drawRiskChart(canvas, highCount, mediumCount, lowCount) {
        this.drawPieChart(
            canvas,
            ['High', 'Medium', 'Low'],
            [highCount, mediumCount, lowCount],
            ['#e53e3e', '#dd6b20', '#38a169']
        );
    }
};
