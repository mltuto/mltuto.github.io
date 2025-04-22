const canvas = document.getElementById('nnCanvas');
const ctx = canvas.getContext('2d');
const precisionSlider = document.getElementById('precision');
const precisionLabel = document.getElementById('precision-label');
const memoryDisplay = document.getElementById('memory-display');
const savedPercentageDisplay = document.getElementById('saved-percentage'); // Get the new span

// Responsive Canvas Size (optional but recommended)
function resizeCanvas() {
    const container = canvas.parentElement; // Or specific container div
    const style = getComputedStyle(container);
    const containerWidth = parseInt(style.width) - parseInt(style.paddingLeft) - parseInt(style.paddingRight);

    // Maintain an aspect ratio, e.g., 3:2
    const aspectRatio = 2 / 3;
    canvas.width = Math.min(containerWidth, 600); // Max width of 600px
    canvas.height = canvas.width * aspectRatio;

    // Recreate network if size changes significantly (or adjust coordinates)
    createNetwork(); // Need to recreate based on new size
    drawNetwork();
    calculateMemory(); // Recalculate based on potentially reset network
}


// --- Theme Colors ---
const colors = {
    background: '#0d0221', // Match CSS body
    connection: 'rgba(0, 240, 255, 0.2)', // Faint cyan
    neuronActiveFill: 'rgba(10, 239, 255, 0.8)', // Bright Cyan
    neuronActiveStroke: 'rgba(10, 239, 255, 1)',
    neuronUselessFill: 'rgba(255, 0, 255, 0.4)', // Faded Magenta
    neuronUselessStroke: 'rgba(255, 0, 255, 0.6)',
    neuronVibrateFill: 'rgba(249, 248, 113, 0.9)', // Neon Yellow
    neuronVibrateStroke: 'rgba(249, 248, 113, 1)',
    glowActive: 'rgba(10, 239, 255, 0.7)',
    glowUseless: 'rgba(255, 0, 255, 0.5)',
    glowVibrate: 'rgba(249, 248, 113, 0.8)',
};
const glowBlur = 8; // How much glow effect

// --- Network Configuration (Visual) ---
const layerSizes = [8, 12, 12, 8, 4]; // Neurons per layer
const neuronRadius = 7; // Slightly smaller radius might look better with glow
const uselessThreshold = 0.2; // Conceptual weight threshold

// --- Simulated Model Configuration ---
const baseParameterCount = 70e9; // 70 Billion parameters
const basePrecisionBytes = 2; // Assuming base is BF16/FP16

// --- Data Type Configuration (Bytes per Parameter) ---
const precisionLevels = {
    0: { name: 'FP32', bytesPerParameter: 4 },
    1: { name: 'BF16', bytesPerParameter: 2 },
    2: { name: 'INT8', bytesPerParameter: 1 },
    3: { name: 'INT4', bytesPerParameter: 0.5 }
};
let currentPrecisionLevel = parseInt(precisionSlider.value);
let currentPrecision = precisionLevels[currentPrecisionLevel];

// --- Network Data Structure (Visual) ---
let layers = [];
let connections = [];
let initialActiveVisualNeurons = 0;

// --- Simulated Model State ---
let currentParameterCount = baseParameterCount;
let parametersPerVisualNeuron = 0;

// --- Baseline Memory (Full model at FP32 for savings calculation) ---
const baseFP32MemoryGB = (baseParameterCount * precisionLevels[0].bytesPerParameter) / (1024 ** 3);


// --- Vibration Animation ---
let vibratingNeuron = null;
let vibrationStartTime = 0;
const vibrationDuration = 300; // ms
const vibrationMagnitude = 4; // Slightly reduced magnitude

// --- Functions ---

