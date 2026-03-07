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
