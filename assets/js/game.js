// game.js

const INVENTORY_COMPARTMENTS = {
    back: { label: 'Back', maxWeight: 8, maxSpace: 6 },
    belt: { label: 'Belt', maxWeight: 4, maxSpace: 4 },
    hands: { label: 'Hands', maxWeight: 6, maxSpace: 2 }
};

const ITEM_CATALOG = {
    Bow: { weight: 3, space: 2 },
    Arrows: { weight: 1, space: 1 },
    Dagger: { weight: 1, space: 1 },
    'Healing Herbs': { weight: 1, space: 1 },
    Backpack: {
        weight: 2,
        space: 2,
        upgrade: {
            compartment: 'back',
            maxWeight: 6,
            maxSpace: 4
        }
    }
};

const gameState = {
    inventory: {
        back: [],
        belt: [],
        hands: []
    },
    stats: {
        strength: 10,
        endurance: 10,
        dexterity: 10,
        intelligence: 10,
        wisdom: 10
    }
};

function getItemData(itemName) {
    return ITEM_CATALOG[itemName] || { weight: 1, space: 1 };
}

function getAllInventoryItems() {
    return Object.values(gameState.inventory).flat();
}

function getCompartmentCapacity(compartment) {
    const baseCapacity = INVENTORY_COMPARTMENTS[compartment];
    const capacity = { ...baseCapacity };

    getAllInventoryItems().forEach(item => {
        if (item.upgrade?.compartment === compartment) {
            capacity.maxWeight += item.upgrade.maxWeight;
            capacity.maxSpace += item.upgrade.maxSpace;
        }
    });

    return capacity;
}

function getCompartmentUsage(compartment) {
    return gameState.inventory[compartment].reduce(
        (usage, item) => {
            usage.weight += item.weight;
            usage.space += item.space;
            return usage;
        },
        { weight: 0, space: 0 }
    );
}

function canAddItemToCompartment(itemData, compartment) {
    const capacity = getCompartmentCapacity(compartment);
    const usage = getCompartmentUsage(compartment);

    return {
        fitsWeight: usage.weight + itemData.weight <= capacity.maxWeight,
        fitsSpace: usage.space + itemData.space <= capacity.maxSpace
    };
}

function addToInventory(itemName, preferredCompartment = 'back') {
    const itemData = getItemData(itemName);
    const item = { name: itemName, ...itemData };

    const compartmentsToTry = [
        preferredCompartment,
        ...Object.keys(INVENTORY_COMPARTMENTS).filter(compartment => compartment !== preferredCompartment)
    ];

    const fittingCompartment = compartmentsToTry.find(compartment => {
        const fitCheck = canAddItemToCompartment(item, compartment);
        return fitCheck.fitsWeight && fitCheck.fitsSpace;
    });

    if (!fittingCompartment) {
        setInventoryMessage(`No room for ${itemName}. It exceeds space or weight limits.`);
        return false;
    }

    gameState.inventory[fittingCompartment].push(item);
    setInventoryMessage(`${itemName} added to ${INVENTORY_COMPARTMENTS[fittingCompartment].label}.`);
    updateInventoryDisplay();
    saveGame();
    return true;
}

function setInventoryMessage(message) {
    const messageElement = document.getElementById('inventory-message');
    if (messageElement) {
        messageElement.textContent = message;
    }
}

function updateInventoryItemSelect() {
    const itemSelect = document.getElementById('inventory-item-select');

    if (!itemSelect) {
        return;
    }

    itemSelect.innerHTML = '';

    Object.entries(ITEM_CATALOG).forEach(([itemName, itemData]) => {
        const option = document.createElement('option');
        option.value = itemName;
        option.textContent = `${itemName} (W:${itemData.weight}, S:${itemData.space})`;
        itemSelect.appendChild(option);
    });
}