function createNetwork() {
    layers = [];
    connections = [];
    initialActiveVisualNeurons = 0;

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const xPadding = canvasWidth * 0.1; // Relative padding
    const yPadding = canvasHeight * 0.1;
    const layerSpacing = (canvasWidth - 2 * xPadding) / (layerSizes.length - 1);

    // Create Layers and Neurons
    for (let i = 0; i < layerSizes.length; i++) {
        layers[i] = [];
        const numNeurons = layerSizes[i];
        const layerHeight = canvasHeight - 2 * yPadding;
        // Adjust spacing calculation to prevent division by zero for single-neuron layers
        const neuronSpacing = numNeurons > 1 ? layerHeight / (numNeurons - 1) : 0;


        for (let j = 0; j < numNeurons; j++) {
            const x = xPadding + i * layerSpacing;
             // Calculate y position, centering single neurons or distributing others
            const y = numNeurons === 1 ? yPadding + layerHeight / 2 : yPadding + j * neuronSpacing;

            const conceptualWeightMagnitude = Math.random();
            const isUseless = conceptualWeightMagnitude < uselessThreshold;

            layers[i][j] = {
                x: x,
                y: y,
                radius: neuronRadius,
                isUseless: isUseless,
                isActive: true,
                baseX: x,
                baseY: y
            };
             if (layers[i][j].isActive) {
                 initialActiveVisualNeurons++;
             }
        }
    }

    // Calculate parameters per visual neuron based on initial active count
     if (initialActiveVisualNeurons > 0) {
        parametersPerVisualNeuron = baseParameterCount / initialActiveVisualNeurons;
    } else {
        parametersPerVisualNeuron = 0; // Avoid division by zero
    }
    currentParameterCount = baseParameterCount;

    // Create Connections
    for (let i = 0; i < layers.length - 1; i++) {
        const currentLayer = layers[i];
        const nextLayer = layers[i + 1];
        for (let j = 0; j < currentLayer.length; j++) {
            for (let k = 0; k < nextLayer.length; k++) {
                connections.push({
                    fromLayer: i, fromNeuron: j,
                    toLayer: i + 1, toNeuron: k
                });
            }
        }
    }
}

function drawNetwork() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Optional: Fill canvas background if needed, otherwise it's transparent
    // ctx.fillStyle = colors.background; // Or a slightly different shade
    // ctx.fillRect(0, 0, canvas.width, canvas.height);


    // --- Draw Connections ---
    ctx.strokeStyle = colors.connection;
    ctx.lineWidth = 0.5; // Thinner lines
    ctx.shadowBlur = 0; // No glow for connections
    connections.forEach(conn => {
        const from = layers[conn.fromLayer][conn.fromNeuron];
        const to = layers[conn.toLayer][conn.toNeuron];

        if (from.isActive && to.isActive) {
             // Only draw if not currently vibrating (cleaner look)
             const fromIsVibrating = vibratingNeuron && from === vibratingNeuron;
             const toIsVibrating = vibratingNeuron && to === vibratingNeuron;
             if (!fromIsVibrating && !toIsVibrating) {
                ctx.beginPath();
                ctx.moveTo(from.x, from.y); // Use current potentially vibrated pos
                ctx.lineTo(to.x, to.y);
                ctx.stroke();
             }
        }
    });

    // --- Draw Neurons ---
    ctx.lineWidth = 1; // Reset line width for neuron strokes
    layers.forEach(layer => {
        layer.forEach(neuron => {
            if (neuron.isActive) {
                ctx.save(); // Save context state

                // Set glow and colors based on state
                if (neuron === vibratingNeuron) {
                    ctx.fillStyle = colors.neuronVibrateFill;
                    ctx.strokeStyle = colors.neuronVibrateStroke;
                    ctx.shadowColor = colors.glowVibrate;
                    ctx.shadowBlur = glowBlur + 4; // Extra glow when vibrating
                } else if (neuron.isUseless) {
                    ctx.fillStyle = colors.neuronUselessFill;
                    ctx.strokeStyle = colors.neuronUselessStroke;
                    ctx.shadowColor = colors.glowUseless;
                    ctx.shadowBlur = glowBlur;
                } else {
                    ctx.fillStyle = colors.neuronActiveFill;
                    ctx.strokeStyle = colors.neuronActiveStroke;
                    ctx.shadowColor = colors.glowActive;
                    ctx.shadowBlur = glowBlur;
                }

                // Apply vibration offset if needed
                // Note: We draw at the potentially vibrated (neuron.x, neuron.y)
                // The vibration function updates these coordinates.

                ctx.beginPath();
                // Draw circle at its current position (neuron.x, neuron.y)
                ctx.arc(neuron.x, neuron.y, neuron.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                ctx.restore(); // Restore context (removes shadow settings)
            }
        });
    });
     // Reset shadow for next frame/draw cycle if needed outside this function
     ctx.shadowBlur = 0;
}


