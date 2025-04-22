document.addEventListener('DOMContentLoaded', () => {
    const acceleratorSelect = document.getElementById('accelerator');
    const parallelismSelect = document.getElementById('parallelism');
    const acceleratorGrid = document.getElementById('acceleratorGrid');
    const parallelismExplanation = document.getElementById('parallelismExplanation');
    const modelLayers = document.querySelectorAll('.model-layers .layer');
    const legendLayerItems = document.querySelectorAll('.legend-item .layer-color'); // Targeting layer legend items
     const legendComponentItem = document.querySelector('.legend-item .component-color'); // Targeting W/O/C legend item
    const startTrainingBtn = document.getElementById('startTrainingBtn');
    const stopTrainingBtn = document.getElementById('stopTrainingBtn');
    const resetTrainingBtn = document.getElementById('resetTrainingBtn');
    const iterationCounterSpan = document.getElementById('iterationCounter');
    const checkpointArea = document.getElementById('checkpointArea');

    const numSquares = 50; // Total number of squares
    let isTraining = false;
    let currentIteration = 0;
    let trainingIntervalId = null;
    const checkpointFrequency = 15; // Save a checkpoint every 15 iterations
    const iterationDelay = 300; // Milliseconds per iteration step (adjust speed)

    // --- Layer and Component Colors ---
    // These should match the CSS variables and legend
    const layerColors = [
        '#ff66cc', // Layer 1
        '#66ccff', // Layer 2
        '#ccff66', // Layer 3
        '#ffff66', // Layer 4
        '#ff9933', // Layer 5
        '#9966ff'  // Layer 6
        // Add more colors here if you add more layers in HTML/CSS
    ];
     // Get activity colors from CSS for consistency
    const computeColor = getComputedStyle(document.documentElement).getPropertyValue('--compute-color').trim();
    const syncColor = getComputedStyle(document.documentElement).getPropertyValue('--sync-color').trim();
    const componentColor = getComputedStyle(document.documentElement).getPropertyValue('.legend-item .component-color').backgroundColor; // Get from static legend item


    // --- Explanation Texts (Same as before) ---
     const explanations = {
        data: {
            title: "Data Parallelism Protocol",
            text: `
                <h4>> EXECUTION SCHEME</h4>
                <p>In Data Parallelism, the <strong>entire model</strong> is replicated across multiple accelerators. Each accelerator receives a different subset (batch) of the training data. Computation proceeds independently on each replica. After the backward pass, the gradients from each accelerator are aggregated (e.g., averaged) to update the model weights, which are then synchronized across all replicas. This requires significant communication for gradient synchronization.</p>
                <p>Each chip holds a <strong>full model replica</strong> (all Weights, Optimizer state, Cache) and processes a <strong>chunk of the data batch</strong>.</p>
                <h4>> KEY CHARACTERISTICS</h4>
                <p><strong>Benefits:</strong> Simplest to implement when the model fits on a single accelerator. Highly effective for scaling batch sizes, which can improve training stability and throughput.</p>
                <p><strong>Challenges:</strong> Fails if the model is too large to fit into the memory of a single accelerator. Communication overhead for gradient synchronization increases substantially with the number of devices.</p>
            `
        },
        model: {
            title: "Model Parallelism Protocol",
            text: `
                <h4>> EXECUTION SCHEME</h4>
                <p>Model Parallelism involves splitting the <strong>model architecture vertically</strong> across accelerators. Different layers, or parts of layers (like splitting attention heads), are assigned to different devices. Data flows sequentially through the split model; an activation computed on one device for a layer must be sent to the next device for the subsequent layer computation. This requires frequent communication between devices for forward and backward passes.</p>
                 <p>Each chip holds <strong>a part of the model</strong> (specific Layers/Operations, their corresponding Weights, Optimizer state for those weights, and intermediate Activations/Cache). Data (or activations) flows between chips.</p>
                 <h4>> KEY CHARACTERISTICS</h4>
                <p><strong>Benefits:</strong> Allows training models that are larger than the memory capacity of a single accelerator by distributing the model parameters and intermediate activations.</p>
                <p><strong>Challenges:</strong> More complex to implement as it requires careful partitioning of the model layers or operations. Can lead to inefficient hardware utilization if the computational load isn't evenly balanced across devices, creating idle time ('bubbles').</p>
            `
        },
        pipeline: {
            title: "Pipeline Parallelism Protocol",
            text: `
                <h4>> EXECUTION SCHEME</h4>
                <p>Pipeline Parallelism splits the model into sequential <strong>stages</strong>, where each stage is a group of layers assigned to one or more accelerators. To improve efficiency and reduce idle time, it uses a <strong>microbatching</strong> approach. The input batch is divided into smaller microbatches which flow through the pipeline stages concurrently. While one stage processes microbatch N, the previous stage can process microbatch N+1, overlapping computation and communication.</p>
                 <p>Each chip (or group of chips) holds a <strong>pipeline stage</strong> (a group of Layers/Operations, their Weights, Optimizer state, and Cache). <strong>Microbatches of data</strong> flow through the stages.</p>
                <h4>> KEY CHARACTERISTICS</h4>
                <p><strong>Benefits:</strong> Reduces the memory footprint per device compared to Data Parallelism (as each device only holds a stage). Significantly reduces idle time ('bubbles') between sequential model computations compared to naive Model Parallelism by overlapping operations.</p>
                <p><strong>Challenges:</strong> Requires careful partitioning of the model into balanced stages. Tuning the microbatch size is crucial for optimal performance. Introduces pipeline-specific hyperparameters and complexities in managing the flow of microbatches.</p>
            `
        },
        // hybrid: { // Add if you implement hybrid visualization
        //     title: "Hybrid Parallelism Protocol",
        //     text: `...`
        // }
    };


    // --- Utility Functions ---

    function updateIterationCounter() {
        iterationCounterSpan.textContent = currentIteration;
    }

    function addCheckpoint() {
        const checkpointImg = document.createElement('img');
        checkpointImg.src = 'file.png'; // Make sure you have a file.png image
        checkpointImg.alt = `Checkpoint ${currentIteration}`;
        checkpointImg.title = `Checkpoint at Iteration ${currentIteration}`;
        checkpointArea.appendChild(checkpointImg);
         // Optional: Scroll to keep latest checkpoint in view if area overflows
         checkpointArea.scrollLeft = checkpointArea.scrollWidth;
    }

    function clearActivityHighlights() {
        const squares = acceleratorGrid.querySelectorAll('.accel-square');
        squares.forEach(square => {
            square.classList.remove('compute-active', 'sync-active');
        });
    }

     // Note: applyActivityHighlights is a simplified visual representation
     // It highlights *which* squares are active during compute or sync phases in a given step.
     // It doesn't simulate exact data/weight flow or fractional use.
    function applyActivityHighlights(acceleratorType, parallelismType) {
        const squares = acceleratorGrid.querySelectorAll('.accel-square');
        const numSquares = squares.length;

        clearActivityHighlights(); // Ensure previous highlights are gone

        // Introduce a simple phase cycling within each iteration tick
        const phase = currentIteration % 2; // Phase 0: Compute, Phase 1: Sync

        if (phase === 0) { // Compute Phase
             if (parallelismType === 'data') {
                 // Data Parallelism: All replicas compute
                 squares.forEach(square => square.classList.add('compute-active'));
             } else if (parallelismType === 'model') {
                 // Model Parallelism: One layer/group computes at a time (sequential)
                 const squaresPerLayer = Math.max(1, Math.floor(numSquares / layerColors.length));
                 const currentLayerIndex = (Math.floor(currentIteration / 2) % layerColors.length); // Cycle layers slower
                  squares.forEach((square, index) => {
                       const layerIndexOfSquare = Math.min(Math.floor(index / squaresPerLayer), layerColors.length - 1);
                       if (layerIndexOfSquare === currentLayerIndex) {
                            square.classList.add('compute-active');
                       }
                  });
             } else if (parallelismType === 'pipeline') {
                 // Pipeline Parallelism: Stages compute concurrently (or rapidly alternating)
                 const squaresPerRow = 10;
                 const numStages = 5; // Assuming 5 rows = 5 stages
                 // Highlight multiple stages to imply overlap
                 const activeStage1 = (Math.floor(currentIteration / 2) % numStages);
                 const activeStage2 = (activeStage1 + 1) % numStages; // Next stage also active

                 squares.forEach((square, index) => {
                      const rowIndex = Math.floor(index / squaresPerRow);
                      if (rowIndex === activeStage1 || rowIndex === activeStage2) {
                           square.classList.add('compute-active');
                      }
                 });
             }
        } else { // Sync Phase
             if (parallelismType === 'data') {
                 // Data Parallelism: All-reduce gradient sync (involves all chips heavily)
                 squares.forEach(square => square.classList.add('sync-active'));
             } else if (parallelismType === 'model') {
                 // Model Parallelism: Communication between layers
                 const squaresPerLayer = Math.max(1, Math.floor(numSquares / layerColors.length));
                  // Highlight boundaries between layers
                 squares.forEach((square, index) => {
                      if (index > 0 && index % squaresPerLayer === 0) {
                           squares[index].classList.add('sync-active'); // Start of new layer block
                            if (index -1 >= 0) squares[index - 1].classList.add('sync-active'); // End of previous layer block
                      }
                 });

             } else if (parallelismType === 'pipeline') {
                 // Pipeline Parallelism: Communication between stages (microbatch handover)
                  const squaresPerRow = 10;
                 squares.forEach((square, index) => {
                       if ((index + 1) % squaresPerRow === 0 && index + 1 < numSquares) { // End of a row/stage
                            square.classList.add('sync-active');
                             if (index + squaresPerRow < numSquares) {
                                // Also highlight the start of the next row briefly
                                squares[index + squaresPerRow - (squaresPerRow -1)].classList.add('sync-active');
                             }
                       }
                   });
             }
        }
    }

    // --- Training Loop Control ---

    function runTrainingStep() {
        if (!isTraining) return; // Stop if not training

        currentIteration++;
        updateIterationCounter();

        // Apply visual highlights based on current state
        applyActivityHighlights(acceleratorSelect.value, parallelismSelect.value);

        // Check for checkpoint
        if (currentIteration > 0 && currentIteration % checkpointFrequency === 0) { // Only checkpoint after iter 0
            addCheckpoint();
        }
    }

    function startTraining() {
        if (isTraining) return; // Prevent starting if already running
        isTraining = true;
        startTrainingBtn.disabled = true;
        stopTrainingBtn.disabled = false;
        resetTrainingBtn.disabled = false;

        // Start the loop interval
        trainingIntervalId = setInterval(runTrainingStep, iterationDelay);

        // Run the first step immediately
         runTrainingStep();

        // Re-apply current state visualization immediately on start (might need adjustment
        // depending on how applyActivityHighlights works - adjusted it to use phases)
        // updateVisualization(); // No longer need this here on start
    }

    function stopTraining() {
        if (!isTraining) return; // Prevent stopping if not running
        isTraining = false;
        clearInterval(trainingIntervalId);
        trainingIntervalId = null;
        startTrainingBtn.disabled = false;
        stopTrainingBtn.disabled = true;
         // Keep reset enabled
         clearActivityHighlights(); // Clear any lingering highlights
    }

    function resetTraining() {
        stopTraining(); // Stop the loop first
        currentIteration = 0;
        updateIterationCounter();
        checkpointArea.innerHTML = ''; // Clear checkpoints
        // Reset the grid visualization to its static state based on selections
        updateVisualization(); // This also clears activity highlights
        startTrainingBtn.disabled = false;
        stopTrainingBtn.disabled = true;
        resetTrainingBtn.disabled = false; // Should be enabled by default on load
    }

    // --- Initial Setup Functions ---

    function generateGrid(count) {
        acceleratorGrid.innerHTML = ''; // Clear existing grid
        for (let i = 0; i < count; i++) {
            const square = document.createElement('div');
            square.classList.add('accel-square');
            square.dataset.index = i; // Add index for reference
             // square.textContent = i; // Optional: Add index number
            acceleratorGrid.appendChild(square);
        }
    }

    function updateVisualization() {
        const acceleratorType = acceleratorSelect.value;
        const parallelismType = parallelismSelect.value;
        const squares = acceleratorGrid.querySelectorAll('.accel-square');
        const numSquares = squares.length;

        // Clear previous state classes and static styles
        acceleratorGrid.classList.remove('gpu-grid', 'tpu-grid');
        squares.forEach(square => {
            square.style.backgroundColor = ''; // Clear previous color set by JS
            square.textContent = ''; // Clear any text set statically
            square.style.color = ''; // Reset text color
            square.style.textShadow = ''; // Reset text shadow
            square.style.opacity = ''; // Clear opacity
        });
        clearActivityHighlights(); // Also ensure activity highlights are cleared

        // Apply Accelerator Type Class (for CSS grid/connection hints)
        acceleratorGrid.classList.add(`${acceleratorType}-grid`);

         // --- Coloring and Labeling Based on Parallelism (Static State - what resides) ---

        if (parallelismType === 'data') {
            // Data Parallelism: Each chip/group holds a full model copy + data chunk
            const numReplicas = 4; // Example: 4 replicas
            const squaresPerReplica = Math.floor(numSquares / numReplicas);

            squares.forEach((square, index) => {
                 const replicaIndex = Math.min(Math.floor(index / squaresPerReplica), numReplicas - 1);
                 square.style.backgroundColor = componentColor; // Use the legend color for W/O/C/Data mix
                 square.textContent = `Replica ${replicaIndex + 1}\n+ Data Chunk`;
                 square.style.color = '#333'; // Dark text on light background
                 square.style.textShadow = 'none';
            });

        } else if (parallelismType === 'model') {
            // Model Parallelism: Different layers/parts on different chips/groups + activations/data flowing
            const squaresPerLayer = Math.max(1, Math.floor(numSquares / layerColors.length));

            squares.forEach((square, index) => {
                const layerIndex = Math.min(Math.floor(index / squaresPerLayer), layerColors.length - 1);
                square.style.backgroundColor = layerColors[layerIndex]; // Color by Layer
                square.textContent = `Layer ${layerIndex + 1} Part\nW/O/C + Activations`;
                square.style.color = 'black'; // Dark text on colored layers
                square.style.textShadow = '1px 1px 1px rgba(255,255,255,0.3)';
            });

        } else if (parallelismType === 'pipeline') {
            // Pipeline Parallelism: Stages (groups of layers) on chips/groups + microbatches flowing
            const squaresPerRow = 10; // Assuming 10 columns
            const numRows = 5;
            const numStages = numRows; // Stages usually map to rows/groups of rows
            // const layersPerStage = Math.ceil(layerColors.length / numStages); // Layers distributed across stages

            squares.forEach((square, index) => {
                const rowIndex = Math.floor(index / squaresPerRow); // 0 to 4
                const stageIndex = rowIndex; // Row corresponds to stage

                 const stageColor = layerColors[stageIndex % layerColors.length]; // Color by Stage (using layer colors)
                 square.style.backgroundColor = stageColor;
                 square.textContent = `Stage ${stageIndex + 1}\nW/O/C + Microbatch`;
                 square.style.color = 'black'; // Dark text on colored stages
                 square.style.textShadow = '1px 1px 1px rgba(255,255,255,0.3)';
            });
        }
        // else if (parallelismType === 'hybrid') { ... }


        // Update Explanation Text
        const explanation = explanations[parallelismType] || { title: "Select a Parallelism Type", text: "" };
        parallelismExplanation.innerHTML = `<h4>> ${explanation.title}</h4>${explanation.text}`;

         // Update Model Layer highlights (Static - based on which layers are 'involved')
         modelLayers.forEach(layerDiv => layerDiv.style.border = '1px dashed var(--mid-grey)');
         legendLayerItems.forEach(item => item.style.boxShadow = 'none');
         if (legendComponentItem) legendComponentItem.parentElement.style.boxShadow = 'none';


         if (parallelismType === 'model' || parallelismType === 'pipeline') {
              modelLayers.forEach((layerDiv, layerIndex) => {
                   layerDiv.style.border = `2px solid ${layerColors[layerIndex]}`;
                   if(legendLayerItems[layerIndex]) {
                             legendLayerItems[layerIndex].style.boxShadow = `0 0 8px ${layerColors[layerIndex]}`;
                        }
              });
              // In Model/Pipeline, W/O/C and Data/Activations are distributed with the layer/stage parts
               if(legendComponentItem) {
                    legendComponentItem.parentElement.style.boxShadow = `0 0 8px ${getComputedStyle(document.documentElement).getPropertyValue('--neon-green').trim()}`; // Highlight component legend
               }

         } else if (parallelismType === 'data') {
              // In data parallelism, the WHOLE model (layers) and W/O/C/Data are replicated
              modelLayers.forEach((layerDiv, layerIndex) => {
                   layerDiv.style.border = `2px solid ${getComputedStyle(document.documentElement).getPropertyValue('--neon-green').trim()}`; // Highlight all layers
                   if(legendLayerItems[layerIndex]) {
                             legendLayerItems[layerIndex].style.boxShadow = `0 0 8px ${getComputedStyle(document.documentElement).getPropertyValue('--neon-green').trim()}`;
                        }
              });
              // Also highlight the 'Weights/Optimizer/Cache/Data' legend item
               if(legendComponentItem) {
                    componentLegend.parentElement.style.boxShadow = `0 0 8px ${getComputedStyle(document.documentElement).getPropertyValue('--neon-green').trim()}`;
               }

         }
         // Note: compute-active and sync-active legend items are handled by CSS styles directly


    }

    // --- Event Listeners ---
    acceleratorSelect.addEventListener('change', () => {
         stopTraining(); // Stop simulation if config changes
         updateVisualization();
         resetTraining(); // Reset simulation state
    });
    parallelismSelect.addEventListener('change', () => {
         stopTraining(); // Stop simulation if config changes
         updateVisualization();
         resetTraining(); // Reset simulation state
    });


    startTrainingBtn.addEventListener('click', startTraining);
    stopTrainingBtn.addEventListener('click', stopTraining);
    resetTrainingBtn.addEventListener('click', resetTraining);


    // --- Initial Setup ---
    generateGrid(numSquares); // Create the initial grid
    updateVisualization(); // Set the initial state based on default selections
     resetTraining(); // Set initial button states and counter to 0

});