// game.js

const gameState = {
    inventory: [],
    stats: {
        strength: 10,
        endurance: 10,
        dexterity: 10,
        intelligence: 10,
        wisdom: 10
    }
};

function addToInventory(item) {
    if (!gameState.inventory.includes(item)) {
        gameState.inventory.push(item);
        updateInventoryDisplay();
        saveGame();
    }
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

function updateStatsDisplay() {
    for (const stat in gameState.stats) {
        const element = document.getElementById(stat);
        if (element) {
            element.textContent = gameState.stats[stat];
        }
    }
}

function modifyStat(stat, amount) {
    if (gameState.stats.hasOwnProperty(stat)) {
        gameState.stats[stat] += amount;
        updateStatsDisplay();
        saveGame();
    }
}

function saveGame() {
    localStorage.setItem('gameState', JSON.stringify(gameState));
}

function loadGame() {
    const savedState = localStorage.getItem('gameState');
    if (savedState) {
        const loadedState = JSON.parse(savedState);
        gameState.inventory = loadedState.inventory || [];
        gameState.stats = loadedState.stats || gameState.stats;
        updateInventoryDisplay();
        updateStatsDisplay();
    }
}

function handle404() {
    if (document.title.includes("Lost in the Void")) {
        console.log("Player encountered a 404 error");
        document.body.style.opacity = 0;
        setTimeout(() => {
            document.body.style.transition = "opacity 2s";
            document.body.style.opacity = 1;
        }, 100);
    }
}

function setupInventoryPopup() {
    const openBtn = document.getElementById('open-inventory');
    const closeBtn = document.getElementById('close-inventory');
    const popup = document.getElementById('inventory-popup');

    openBtn.addEventListener('click', () => {
        popup.classList.add('show');
    });

    closeBtn.addEventListener('click', () => {
        popup.classList.remove('show');
    });
}

document.addEventListener('DOMContentLoaded', function() {
    loadGame();
    handle404();
    setupInventoryPopup();
    
    // Add click event listeners to choice links
    document.querySelectorAll('#choices a').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            saveGame();
            window.location.href = this.href;
        });
    });
});
