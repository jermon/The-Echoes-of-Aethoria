// game.js

const gameState = {
    currentScene: 'start',
    inventory: [],
};

const scenes = {
    start: {
        text: "You are Lyra, the last surviving member of the Aethorian Rangers. Your homeland has been overrun by the shadow-wraiths of the Void. You stand at the edge of the Whispering Forest, ready to begin your quest to recover the five Astral Shards.",
        choices: [
            { text: "Enter the Whispering Forest", nextScene: "forest" },
            { text: "Check your gear before departing", nextScene: "checkGear" },
        ]
    },
    forest: {
        text: "The trees of the Whispering Forest loom over you, their leaves rustling with ancient secrets. The path ahead splits in two directions.",
        choices: [
            { text: "Take the darker path to the left", nextScene: "darkPath" },
            { text: "Follow the lighter path to the right", nextScene: "lightPath" },
        ]
    },
    checkGear: {
        text: "You inspect your gear. You have a bow, a quiver of arrows, a small dagger, and a pouch of healing herbs.",
        choices: [
            { text: "Enter the Whispering Forest", nextScene: "forest" },
        ],
        onEnter: () => {
            addToInventory("Bow");
            addToInventory("Arrows");
            addToInventory("Dagger");
            addToInventory("Healing Herbs");
        }
    },
    // Add more scenes here
};

function renderScene(sceneId) {
    const scene = scenes[sceneId];
    document.getElementById('story-text').innerHTML = scene.text;
    
    const choicesDiv = document.getElementById('choices');
    choicesDiv.innerHTML = '';
    scene.choices.forEach(choice => {
        const button = document.createElement('a');
        button.href = '#';
        button.textContent = choice.text;
        button.addEventListener('click', (e) => {
            e.preventDefault();
            gameState.currentScene = choice.nextScene;
            renderScene(choice.nextScene);
        });
        choicesDiv.appendChild(button);
    });

    if (scene.onEnter) {
        scene.onEnter();
    }
}

function addToInventory(item) {
    gameState.inventory.push(item);
    updateInventoryDisplay();
}

function updateInventoryDisplay() {
    const inventoryList = document.getElementById('inventory-list');
    inventoryList.innerHTML = '';
    gameState.inventory.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        inventoryList.appendChild(li);
    });
}

function initGame() {
    renderScene(gameState.currentScene);
}

document.addEventListener('DOMContentLoaded', initGame);

// Save game state to local storage
function saveGame() {
    localStorage.setItem('gameState', JSON.stringify(gameState));
}

// Load game state from local storage
function loadGame() {
    const savedState = localStorage.getItem('gameState');
    if (savedState) {
        gameState = JSON.parse(savedState);
        renderScene(gameState.currentScene);
        updateInventoryDisplay();
    }
}

// You can call saveGame() after each action if you want to implement auto-save
// Call loadGame() when the game starts to resume from a saved state