function updateInventoryDisplay() {
    const inventoryList = document.getElementById('inventory-list');

    if (!inventoryList) {
        return;
    }

    inventoryList.innerHTML = '';

    Object.keys(INVENTORY_COMPARTMENTS).forEach(compartment => {
        const capacity = getCompartmentCapacity(compartment);
        const usage = getCompartmentUsage(compartment);

        const section = document.createElement('section');
        section.className = 'inventory-compartment';

        const heading = document.createElement('h3');
        heading.textContent = `${INVENTORY_COMPARTMENTS[compartment].label} (${usage.space}/${capacity.maxSpace} space, ${usage.weight}/${capacity.maxWeight} weight)`;
        section.appendChild(heading);

        const list = document.createElement('ul');

        if (gameState.inventory[compartment].length === 0) {
            const emptyItem = document.createElement('li');
            emptyItem.textContent = 'Empty';
            emptyItem.className = 'empty-slot';
            list.appendChild(emptyItem);
        } else {
            gameState.inventory[compartment].forEach(item => {
                const listItem = document.createElement('li');
                let label = `${item.name} (W:${item.weight}, S:${item.space})`;

                if (item.upgrade) {
                    label += ' • expands carrying capacity';
                }

                listItem.textContent = label;
                list.appendChild(listItem);
            });
        }

        section.appendChild(list);
        inventoryList.appendChild(section);
    });
}

function updateStatsDisplay() {
    const maxDisplayValue = 20;

    for (const stat in gameState.stats) {
        const fillElement = document.getElementById(stat);
        const valueElement = document.getElementById(`${stat}-value`);

        if (fillElement) {
            const percent = Math.max(0, Math.min((gameState.stats[stat] / maxDisplayValue) * 100, 100));
            fillElement.style.width = `${percent}%`;
        }

        if (valueElement) {
            valueElement.textContent = gameState.stats[stat];
        }
    }
}

function modifyStat(stat, amount) {
    if (Object.prototype.hasOwnProperty.call(gameState.stats, stat)) {
        gameState.stats[stat] = Math.max(0, gameState.stats[stat] + amount);
        updateStatsDisplay();
        saveGame();
    }
}

function saveGame() {
    localStorage.setItem('gameState', JSON.stringify(gameState));
}

function migrateLegacyInventory(legacyInventory) {
    if (!Array.isArray(legacyInventory)) {
        return { back: [], belt: [], hands: [] };
    }

    const migrated = { back: [], belt: [], hands: [] };

    legacyInventory.forEach(itemName => {
        const itemData = getItemData(itemName);
        migrated.back.push({ name: itemName, ...itemData });
    });

    return migrated;
}

function loadGame() {
    const savedState = localStorage.getItem('gameState');

    if (savedState) {
        const loadedState = JSON.parse(savedState);

        if (Array.isArray(loadedState.inventory)) {
            gameState.inventory = migrateLegacyInventory(loadedState.inventory);
        } else {
            gameState.inventory = loadedState.inventory || gameState.inventory;
        }

        gameState.stats = loadedState.stats || gameState.stats;
    }

    updateInventoryItemSelect();
    updateInventoryDisplay();
    updateStatsDisplay();
}

function handle404() {
    if (document.title.includes('Lost in the Void')) {
        console.log('Player encountered a 404 error');
        document.body.style.opacity = 0;
        setTimeout(() => {
            document.body.style.transition = 'opacity 2s';
            document.body.style.opacity = 1;
        }, 100);
    }
}

function setupInventoryPopup() {
    const openBtn = document.getElementById('open-inventory');
    const closeBtn = document.getElementById('close-inventory');
    const popup = document.getElementById('inventory-popup');
    const addForm = document.getElementById('inventory-add-form');

    openBtn.addEventListener('click', () => {
        popup.classList.add('show');
    });

    closeBtn.addEventListener('click', () => {
        popup.classList.remove('show');
    });

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            popup.classList.remove('show');
        }
    });

    addForm.addEventListener('submit', event => {
        event.preventDefault();

        const itemName = document.getElementById('inventory-item-select').value;
        const compartment = document.getElementById('inventory-compartment-select').value;

        addToInventory(itemName, compartment);
    });
}

document.addEventListener('DOMContentLoaded', function() {
    loadGame();
    handle404();
    setupInventoryPopup();

    document.querySelectorAll('#choices a').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            saveGame();
            window.location.href = this.href;
        });
    });
});