function calculateMemory() {
    const bytesPerParameter = currentPrecision.bytesPerParameter;
    // Ensure currentParameterCount is not negative (edge case)
    const safeParameterCount = Math.max(0, currentParameterCount);
    const totalBytes = safeParameterCount * bytesPerParameter;
    const totalGB = totalBytes / (1024 ** 3);
    memoryDisplay.textContent = `${totalGB.toFixed(2)} GB`;

    let percentageSaved = 0;
    if (baseFP32MemoryGB > 0) {
        percentageSaved = ((baseFP32MemoryGB - totalGB) / baseFP32MemoryGB) * 100;
    }
    // Ensure percentage is within reasonable bounds (0-100 or slightly more if base wasn't FP32)
    percentageSaved = Math.max(0, percentageSaved);

    savedPercentageDisplay.textContent = `( ${percentageSaved.toFixed(2)}% saved )`; // Added parenthesis like original

    // Style based on savings (using CSS variables might be cleaner but direct style is fine here)
    if (percentageSaved > 50) {
         savedPercentageDisplay.style.color = 'var(--neon-pink)'; // Use pink for high savings
    } else if (percentageSaved > 0) {
         savedPercentageDisplay.style.color = 'var(--neon-yellow)'; // Yellow for moderate
    }
     else {
        savedPercentageDisplay.style.color = 'var(--neon-cyan)'; // Default cyan if no savings
    }
}

function getClickedNeuron(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;    // Relationship bitmap vs. element for accurate clicking
    const scaleY = canvas.height / rect.height;

    const mouseX = (event.clientX - rect.left) * scaleX;
    const mouseY = (event.clientY - rect.top) * scaleY;


    for (let i = 0; i < layers.length; i++) {
        for (let j = 0; j < layers[i].length; j++) {
            const neuron = layers[i][j];
            if (neuron.isActive) {
                 // Click detection based on base position, more reliable during vibration
                const distance = Math.sqrt((mouseX - neuron.baseX) ** 2 + (mouseY - neuron.baseY) ** 2);
                if (distance <= neuron.radius + 3) { // Add slight tolerance
                    return { layerIndex: i, neuronIndex: j, neuron: neuron };
                }
            }
        }
    }
    return null;
}

function startVibration(neuron) {
    if (vibratingNeuron) return;
    vibratingNeuron = neuron;
    vibrationStartTime = performance.now();
    // Reset position before starting animation ensures it starts from base
    neuron.x = neuron.baseX;
    neuron.y = neuron.baseY;
    requestAnimationFrame(animateVibration);
}

function animateVibration(currentTime) {
    if (!vibratingNeuron) return;

    const elapsed = currentTime - vibrationStartTime;
    const progress = elapsed / vibrationDuration;

    if (progress < 1) {
        const decreaseFactor = 1 - progress; // Vibration decreases over time
        const offsetX = (Math.random() - 0.5) * vibrationMagnitude * decreaseFactor;
        const offsetY = (Math.random() - 0.5) * vibrationMagnitude * decreaseFactor;

        // Update current position for drawing
        vibratingNeuron.x = vibratingNeuron.baseX + offsetX;
        vibratingNeuron.y = vibratingNeuron.baseY + offsetY;

        drawNetwork(); // Redraw with neuron in vibrating position
        requestAnimationFrame(animateVibration);
    } else {
        // End vibration: Ensure reset and final draw in non-vibrating state
        vibratingNeuron.x = vibratingNeuron.baseX; // Reset position firmly
        vibratingNeuron.y = vibratingNeuron.baseY;
        const neuronThatVibrated = vibratingNeuron; // Hold reference
        vibratingNeuron = null; // Clear state *before* final draw

        // Trigger one last draw ensuring the neuron is rendered in its normal state/color
        drawNetwork();
    }
}


// --- Event Listeners ---

canvas.addEventListener('click', (event) => {
    if (vibratingNeuron) return; // Ignore clicks during vibration

    const clicked = getClickedNeuron(event);

    if (clicked) {
        const neuron = clicked.neuron;
         // Only act if the neuron is currently active
        if (neuron.isActive) {
            if (neuron.isUseless) {
                // Prune: Deactivate neuron and update count
                neuron.isActive = false;
                 // Prevent parameter count going below zero
                currentParameterCount = Math.max(0, currentParameterCount - parametersPerVisualNeuron);
                drawNetwork();
                calculateMemory();
            } else {
                // Vibrate important neuron
                startVibration(neuron);
            }
        }
    }
});

precisionSlider.addEventListener('input', (event) => {
    currentPrecisionLevel = parseInt(event.target.value);
    currentPrecision = precisionLevels[currentPrecisionLevel];
    precisionLabel.textContent = currentPrecision.name;
    calculateMemory(); // Recalculate memory based on new precision
});

// Add resize listener
window.addEventListener('resize', resizeCanvas);

// --- Initial Setup ---
// Initialize precision label text
precisionLabel.textContent = precisionLevels[currentPrecisionLevel].name;

// Initial canvas setup and drawing
resizeCanvas(); // Use resize function for initial setup too

// Note: createNetwork, drawNetwork, calculateMemory are called within resizeCanvas()