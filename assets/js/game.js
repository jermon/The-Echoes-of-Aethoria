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

const SKILL_TREE = [
    {
        name: 'Combat',
        branches: [
            {
                name: 'Melee',
                skills: [
                    { name: 'Swordplay', level: 4 },
                    { name: 'Shield Bash', level: 3 },
                    { name: 'Riposte', level: 2 }
                ]
            },
            {
                name: 'Ranged',
                skills: [
                    { name: 'Longbow Aim', level: 5 },
                    { name: 'Quick Draw', level: 3 },
                    { name: 'Piercing Shot', level: 4 }
                ]
            }
        ]
    },
    {
        name: 'Survival',
        branches: [
            {
                name: 'Tracking',
                skills: [
                    { name: 'Trail Reading', level: 4 },
                    { name: 'Scent Marking', level: 2 },
                    { name: 'Silent Pursuit', level: 3 }
                ]
            },
            {
                name: 'Fieldcraft',
                skills: [
                    { name: 'Camp Setup', level: 4 },
                    { name: 'Foraging', level: 5 },
                    { name: 'Herbal Remedy', level: 3 }
                ]
            }
        ]
    },
    {
        name: 'Mysticism',
        branches: [
            {
                name: 'Runes',
                skills: [
                    { name: 'Glyph Etching', level: 2 },
                    { name: 'Ward Sigils', level: 3 },
                    { name: 'Resonance Binding', level: 1 }
                ]
            },
            {
                name: 'Mind Arts',
                skills: [
                    { name: 'Focus Trance', level: 4 },
                    { name: 'Echo Sense', level: 5 },
                    { name: 'Spirit Lure', level: 2 }
                ]
            }
        ]
    }
];

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

function generateItemId() {
    return `item-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getItemData(itemName) {
    return ITEM_CATALOG[itemName] || { weight: 1, space: 1 };
}

function getAllInventoryItems() {
    return Object.values(gameState.inventory).flat();
}

function getTotalCarriedWeight() {
    return getAllInventoryItems().reduce((total, item) => total + item.weight, 0);
}

function getStrengthWeightLimit() {
    return Math.max(0, gameState.stats.strength);
}

function hasItemByName(itemName) {
    return getAllInventoryItems().some(item => item.name === itemName);
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
    const weightLimit = getStrengthWeightLimit();
    const totalWeight = getTotalCarriedWeight();

    return {
        fitsWeight: usage.weight + itemData.weight <= capacity.maxWeight,
        fitsSpace: usage.space + itemData.space <= capacity.maxSpace,
        fitsStrength: totalWeight + itemData.weight <= weightLimit
    };
}

function showGlideAlert(message, type = 'info') {
    const containerId = 'game-toast-container';
    let container = document.getElementById(containerId);

    if (!container) {
        container = document.createElement('div');
        container.id = containerId;
        container.setAttribute('aria-live', 'polite');
        container.setAttribute('aria-atomic', 'true');
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `game-toast game-toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 340);
    }, 2500);
}

function addToInventory(itemName, preferredCompartment = 'back') {
    if (hasItemByName(itemName)) {
        setInventoryMessage(`${itemName} is already equipped in your inventory.`);
        showGlideAlert(`${itemName} is already equipped.`, 'warning');
        return false;
    }

    const itemData = getItemData(itemName);
    const item = { id: generateItemId(), name: itemName, ...itemData };

    const compartmentsToTry = [
        preferredCompartment,
        ...Object.keys(INVENTORY_COMPARTMENTS).filter(compartment => compartment !== preferredCompartment)
    ];

    const fittingCompartment = compartmentsToTry.find(compartment => {
        const fitCheck = canAddItemToCompartment(item, compartment);
        return fitCheck.fitsWeight && fitCheck.fitsSpace && fitCheck.fitsStrength;
    });

    if (!fittingCompartment) {
        setInventoryMessage(`No room for ${itemName}. It exceeds space, compartment weight, or strength limits.`);
        showGlideAlert(`No room for ${itemName}.`, 'warning');
        return false;
    }

    gameState.inventory[fittingCompartment].push(item);
    setInventoryMessage(`${itemName} added to ${INVENTORY_COMPARTMENTS[fittingCompartment].label}.`);
    showGlideAlert(`${itemName} added to ${INVENTORY_COMPARTMENTS[fittingCompartment].label}.`, 'success');
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
        option.disabled = hasItemByName(itemName);
        itemSelect.appendChild(option);
    });

    if (itemSelect.options.length > 0 && itemSelect.selectedOptions[0]?.disabled) {
        const enabledOption = Array.from(itemSelect.options).find(option => !option.disabled);
        if (enabledOption) {
            itemSelect.value = enabledOption.value;
        }
    }
}

