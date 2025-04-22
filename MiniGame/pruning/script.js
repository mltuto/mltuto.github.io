const canvas = document.getElementById('nnCanvas');
const ctx = canvas.getContext('2d');
const precisionSlider = document.getElementById('precision');
const precisionLabel = document.getElementById('precision-label');
const memoryDisplay = document.getElementById('memory-display');
const savedPercentageDisplay = document.getElementById('saved-percentage'); // Get the new span

canvas.width = 600;
canvas.height = 400;

// --- Network Configuration (Visual) ---
const layerSizes = [8, 12, 12, 8, 4]; // Neurons per layer in the visualization
const neuronRadius = 8;
const uselessThreshold = 0.2; // Conceptual weight threshold for uselessness (lower means more useless)

// --- Simulated Model Configuration ---
const baseParameterCount = 70e9; // 70 Billion parameters
// We assume the base memory (140GB) corresponds to FP16 (2 bytes)
const basePrecisionBytes = 2; // FP16 is 2 bytes

// --- Data Type Configuration (Bytes per Parameter) ---
const precisionLevels = {
    0: { name: 'FP32', bytesPerParameter: 4 }, // 2x base FP16
    1: { name: 'BF16', bytesPerParameter: 2 }, // 1x base FP16
    2: { name: 'INT8', bytesPerParameter: 1 }, // 0.5x base FP16
    3: { name: 'INT4', bytesPerParameter: 0.5 } // 0.25x base FP16 (conceptual)
};
let currentPrecisionLevel = parseInt(precisionSlider.value);
let currentPrecision = precisionLevels[currentPrecisionLevel];

// --- Network Data Structure (Visual) ---
let layers = []; // Array of arrays of neuron objects
let connections = []; // Array of connection objects
let initialActiveVisualNeurons = 0; // Total visual neurons at start

// --- Simulated Model State ---
let currentParameterCount = baseParameterCount;
let parametersPerVisualNeuron = 0; // How many parameters each visual neuron represents

// --- Baseline Memory (Full model at FP32) ---
const baseFP32MemoryGB = (baseParameterCount * precisionLevels[0].bytesPerParameter) / (1024 ** 3);


// --- Vibration Animation ---
let vibratingNeuron = null;
let vibrationStartTime = 0;
const vibrationDuration = 300; // ms
const vibrationMagnitude = 5; // Increased pixels for vibration

// --- Functions ---

function createNetwork() {
    layers = [];
    connections = [];
    initialActiveVisualNeurons = 0;

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const xPadding = 50;
    const yPadding = 30;
    const layerSpacing = (canvasWidth - 2 * xPadding) / (layerSizes.length - 1);

    // Create Layers and Neurons
    for (let i = 0; i < layerSizes.length; i++) {
        layers[i] = [];
        const numNeurons = layerSizes[i];
        const neuronSpacing = (canvasHeight - 2 * yPadding) / (numNeurons > 1 ? numNeurons - 1 : 1);

        for (let j = 0; j < numNeurons; j++) {
            const x = xPadding + i * layerSpacing;
            const y = yPadding + j * neuronSpacing + (numNeurons === 1 ? (canvasHeight - 2 * yPadding) / 2 : 0); // Center single neuron layers

            // Assign conceptual weight magnitude
            const conceptualWeightMagnitude = Math.random();
            const isUseless = conceptualWeightMagnitude < uselessThreshold;

            layers[i][j] = {
                x: x,
                y: y,
                radius: neuronRadius,
                isUseless: isUseless,
                isActive: true, // Initially all active
                baseX: x, // For vibration
                baseY: y  // For vibration
            };
             if (layers[i][j].isActive) {
                initialActiveVisualNeurons++;
            }
        }
    }

    // Calculate how many parameters each visual neuron represents
    // This is based on the initial *total* number of visual neurons
    parametersPerVisualNeuron = baseParameterCount / initialActiveVisualNeurons;
    currentParameterCount = baseParameterCount; // Reset simulated parameter count

    // Create Connections between adjacent layers
    for (let i = 0; i < layers.length - 1; i++) {
        const currentLayer = layers[i];
        const nextLayer = layers[i + 1];
        for (let j = 0; j < currentLayer.length; j++) {
            for (let k = 0; k < nextLayer.length; k++) {
                connections.push({
                    fromLayer: i,
                    fromNeuron: j,
                    toLayer: i + 1,
                    toNeuron: k
                });
            }
        }
    }
}

