document.addEventListener('DOMContentLoaded', () => {
    // --- Elements for Map Interaction ---
    const mapSpots = document.querySelectorAll('.map-spot.step');
    const infoPanel = document.getElementById('info-panel');
    const infoTitle = document.getElementById('info-title');
    const infoText = document.getElementById('info-text');
    const infoImage = document.getElementById('info-image');
    const closeInfoButton = document.getElementById('close-info');
    const miniGameArea = document.getElementById('mini-game-area');

    const algorithmoGreeting = document.getElementById('algorithmo-greeting');
    const startQuestButton = document.getElementById('start-quest-btn');

    const quizContainer = document.getElementById('quiz-container');
    const closeQuizButton = document.getElementById('close-quiz');
    // Add references for quiz elements later if implemented

    const progressBar = document.getElementById('progress-bar');
    const progressStepName = document.getElementById('progress-step-name');

    // --- Element for Custom Cursor ---
    // const customCursor = document.getElementById('custom-cursor'); // <-- REMOVED

    // --- Step Data ---
    const stepData = {
        '1': {
            title: 'Step 1: The Data Mines',
            text: "First, our clients venture into the Data Mines, gathering the precious raw materials – their data! This vital step ensures they have the fuel to power their intelligent creations.",
            image: 'images/step1.png', // Replace with your image
            progress: 14, // Approx 1/7th
            miniGame: setupDataIntegrationButton // <-- Added specific function for Step 1
        },
        '2': {
            title: 'Step 2: The Cleansing Springs',
            text: "Next, the raw data is brought to the Cleansing Springs. Here, impurities and errors are washed away, ensuring only the purest information flows into their models.",
            image: 'images/step2.png',
            progress: 28,
            // *** MODIFICATION HERE: Replace setupCleanseGame with new function ***
            miniGame: setupDataCleaningPipelineButton
        },
        '3': {
            title: 'Step 3: The Tiny Trial Grounds',
            text: "With clean data in hand, our clients begin their training in the Tiny Trial Grounds. Using smaller datasets and modest computing power, they build and test early versions of their models, like a young apprentice honing their skills.",
            image: 'images/step3.png',
            progress: 42,
            miniGame: setupTinyTrainButton // <-- MODIFIED: Added the new function for Step 3
        },
        '4': {
            title: 'Step 4: The High-Performance Peaks',
            text: "Once the small models show promise, it's time to ascend the High-Performance Peaks! Leveraging powerful HPC clusters, they unleash the full potential of their massive datasets to train truly intelligent and capable models.",
            image: 'images/step4.png',
            progress: 56,
            miniGame: setupHpcGameButton // <-- MODIFIED: Added function for Step 4 button
        },
        '5': {
            title: 'Step 5: The Shrinking Chamber',
            text: "To make their brilliant models accessible and fast, they enter the Shrinking Chamber. Here, the models are carefully optimized and compressed, making them lightweight and ready for real-world deployment.",
            image: 'images/step5.png',
            progress: 70,
            miniGame: setupOptimizeModelButton // Moved here
        },
        '6': {
            title: 'Step 6: The Serving City',
            text: "Finally, the models are deployed in the bustling Serving City! They are now actively interacting with the world, providing valuable insights and powering intelligent applications for our clients' customers.",
            image: 'images/step6.png',
            progress: 84,
            miniGame: setupOptimizeServingButton // Kept here
        },
        '7': {
            title: 'Step 7: To go further',
            text: "And this is where we come in! we join forces and get amazing ML resources to learn how to create value and driving growth together. Your understanding of this entire quest is key to our shared success!",
            image: 'images/step7.png',
            progress: 100,
            // *** MODIFICATION HERE: Changed from showQuiz to the new function ***
            miniGame: setupFurtherLinkButton
        }
    };

    let currentStep = 0; // Track progress

    // --- Initial Greeting ---
    if (startQuestButton && algorithmoGreeting) {
        startQuestButton.addEventListener('click', () => {
            algorithmoGreeting.classList.add('hidden');
        });
    }

    // --- Map Spot Interaction ---
    mapSpots.forEach(spot => {
        spot.addEventListener('click', () => {
            const step = spot.dataset.step;
            if (stepData[step]) {
                const data = stepData[step];

                if(infoTitle) infoTitle.textContent = data.title;
                if(infoText) infoText.textContent = data.text;
                if(infoImage) {
                    infoImage.src = data.image || 'images/placeholder.gif'; // Use placeholder if no image
                    infoImage.alt = data.title;
                }

                if(infoPanel) infoPanel.classList.add('visible');
                if(quizContainer) quizContainer.classList.remove('visible'); // Ensure quiz is hidden when info opens

                currentStep = parseInt(step);
                updateProgressBar(data.progress, data.title);
                setupMiniGame(data.miniGame);
            }
        });
    });

    // --- Close Buttons ---
    if (closeInfoButton && infoPanel) {
        closeInfoButton.addEventListener('click', () => {
            infoPanel.classList.remove('visible');
            if(miniGameArea) miniGameArea.innerHTML = ''; // Clear mini-game area
        });
    }

    if (closeQuizButton && quizContainer) {
        closeQuizButton.addEventListener('click', () => {
            quizContainer.classList.remove('visible');
        });
    }

    // --- Progress Bar Update ---
    function updateProgressBar(percentage, stepName) {
        if (progressBar) progressBar.style.width = `${percentage}%`;
        if (progressStepName) progressStepName.textContent = stepName;
    }

    // --- Mini-Game / Quiz Handling ---
    function setupMiniGame(gameFunction) {
        if (!miniGameArea) return; // Exit if area doesn't exist
        miniGameArea.innerHTML = ''; // Clear previous content
        if (typeof gameFunction === 'function') {
            gameFunction(); // Execute the function associated with the step
        } else {
             // Only add the placeholder if no specific game function exists
             // This prevents showing "(No specific interaction here)" when a game button is present
             // but the function doesn't add content immediately (e.g., the quiz setup)
             if (gameFunction === null) {
                 miniGameArea.innerHTML = '<p>(No specific interaction here)</p>';
             }
        }
    }

    // --- Mini-Game Functions ---
    function setupDataIntegrationButton() {
        if (!miniGameArea) return;
        const dataIntegrationButton = document.createElement('button');
        dataIntegrationButton.textContent = 'Start Data Integration';
        dataIntegrationButton.addEventListener('click', () => {
            const width = 800; // Adjust as needed
            const height = 600; // Adjust as needed
            const left = (window.innerWidth - width) / 2;
            const top = (window.innerHeight - height) / 2;
            window.open('./MiniGame/DataIntegration/DataIntegration.html', '_blank', `width=${width},height=${height},left=${left},top=${top}`);
        });
        miniGameArea.appendChild(dataIntegrationButton);
    }

    // *** NEW FUNCTION FOR STEP 2 ***
    function setupDataCleaningPipelineButton() {
        if (!miniGameArea) return;
        const dataCleaningButton = document.createElement('button');
        dataCleaningButton.textContent = 'Start Data Cleaning Pipeline';
        dataCleaningButton.addEventListener('click', () => {
            const width = 800; // Adjust as needed
            const height = 600; // Adjust as needed
            const left = (window.innerWidth - width) / 2;
            const top = (window.innerHeight - height) / 2;
            window.open('./MiniGame/DataClean/DataClean.html', '_blank', `width=${width},height=${height},left=${left},top=${top}`);
        });
        miniGameArea.appendChild(dataCleaningButton);
    }

    // *** NEW FUNCTION FOR STEP 3: Tiny Train ***
    function setupTinyTrainButton() {
        if (!miniGameArea) return;
        const tinyTrainButton = document.createElement('button');
        tinyTrainButton.textContent = 'Start Tiny Train Game';
        tinyTrainButton.addEventListener('click', () => {
            const width = 800; // Adjust as needed
            const height = 600; // Adjust as needed
            const left = (window.innerWidth - width) / 2;
            const top = (window.innerHeight - height) / 2;
            window.open('./MiniGame/TinyTrain/TinyTrain.html', '_blank', `width=${width},height=${height},left=${left},top=${top}`);
        });
        miniGameArea.appendChild(tinyTrainButton);
    }

    // *** NEW FUNCTION FOR STEP 4: HPC Mini-Game ***
    function setupHpcGameButton() {
        if (!miniGameArea) return;
        const hpcButton = document.createElement('button');
        hpcButton.textContent = 'Explore High-Performance Peaks'; // Or any text you prefer
        hpcButton.addEventListener('click', () => {
            const url = './MiniGame/hpc/hpc.html'; // The URL you provided
            const width = 800; // Adjust as needed
            const height = 600; // Adjust as needed
            const left = (window.innerWidth - width) / 2;
            const top = (window.innerHeight - height) / 2;
            // '_blank' opens the URL in a new window or tab
            window.open(url, '_blank', `width=${width},height=${height},left=${left},top=${top}`);
        });
        miniGameArea.appendChild(hpcButton);
    }


    // Function for the original Step 2 interaction (now replaced for Step 2)
    // This function can be kept or removed if not used elsewhere.
    function setupCleanseGame() {
        if (!miniGameArea) return;
        miniGameArea.innerHTML = '<p>Click the dirty pixels!</p>';
        for(let i=0; i < 5; i++){
            let dirtyPixel = document.createElement('span');
            dirtyPixel.textContent = 'X';
            // dirtyPixel.style.cursor = 'none'; // <-- REMOVED
            dirtyPixel.style.cursor = 'pointer'; // <-- OPTIONAL: Change to pointer for clarity
            dirtyPixel.style.color = 'brown';
            dirtyPixel.style.margin = '5px';
            dirtyPixel.style.display = 'inline-block';
            dirtyPixel.onclick = (e) => {
                e.target.style.display = 'none';
            }
            miniGameArea.appendChild(dirtyPixel);
        }
    }

    function setupOptimizeModelButton() {
        if (!miniGameArea) return;
        const optimizeButton = document.createElement('button');
        optimizeButton.textContent = 'Optimize Model';
        optimizeButton.addEventListener('click', () => {
            const width = 600; // Adjust as needed
            const height = 400; // Adjust as needed
            const left = (window.innerWidth - width) / 2;
            const top = (window.innerHeight - height) / 2;
            window.open('./MiniGame/pruning/index.html', '_blank', `width=${width},height=${height},left=${left},top=${top}`);
        });
        miniGameArea.appendChild(optimizeButton);
    }

    function setupOptimizeServingButton() {
        if (!miniGameArea) return;
        const optimizeButton = document.createElement('button');
        optimizeButton.textContent = 'Optimize Serving';
        optimizeButton.addEventListener('click', () => {
            const url = 'https://huggingface.co/spaces/fredmo/gpu-inference-pulse-slm';
            const width = 800; // Adjust as needed
            const height = 600; // Adjust as needed
            const left = (window.innerWidth - width) / 2;
            const top = (window.innerHeight - height) / 2;
            window.open(url, '_blank', `width=${width},height=${height},left=${left},top=${top}`);
        });
        miniGameArea.appendChild(optimizeButton);
    }

    // *** NEW FUNCTION FOR STEP 7 ***
    function setupFurtherLinkButton() {
        if (!miniGameArea) return;
        const furtherButton = document.createElement('button');
        furtherButton.textContent = 'Learn More'; // You can change this text
        furtherButton.addEventListener('click', () => {
            const url = './MiniGame/further/further.html'; // The target URL
            const width = 800; // Adjust as needed
            const height = 600; // Adjust as needed
            const left = (window.innerWidth - width) / 2;
            const top = (window.innerHeight - height) / 2;
            window.open(url, '_blank', `width=${width},height=${height},left=${left},top=${top}`);
        });
        miniGameArea.appendChild(furtherButton);
    }


    // This function is now only called if explicitly assigned elsewhere,
    // not directly by clicking Step 7 anymore.
    function showQuiz() {
        if(infoPanel) infoPanel.classList.remove('visible');
        if(quizContainer) quizContainer.classList.add('visible');
        console.log("Quiz should appear now!");
        // Populate quizContainer with questions here...
        // Since this is no longer the primary action for Step 7,
        // you might want to remove the quiz population logic or trigger it differently.
        // For now, we leave the basic structure.
        if (miniGameArea) miniGameArea.innerHTML = ''; // Clear any buttons if quiz takes over
    }

    // --- Custom Cursor Logic ---
    /* --- REMOVED ENTIRE if (customCursor) BLOCK --- */

    // --- Initial State ---
    updateProgressBar(0, "Start"); // Set progress bar to 0 initially

}); // End DOMContentLoaded