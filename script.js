const canvas = document.getElementById('flowCanvas');
const ctx = canvas.getContext('2d');

const inflowSlider = document.getElementById('inflowSlider');
const inflowValue = document.getElementById('inflowValue');
const powerFlowValue = document.getElementById('powerFlowValue');
const bioFlowValue = document.getElementById('bioFlowValue');

const bioPercentSlider = document.getElementById('bioPercentSlider');
const bioPercentValue = document.getElementById('bioPercentValue');

const alertBanner = document.getElementById('alertBanner');
const bioSensor = document.getElementById('bioSensor');

let width, height;
let particles = [];
let totalFlow = parseInt(inflowSlider.value); // m^3/s
let bioPercent = parseInt(bioPercentSlider.value) / 100; // default 0.1

// Colors matching CSS variables
const colorPower = '#00f0ff';
const colorBio = '#00ff88';

function resize() {
    width = canvas.width = canvas.parentElement.clientWidth;
    height = canvas.height = canvas.parentElement.clientHeight;
}

window.addEventListener('resize', resize);
resize();

class Particle {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = 0;
        this.y = height / 2 + (Math.random() - 0.5) * 60; // Spread in main channel
        this.speed = 2 + Math.random() * 2;
        this.radius = Math.random() * 2 + 1.5;
        this.alpha = Math.random() * 0.5 + 0.3;
        
        // Determine path based on current percentage
        this.isPower = Math.random() < (1 - bioPercent);
        this.pathChosen = false;
        
        // Base color (will shift depending on path)
        this.color = 'rgba(255, 255, 255, ';
    }

    update() {
        const branchX = width * 0.35;
        
        if (this.x < branchX) {
            // Main channel
            this.x += this.speed;
        } else {
            // After branching
            if (!this.pathChosen) {
                this.pathChosen = true;
                // Add some initial velocity variance at branch
                this.vy = this.isPower ? -Math.random() * 1.5 - 0.5 : Math.random() * 1.5 + 0.5;
            }
            
            this.x += this.speed;
            
            // Curve towards top or bottom
            if (this.isPower) {
                // Target Y around height * 0.25
                const targetY = height * 0.25 + (Math.random() - 0.5) * 80;
                this.y += (targetY - this.y) * 0.02 + this.vy;
            } else {
                // Target Y around height * 0.75
                const targetY = height * 0.75 + (Math.random() - 0.5) * 40;
                this.y += (targetY - this.y) * 0.02 + this.vy;
            }
        }
        
        // Reset if off screen
        if (this.x > width) {
            this.reset();
        }
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        
        // Interpolate color based on position
        const branchX = width * 0.35;
        if (this.x < branchX - 100) {
            ctx.fillStyle = this.color + this.alpha + ')';
        } else {
            // Transition color
            let targetColor = this.isPower ? 'rgba(0, 240, 255, ' : 'rgba(0, 255, 136, ';
            ctx.fillStyle = targetColor + this.alpha + ')';
        }
        
        // Glow effect
        ctx.shadowBlur = 10;
        ctx.shadowColor = ctx.fillStyle;
        
        ctx.fill();
        ctx.shadowBlur = 0; // reset
    }
}

function drawBackground() {
    ctx.clearRect(0, 0, width, height);
    
    // Draw river paths
    const branchX = width * 0.35;
    
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Main Inflow Channel
    drawChannel(0, height/2, branchX, height/2, 120, 'rgba(255, 255, 255, 0.03)');
    
    // Power Channel
    ctx.beginPath();
    ctx.moveTo(branchX, height/2);
    ctx.bezierCurveTo(branchX + 150, height/2, width/2, height*0.25, width, height*0.25);
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.05)';
    ctx.lineWidth = 140;
    ctx.stroke();
    
    // Bio Channel
    ctx.beginPath();
    ctx.moveTo(branchX, height/2);
    ctx.bezierCurveTo(branchX + 150, height/2, width/2, height*0.75, width, height*0.75);
    ctx.strokeStyle = 'rgba(0, 255, 136, 0.05)';
    ctx.lineWidth = 80;
    ctx.stroke();
}

function drawChannel(x1, y1, x2, y2, width, color) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
}

function updateDashboard() {
    inflowValue.textContent = totalFlow;
    bioPercentValue.textContent = Math.round(bioPercent * 100);
    
    const bioFlow = Math.round(totalFlow * bioPercent);
    const powerFlow = totalFlow - bioFlow; // ensures exact sum
    
    powerFlowValue.textContent = powerFlow;
    bioFlowValue.textContent = bioFlow;

    document.querySelector('.power-card .stat-label').textContent = Math.round((1 - bioPercent) * 100) + '% of total flow';
    document.querySelector('.bio-card .stat-label').textContent = Math.round(bioPercent * 100) + '% reserved flow';

    // Sensor & Alert Logic
    if (bioPercent < 0.10) {
        alertBanner.classList.remove('hidden');
        bioSensor.classList.add('alert');
        bioSensor.querySelector('.sensor-icon').textContent = '🚨';
        bioSensor.querySelector('.sensor-readout').textContent = 'CRITICAL: <10%';
    } else {
        alertBanner.classList.add('hidden');
        bioSensor.classList.remove('alert');
        bioSensor.querySelector('.sensor-icon').textContent = '📡';
        bioSensor.querySelector('.sensor-readout').textContent = 'Monitoring Flow';
    }
}

// Slider interaction
inflowSlider.addEventListener('input', (e) => {
    totalFlow = parseInt(e.target.value);
    updateDashboard();
    
    // Update particle count based on flow
    adjustParticles();
});

bioPercentSlider.addEventListener('input', (e) => {
    bioPercent = parseInt(e.target.value) / 100;
    updateDashboard();
});

function adjustParticles() {
    // Map flow (10 - 1000) to particle count (50 - 1000)
    const targetCount = Math.floor((totalFlow / 1000) * 950) + 50;
    
    if (particles.length < targetCount) {
        while (particles.length < targetCount) {
            particles.push(new Particle());
        }
    } else if (particles.length > targetCount) {
        particles.splice(targetCount, particles.length - targetCount);
    }
}

function animate() {
    drawBackground();
    
    for (let p of particles) {
        p.update();
        p.draw();
    }
    
    requestAnimationFrame(animate);
}

// Initialize
updateDashboard();
adjustParticles();
animate();