function moveItem(itemId, targetCompartment) {
    let sourceCompartment = null;
    let itemIndex = -1;

    Object.keys(gameState.inventory).forEach(compartment => {
        const index = gameState.inventory[compartment].findIndex(item => item.id === itemId);
        if (index !== -1) {
            sourceCompartment = compartment;
            itemIndex = index;
        }
    });

    if (sourceCompartment === null || itemIndex === -1 || sourceCompartment === targetCompartment) {
        return false;
    }

    const [item] = gameState.inventory[sourceCompartment].splice(itemIndex, 1);
    const fitCheck = canAddItemToCompartment(item, targetCompartment);

    if (!(fitCheck.fitsWeight && fitCheck.fitsSpace && fitCheck.fitsStrength)) {
        gameState.inventory[sourceCompartment].splice(itemIndex, 0, item);
        setInventoryMessage(`Cannot move ${item.name} to ${INVENTORY_COMPARTMENTS[targetCompartment].label}.`);
        showGlideAlert('Move blocked by carrying limits.', 'warning');
        updateInventoryDisplay();
        return false;
    }

    gameState.inventory[targetCompartment].push(item);
    setInventoryMessage(`${item.name} moved to ${INVENTORY_COMPARTMENTS[targetCompartment].label}.`);
    showGlideAlert(`${item.name} moved.`, 'success');
    updateInventoryDisplay();
    saveGame();
    return true;
}

function discardItem(itemId) {
    for (const compartment of Object.keys(gameState.inventory)) {
        const index = gameState.inventory[compartment].findIndex(item => item.id === itemId);

        if (index !== -1) {
            const [item] = gameState.inventory[compartment].splice(index, 1);
            setInventoryMessage(`${item.name} discarded.`);
            showGlideAlert(`${item.name} discarded.`, 'info');
            updateInventoryDisplay();
            saveGame();
            return true;
        }
    }

    return false;
}