function drawNetwork() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Connections (only between active neurons)
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 1;
    connections.forEach(conn => {
        const from = layers[conn.fromLayer][conn.fromNeuron];
        const to = layers[conn.toLayer][conn.toNeuron];

        // Check if both connected neurons are active
        if (from.isActive && to.isActive) {
             // Check if either neuron is currently vibrating to potentially hide connections
            const fromIsVibrating = vibratingNeuron && from === vibratingNeuron;
            const toIsVibrating = vibratingNeuron && to === vibratingNeuron;

            // Only draw connection if neither end is currently vibrating (simplification for visual clarity)
            if (!fromIsVibrating && !toIsVibrating) {
                ctx.beginPath();
                ctx.moveTo(from.x, from.y);
                ctx.lineTo(to.x, to.y);
                ctx.stroke();
            }
        }
    });

    // Draw Neurons
    layers.forEach(layer => {
        layer.forEach(neuron => {
            if (neuron.isActive) {
                 // Save current state before potential vibration drawing
                ctx.save();

                // If this neuron is vibrating, apply vibration offset and red color
                if (neuron === vibratingNeuron) {
                     // Translation for vibration
                    ctx.translate(neuron.x - neuron.baseX, neuron.y - neuron.baseY);
                    ctx.fillStyle = 'rgba(220, 53, 69, 0.9)'; // Red color
                    ctx.strokeStyle = 'rgba(220, 53, 69, 1)';
                } else {
                     // Normal color based on uselessness
                    if (neuron.isUseless) {
                        ctx.fillStyle = 'rgba(0, 123, 255, 0.5)'; // Faded blue
                        ctx.strokeStyle = 'rgba(0, 123, 255, 0.7)';
                    } else {
                        ctx.fillStyle = 'rgba(40, 167, 69, 0.8)'; // Green
                        ctx.strokeStyle = 'rgba(40, 167, 69, 1)';
                    }
                     // No translation if not vibrating, draw at base position
                    ctx.translate(neuron.baseX, neuron.baseY);
                }


                ctx.beginPath();
                // Draw the circle at (0,0) in the translated context
                ctx.arc(0, 0, neuron.radius, 0, Math.PI * 2);


                ctx.fill();
                ctx.stroke();

                // Restore context to remove translation for the next draw
                ctx.restore();
            }
        });
    });
}

function calculateMemory() {
    const bytesPerParameter = currentPrecision.bytesPerParameter;
    const totalBytes = currentParameterCount * bytesPerParameter;
    const totalGB = totalBytes / (1024 ** 3); // Convert bytes to GB
    memoryDisplay.textContent = `${totalGB.toFixed(2)} GB`;

    // Calculate percentage saved
    let percentageSaved = 0;
    if (baseFP32MemoryGB > 0) { // Avoid division by zero
         percentageSaved = ((baseFP32MemoryGB - totalGB) / baseFP32MemoryGB) * 100;
    }

    // Ensure percentage is not negative if memory somehow increases beyond base FP32 (e.g. if base was FP16)
    // Although in this setup, baseFP32MemoryGB is the highest possible memory.
     savedPercentageDisplay.textContent = `${percentageSaved.toFixed(2)}% saved`;

     // Optional: Change color of percentage text based on value
     if (percentageSaved > 0) {
         savedPercentageDisplay.style.color = '#28a745'; // Green
     } else if (percentageSaved < 0) {
         savedPercentageDisplay.style.color = '#dc3545'; // Red (shouldn't happen with this baseline)
     } else {
         savedPercentageDisplay.style.color = '#666'; // Grey or default
     }
}

function getClickedNeuron(event) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    for (let i = 0; i < layers.length; i++) {
        for (let j = 0; j < layers[i].length; j++) {
            const neuron = layers[i][j];
            if (neuron.isActive) {
                // Use base position for click detection
                const distance = Math.sqrt((mouseX - neuron.baseX) ** 2 + (mouseY - neuron.baseY) ** 2);
                if (distance <= neuron.radius) {
                    return { layerIndex: i, neuronIndex: j, neuron: neuron };
                }
            }
        }
    }
    return null; // No neuron clicked
}

function startVibration(neuron) {
    if (vibratingNeuron) return; // Prevent starting new vibration if one is active
    vibratingNeuron = neuron;
    vibrationStartTime = performance.now();
    // Store current position before starting animation
    neuron.x = neuron.baseX;
    neuron.y = neuron.baseY;
    requestAnimationFrame(animateVibration);
}

function animateVibration(currentTime) {
    if (!vibratingNeuron) return;

    const elapsed = currentTime - vibrationStartTime;
    const progress = elapsed / vibrationDuration;

    if (progress < 1) {
        // Use base position for vibration calculation
        const offsetX = (Math.random() - 0.5) * vibrationMagnitude * (1 - progress); // Magnitude decreases over time
        const offsetY = (Math.random() - 0.5) * vibrationMagnitude * (1 - progress);

        vibratingNeuron.x = vibratingNeuron.baseX + offsetX;
        vibratingNeuron.y = vibratingNeuron.baseY + offsetY;

        drawNetwork(); // Redraw with neuron in vibrating position
        requestAnimationFrame(animateVibration);
    } else {
        // End vibration, reset position
        vibratingNeuron.x = vibratingNeuron.baseX;
        vibratingNeuron.y = vibratingNeuron.baseY;
        const neuronToStop = vibratingNeuron; // Keep reference
        vibratingNeuron = null; // Clear vibrating neuron state
        drawNetwork(); // Final redraw in original position for this neuron
         // Ensure the specific neuron is drawn in its non-vibrating color
         // This is handled by drawNetwork checking if neuron === vibratingNeuron
    }
}


// --- Event Listeners ---

canvas.addEventListener('click', (event) => {
    if (vibratingNeuron) return; // Ignore clicks during vibration

    const clicked = getClickedNeuron(event);

    if (clicked) {
        const neuron = clicked.neuron;

        if (neuron.isActive) { // Ensure it's an active neuron that was clicked
             if (neuron.isUseless) {
                // Remove neuron
                neuron.isActive = false;
                currentParameterCount -= parametersPerVisualNeuron; // Reduce simulated parameters
                drawNetwork();
                calculateMemory();
            } else {
                // Vibrate neuron
                startVibration(neuron);
            }
        }
    }
});

precisionSlider.addEventListener('input', (event) => {
    currentPrecisionLevel = parseInt(event.target.value);
    currentPrecision = precisionLevels[currentPrecisionLevel];
    precisionLabel.textContent = currentPrecision.name;
    calculateMemory();
});

// Initialize precision label text based on starting slider value
precisionLabel.textContent = precisionLevels[parseInt(precisionSlider.value)].name;

// --- Initial Setup ---
createNetwork();
drawNetwork();
calculateMemory(); // Initial memory calculation

// Optional: Add a button to reset the network
// <button id="resetButton">Reset</button>
// const resetButton = document.getElementById('resetButton');
// if (resetButton) {
//     resetButton.addEventListener('click', () => {
//         createNetwork();
//         drawNetwork();
//         calculateMemory();
//     });
// }