function updateInventoryDisplay() {
    const inventoryList = document.getElementById('inventory-list');

    if (!inventoryList) {
        return;
    }

    inventoryList.innerHTML = '';

    const summary = document.createElement('p');
    summary.className = 'inventory-summary';
    summary.textContent = `Total weight: ${getTotalCarriedWeight()}/${getStrengthWeightLimit()} (limited by Strength)`;
    inventoryList.appendChild(summary);

    Object.keys(INVENTORY_COMPARTMENTS).forEach(compartment => {
        const capacity = getCompartmentCapacity(compartment);
        const usage = getCompartmentUsage(compartment);

        const section = document.createElement('section');
        section.className = 'inventory-compartment';
        section.dataset.compartment = compartment;

        const heading = document.createElement('h3');
        heading.textContent = `${INVENTORY_COMPARTMENTS[compartment].label} (${usage.space}/${capacity.maxSpace} space, ${usage.weight}/${capacity.maxWeight} weight)`;
        section.appendChild(heading);

        const list = document.createElement('ul');
        list.className = 'inventory-items';

        list.addEventListener('dragover', event => {
            event.preventDefault();
        });

        list.addEventListener('drop', event => {
            event.preventDefault();
            const itemId = event.dataTransfer.getData('text/plain');
            if (itemId) {
                moveItem(itemId, compartment);
            }
        });

        if (gameState.inventory[compartment].length > 0) {
            gameState.inventory[compartment].forEach(item => {
                const listItem = document.createElement('li');
                listItem.draggable = true;
                listItem.dataset.itemId = item.id;
                let label = `${item.name} (W:${item.weight}, S:${item.space})`;

                if (item.upgrade) {
                    label += ' • expands carrying capacity';
                }

                const labelSpan = document.createElement('span');
                labelSpan.textContent = label;

                const discardButton = document.createElement('button');
                discardButton.type = 'button';
                discardButton.className = 'inventory-discard-btn';
                discardButton.textContent = 'Drop';
                discardButton.addEventListener('click', () => {
                    discardItem(item.id);
                });

                listItem.addEventListener('dragstart', event => {
                    event.dataTransfer.setData('text/plain', item.id);
                });

                listItem.appendChild(labelSpan);
                listItem.appendChild(discardButton);
                list.appendChild(listItem);
            });
        }

        const emptyLines = Math.max(capacity.maxSpace - usage.space, 0);

        for (let i = 0; i < emptyLines; i += 1) {
            const emptyLine = document.createElement('li');
            emptyLine.textContent = '────────';
            emptyLine.className = 'empty-slot empty-slot-line';
            list.appendChild(emptyLine);
        }

        section.appendChild(list);
        inventoryList.appendChild(section);
    });

    updateInventoryItemSelect();
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

function updateSkillsDisplay() {
    const skillsTreeElement = document.getElementById('skills-tree');

    if (!skillsTreeElement) {
        return;
    }

    skillsTreeElement.innerHTML = '';

    const rootList = document.createElement('ul');
    rootList.className = 'skills-list skills-list-general';

    SKILL_TREE.forEach(generalSkill => {
        const generalItem = document.createElement('li');
        generalItem.className = 'skill-general';

        const generalLabel = document.createElement('span');
        generalLabel.textContent = generalSkill.name;
        generalItem.appendChild(generalLabel);

        const branchList = document.createElement('ul');
        branchList.className = 'skills-list skills-list-branch';

        generalSkill.branches.forEach(branch => {
            const branchItem = document.createElement('li');
            branchItem.className = 'skill-branch';

            const branchLabel = document.createElement('span');
            branchLabel.textContent = branch.name;
            branchItem.appendChild(branchLabel);

            const specificList = document.createElement('ul');
            specificList.className = 'skills-list skills-list-specific';

            branch.skills.forEach(specificSkill => {
                const specificItem = document.createElement('li');
                specificItem.className = 'skill-specific';

                const specificName = document.createElement('span');
                specificName.textContent = specificSkill.name;

                const specificLevel = document.createElement('span');
                specificLevel.className = 'skill-level';
                specificLevel.textContent = `Lvl ${specificSkill.level}/6`;

                specificItem.appendChild(specificName);
                specificItem.appendChild(specificLevel);
                specificList.appendChild(specificItem);
            });

            branchItem.appendChild(specificList);
            branchList.appendChild(branchItem);
        });

        generalItem.appendChild(branchList);
        rootList.appendChild(generalItem);
    });

    skillsTreeElement.appendChild(rootList);
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
        migrated.back.push({ id: generateItemId(), name: itemName, ...itemData });
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

        Object.keys(gameState.inventory).forEach(compartment => {
            gameState.inventory[compartment] = (gameState.inventory[compartment] || []).map(item => ({
                id: item.id || generateItemId(),
                ...item
            }));
        });

        gameState.stats = loadedState.stats || gameState.stats;
    }

    updateInventoryItemSelect();
    updateInventoryDisplay();
    updateStatsDisplay();
    updateSkillsDisplay();
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

function setupEdgePopups() {
    const inventoryPopup = document.getElementById('inventory-popup');
    const skillsPopup = document.getElementById('skills-popup');

    if (!inventoryPopup || !skillsPopup) {
        return;
    }

    document.addEventListener('mousemove', event => {
        const edgeThreshold = 24;

        if (event.clientX <= edgeThreshold) {
            inventoryPopup.classList.add('show');
        }

        if (event.clientX >= window.innerWidth - edgeThreshold) {
            skillsPopup.classList.add('show');
        }
    });

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            inventoryPopup.classList.remove('show');
            skillsPopup.classList.remove('show');
        }
    });
}

function setupInventoryPopup() {
    const popup = document.getElementById('inventory-popup');
    const addForm = document.getElementById('inventory-add-form');

    if (!popup || !addForm) {
        return;
    }

    popup.addEventListener('mouseleave', () => {
        popup.classList.remove('show');
    });

    addForm.addEventListener('submit', event => {
        event.preventDefault();

        const itemName = document.getElementById('inventory-item-select').value;
        const compartment = document.getElementById('inventory-compartment-select').value;

        addToInventory(itemName, compartment);
    });
}

function setupSkillsPopup() {
    const popup = document.getElementById('skills-popup');

    if (!popup) {
        return;
    }

    popup.addEventListener('mouseleave', () => {
        popup.classList.remove('show');
    });
}

document.addEventListener('DOMContentLoaded', function() {
    loadGame();
    handle404();
    setupEdgePopups();
    setupInventoryPopup();
    setupSkillsPopup();

    document.querySelectorAll('#choices a').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            saveGame();
            window.location.href = this.href;
        });
    });
});

window.showGlideAlert = showGlideAlert;
