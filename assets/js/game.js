// game.js

const INVENTORY_COMPARTMENTS = {
    back: { label: 'Back', maxWeight: 8, maxSpace: 6 },
    belt: { label: 'Belt', maxWeight: 4, maxSpace: 4 },
    hands: { label: 'Hands', maxWeight: 6, maxSpace: 2 },
    armour: { label: 'Armour', maxWeight: 10, maxSpace: 6 }
};

const DEFAULT_ITEM_CATALOG = {
    Bow: {
        weight: 3,
        space: 2,
        combat: {
            skill: 'Longbow Aim',
            attackModifier: 1,
            damage: [2, 6],
            tags: ['ranged']
        }
    },
    Arrows: { weight: 1, space: 1 },
    Dagger: {
        weight: 1,
        space: 1,
        combat: {
            skill: 'Swordplay',
            attackModifier: 2,
            damage: [1, 6],
            tags: ['light']
        }
    },
    'Healing Herbs': { weight: 1, space: 1 },
    Backpack: {
        weight: 2,
        space: 2,
        requiredCompartment: 'back',
        upgrade: {
            compartment: 'back',
            maxWeight: 6,
            maxSpace: 4
        }
    }
};

const DATA_ITEMS = Array.isArray(window.GAME_DATA?.items) ? window.GAME_DATA.items : [];
const ITEM_CATALOG = DATA_ITEMS.length
    ? DATA_ITEMS.reduce((catalog, item) => {
        if (!item?.name) {
            return catalog;
        }

        const { name, ...itemData } = item;
        catalog[name] = itemData;
        return catalog;
    }, {})
    : DEFAULT_ITEM_CATALOG;

const DATA_FOES = Array.isArray(window.GAME_DATA?.foes) ? window.GAME_DATA.foes : [];

const DATA_COMBAT_TABLES = window.GAME_DATA?.combat_tables || {
    criticals: { slash: [], puncture: [], crush: [] },
    fumbles: []
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

const DEFAULT_INVENTORY = {
    back: [],
    belt: [],
    hands: [],
    armour: []
};

const DEFAULT_STATS = {
    strength: 10,
    endurance: 10,
    dexterity: 10,
    intelligence: 10,
    wisdom: 10
};

function cloneSkills() {
    return SKILL_TREE.map(generalSkill => ({
        ...generalSkill,
        branches: generalSkill.branches.map(branch => ({
            ...branch,
            skills: branch.skills.map(skill => ({ ...skill }))
        }))
    }));
}

function cloneInventory() {
    return {
        back: [...DEFAULT_INVENTORY.back],
        belt: [...DEFAULT_INVENTORY.belt],
        hands: [...DEFAULT_INVENTORY.hands],
        armour: [...DEFAULT_INVENTORY.armour]
    };
}

const gameState = {
    inventory: cloneInventory(),
    stats: { ...DEFAULT_STATS },
    skills: cloneSkills()
};

function generateItemId() {
    return `item-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getItemData(itemName) {
    const itemData = ITEM_CATALOG[itemName];
    if (!itemData) {
        console.warn(`Item not found in catalog: ${itemName}`);
        return { weight: 1, space: 1 };
    }
    return itemData;
}

function getFoeData(foeIdOrName) {
    const foe = DATA_FOES.find(entry => entry.id === foeIdOrName || entry.name === foeIdOrName);
    return foe || null;
}

function rollDie(sides = 6) {
    return Math.floor(Math.random() * sides) + 1;
}

function rollRange(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getSkillLevel(skillName) {
    if (!skillName) {
        return 0;
    }

    for (const generalSkill of gameState.skills) {
        for (const branch of generalSkill.branches) {
            const match = branch.skills.find(skill => skill.name === skillName);
            if (match) {
                return match.level;
            }
        }
    }

    return 0;
}

function getCombatWeaponsFromInventory() {
    return getAllInventoryItems()
        .map(item => {
            const catalogData = getItemData(item.name);
            const combat = item.combat || catalogData.combat;

            if (!combat) {
                return null;
            }

            return {
                ...item,
                combat,
                skillLevel: getSkillLevel(combat.skill)
            };
        })
        .filter(Boolean);
}

function getDamageType(tags = [], name = '') {
    const lowerName = name.toLowerCase();
    if (tags.includes('ranged') || tags.includes('piercing') || lowerName.includes('bow') || lowerName.includes('arrow')) return 'puncture';
    if (tags.includes('blunt') || lowerName.includes('hammer') || lowerName.includes('mace') || lowerName.includes('fist')) return 'crush';
    // Default to slash for edged weapons or generic
    return 'slash';
}

function lookupCombatTable(table, roll) {
    if (!Array.isArray(table) || table.length === 0) return null;
    // Find the first entry where roll <= max
    const entry = table.find(e => roll <= e.max);
    return entry || table[table.length - 1];
}

function resolveAttackRound({
    attackerSkill = 0,
    attackerRandom = rollDie(10),
    weaponAttackModifier = 0,
    defenderDexterity = 0,
    defenderRandom = rollDie(10),
    defenderArmourModifier = 0,
    damageRange = [1, 4],
    weaponTags = [],
    weaponName = ''
}) {
    const isCritical = attackerRandom === 10;
    const isFumble = attackerRandom === 1;

    const attackRoll = attackerSkill + attackerRandom + weaponAttackModifier;
    const defenceRoll = defenderDexterity + defenderRandom + defenderArmourModifier;
    
    let hit = attackRoll > defenceRoll;
    let damage = 0;
    let critResult = null;
    let fumbleResult = null;
    let critRoll = 0;
    let fumbleRoll = 0;

    if (isCritical) hit = true;
    if (isFumble) hit = false;

    if (hit) {
        const baseDamage = rollRange(damageRange[0], damageRange[1]);
        
        if (isCritical) {
            critRoll = rollRange(1, 100);
            const type = getDamageType(weaponTags, weaponName);
            const table = DATA_COMBAT_TABLES.criticals[type] || DATA_COMBAT_TABLES.criticals.slash;
            critResult = lookupCombatTable(table, critRoll);
            
            if (critResult) {
                damage = Math.floor(baseDamage * (critResult.multiplier || 1));
            } else {
                damage = baseDamage * 2; // Fallback
            }
        } else {
            damage = baseDamage;
        }
    } else if (isFumble) {
        fumbleRoll = rollRange(1, 100);
        const table = DATA_COMBAT_TABLES.fumbles;
        fumbleResult = lookupCombatTable(table, fumbleRoll);
    }

    return {
        attackRoll,
        defenceRoll,
        hit,
        damage,
        isCritical,
        isFumble,
        critResult,
        fumbleResult,
        critRoll,
        fumbleRoll,
        details: {
            attackerSkill,
            attackerRandom,
            weaponAttackModifier,
            defenderDexterity,
            defenderRandom,
            defenderArmourModifier
        }
    };
}

function getAllInventoryItems() {
    return Object.values(gameState.inventory).flat();
}

function getTotalCarriedWeight() {
    return getAllInventoryItems().reduce((total, item) => total + item.weight, 0);
}

function getStrengthWeightLimit() {
    const baseStrength = gameState.stats.strength;
    const passiveBonus = calculatePassiveEffects().strength || 0;
    return Math.max(0, baseStrength + passiveBonus);
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
    if (!itemData || typeof itemData.weight !== 'number' || typeof itemData.space !== 'number') {
        console.error('Invalid item data passed to canAddItemToCompartment:', itemData);
        return {
            fitsWeight: false,
            fitsSpace: false,
            fitsStrength: false
        };
    }

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
    const targetCompartment = item.requiredCompartment || preferredCompartment;

    const fitCheck = canAddItemToCompartment(item, targetCompartment);

    if (!(fitCheck.fitsWeight && fitCheck.fitsSpace && fitCheck.fitsStrength)) {
        setInventoryMessage(`No room for ${itemName} in ${INVENTORY_COMPARTMENTS[targetCompartment].label}.`);
        showGlideAlert(`No room for ${itemName} in ${INVENTORY_COMPARTMENTS[targetCompartment].label}.`, 'warning');
        return false;
    }

    gameState.inventory[targetCompartment].push(item);
    setInventoryMessage(`${itemName} added to ${INVENTORY_COMPARTMENTS[targetCompartment].label}.`);
    showGlideAlert(`${itemName} added to ${INVENTORY_COMPARTMENTS[targetCompartment].label}.`, 'success');
    updateInventoryDisplay();
    updateStatsDisplay();
    saveGame();
    return true;
}

function setInventoryMessage(message) {
    const messageElement = document.getElementById('inventory-message');
    if (messageElement) {
        messageElement.textContent = message;
    }
}

function addAvailableItem(itemName, targetCompartment = 'back') {
    if (!itemName || hasItemByName(itemName)) {
        return false;
    }

    const itemData = getItemData(itemName);
    const compartment = itemData.requiredCompartment || targetCompartment;
    return addToInventory(itemName, compartment);
}

function handleInventoryDrop(event, targetCompartment) {
    event.preventDefault();

    const itemId = event.dataTransfer.getData('text/plain');
    if (itemId) {
        moveItem(itemId, targetCompartment);
        return;
    }

    const itemName = event.dataTransfer.getData('application/x-available-item')
        || event.dataTransfer.getData('text/inventory-item-name');

    if (itemName) {
        addAvailableItem(itemName, targetCompartment);
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

    if (item.requiredCompartment && targetCompartment !== item.requiredCompartment) {
        gameState.inventory[sourceCompartment].splice(itemIndex, 0, item);
        setInventoryMessage(`${item.name} must stay in ${INVENTORY_COMPARTMENTS[item.requiredCompartment].label}.`);
        showGlideAlert(`${item.name} must stay in ${INVENTORY_COMPARTMENTS[item.requiredCompartment].label}.`, 'warning');
        updateInventoryDisplay();
        return false;
    }

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
    updateStatsDisplay();
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
            updateStatsDisplay();
            saveGame();
            return true;
        }
    }

    return false;
}

function applyItemEffect(item) {
    if (!item.effect) {
        console.warn(`Item ${item.name} has no effect defined`);
        return false;
    }

    const effect = item.effect;

    if (effect.type === 'heal-stat') {
        const stat = effect.stat;
        const defaultStat = DEFAULT_STATS[stat];
        
        if (effect.amount === 'all') {
            gameState.stats[stat] = defaultStat;
            showGlideAlert(`${item.name} healed your ${stat} back to ${defaultStat}!`, 'success');
        } else {
            gameState.stats[stat] = Math.min(gameState.stats[stat] + effect.amount, defaultStat);
            showGlideAlert(`${item.name} healed your ${stat} by ${effect.amount}!`, 'success');
        }
        return true;
    } else if (effect.type === 'boost-stat') {
        const stat = effect.stat;
        gameState.stats[stat] += effect.amount;
        showGlideAlert(`${item.name} increased your ${stat} by ${effect.amount}!`, 'success');
        return true;
    }

    return false;
}

function useItem(itemId) {
    for (const compartment of Object.keys(gameState.inventory)) {
        const index = gameState.inventory[compartment].findIndex(item => item.id === itemId);

        if (index !== -1) {
            const item = gameState.inventory[compartment][index];
            const itemData = getItemData(item.name);

            if (!itemData.consumable) {
                showGlideAlert(`${item.name} cannot be used.`, 'warning');
                return false;
            }

            if (applyItemEffect({ ...item, ...itemData })) {
                gameState.inventory[compartment].splice(index, 1);
                setInventoryMessage(`${item.name} used and consumed.`);
                updateInventoryDisplay();
                updateStatsDisplay();
                saveGame();
                return true;
            }

            return false;
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
            handleInventoryDrop(event, compartment);
        });

        if (gameState.inventory[compartment].length > 0) {
            gameState.inventory[compartment].forEach(item => {
                const listItem = document.createElement('li');
                listItem.draggable = true;
                listItem.dataset.itemId = item.id;
                
                const labelSpan = document.createElement('span');
                labelSpan.textContent = item.name;
                labelSpan.style.cursor = 'pointer';
                labelSpan.addEventListener('click', () => {
                    showItemDetails(item.name);
                });

                const buttonContainer = document.createElement('div');
                buttonContainer.className = 'inventory-item-buttons';

                const itemData = getItemData(item.name);
                if (itemData.consumable) {
                    const useButton = document.createElement('button');
                    useButton.type = 'button';
                    useButton.className = 'inventory-use-btn';
                    useButton.textContent = 'Use';
                    useButton.addEventListener('click', () => {
                        useItem(item.id);
                    });
                    buttonContainer.appendChild(useButton);
                }

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
                buttonContainer.appendChild(discardButton);
                listItem.appendChild(buttonContainer);
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

}

function updateStatsDisplay() {
    const maxDisplayValue = 20;
    const passiveBonus = calculatePassiveEffects();

    for (const stat in gameState.stats) {
        const baseValue = gameState.stats[stat];
        const bonus = passiveBonus[stat] || 0;
        const displayValue = baseValue + bonus;
        
        const fillElement = document.getElementById(stat);
        const valueElement = document.getElementById(`${stat}-value`);

        if (fillElement) {
            const percent = Math.max(0, Math.min((displayValue / maxDisplayValue) * 100, 100));
            fillElement.style.width = `${percent}%`;
        }

        if (valueElement) {
            let text = displayValue.toString();
            if (bonus > 0) {
                text += ` (+${bonus})`;
            }
            valueElement.textContent = text;
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

    gameState.skills.forEach(generalSkill => {
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

function calculatePassiveEffects() {
    const passiveBonus = {
        strength: 0,
        endurance: 0,
        dexterity: 0,
        intelligence: 0,
        wisdom: 0,
        armourBonus: 0
    };

    getAllInventoryItems().forEach(item => {
        const itemData = getItemData(item.name);
        
        if (itemData.passiveEffect) {
            const effect = itemData.passiveEffect;
            if (effect.type === 'stat-boost' && effect.stat) {
                passiveBonus[effect.stat] = (passiveBonus[effect.stat] || 0) + (effect.amount || 0);
            } else if (effect.type === 'armour-bonus' && effect.defenceBonus) {
                passiveBonus.armourBonus += effect.defenceBonus;
            }
        }
    });

    return passiveBonus;
}

function saveGame() {
    localStorage.setItem('gameState', JSON.stringify(gameState));
}

function migrateLegacyInventory(legacyInventory) {
    if (!Array.isArray(legacyInventory)) {
        return { back: [], belt: [], hands: [], armour: [] };
    }

    const migrated = { back: [], belt: [], hands: [], armour: [] };

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

        Object.keys(INVENTORY_COMPARTMENTS).forEach(compartment => {
            gameState.inventory[compartment] = (gameState.inventory[compartment] || []).map(item => ({
                id: item.id || generateItemId(),
                ...item
            }));
        });

        gameState.stats = loadedState.stats || gameState.stats;
        gameState.skills = loadedState.skills || gameState.skills;
    }

    updateInventoryDisplay();
    updateStatsDisplay();
    updateSkillsDisplay();
}

function resetGameToDefaults() {
    gameState.inventory = cloneInventory();
    gameState.stats = { ...DEFAULT_STATS };
    gameState.skills = cloneSkills();
    saveGame();
    updateInventoryDisplay();
    updateStatsDisplay();
    updateSkillsDisplay();
}

function isStartPage() {
    return /\/(?:scenes\/)?start(?:\.html)?\/?$/.test(window.location.pathname);
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
    const itemDetailsPopup = document.getElementById('item-details-popup');

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
            if (itemDetailsPopup) {
                itemDetailsPopup.classList.remove('show');
            }
        }
    });
}

function setupInventoryPopup() {
    const popup = document.getElementById('inventory-popup');

    if (!popup) {
        return;
    }

    const closeButton = popup.querySelector('.popup-close-btn');
    if (closeButton) {
        closeButton.addEventListener('click', function() {
            popup.classList.remove('show');
        });
    }
}

function setupItemDetailsPopup() {
    const popup = document.getElementById('item-details-popup');

    if (!popup) {
        return;
    }

    const closeButton = popup.querySelector('.popup-close-btn');
    if (closeButton) {
        closeButton.addEventListener('click', function() {
            popup.classList.remove('show');
        });
    }
}

function applyPageStatBonuses() {
    if (!window.PAGE_STAT_BONUSES || typeof window.PAGE_STAT_BONUSES !== 'object') {
        return;
    }

    for (const stat in window.PAGE_STAT_BONUSES) {
        const bonus = window.PAGE_STAT_BONUSES[stat];
        if (bonus && typeof bonus === 'number') {
            modifyStat(stat, bonus);
        }
    }

    updateStatsDisplay();
    saveGame();
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
    if (isStartPage()) {
        resetGameToDefaults();
    } else {
        loadGame();
    }
    handle404();
    setupEdgePopups();
    setupInventoryPopup();
    setupItemDetailsPopup();
    setupSkillsPopup();
    initializeAvailableItems();
    applyPageStatBonuses();

    document.querySelectorAll('#choices a').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            saveGame();
            window.location.href = this.href;
        });
    });
});

function displayAvailableItems(items, containerId = 'available-items-bar') {
    // Legacy function - kept for backward compatibility
    // Items should now be rendered in Jekyll templates using _includes/available_items.html
    const container = document.getElementById(containerId);
    if (!container) {
        console.warn(`Container with id '${containerId}' not found`);
        return;
    }

    if (!items || !Array.isArray(items)) {
        return;
    }

    items.forEach(itemName => {
        const itemDiv = document.createElement('div');
        itemDiv.draggable = true;
        itemDiv.className = 'available-item-chip';
        itemDiv.dataset.itemName = itemName;
        itemDiv.textContent = itemName;
        container.appendChild(itemDiv);
    });

    // Initialize drag listeners for dynamically created items
    initializeAvailableItems();
}

function initializeAvailableItems() {
    // Set up delegated drag event listener
    document.addEventListener('dragstart', function(e) {
        if (e.target.classList.contains('available-item-chip')) {
            const itemName = e.target.dataset.itemName;
            e.dataTransfer.effectAllowed = 'copy';
            e.dataTransfer.setData('application/x-available-item', itemName);
        }
    });

    // Make all items draggable
    document.querySelectorAll('.available-item-chip').forEach(chip => {
        chip.draggable = true;
    });
}

function renderCombatStats(statsContainerId, stats, type = 'foe') {
    const container = document.getElementById(statsContainerId);
    if (!container) return;

    container.innerHTML = '';

    const statKeys = type === 'hero' 
        ? ['strength', 'endurance', 'dexterity', 'intelligence', 'wisdom']
        : ['strength', 'endurance', 'dexterity', 'armourModifier', 'attackSkill'];
    
    const maxValues = {
        strength: 20,
        endurance: 100,
        dexterity: 20,
        intelligence: 20,
        wisdom: 20,
        armourModifier: 10,
        attackSkill: 10
    };

    statKeys.forEach(stat => {
        const value = stats[stat] || 0;
        const maxValue = maxValues[stat] || 20;
        const percentage = Math.min(100, (value / maxValue) * 100);
        
        const statDiv = document.createElement('div');
        statDiv.className = 'combat-stat';
        
        const label = stat.replace(/([A-Z])/g, ' $1').trim();
        
        statDiv.innerHTML = `
            <div class="stat-heading">
                <label>${label}</label>
                <span class="stat-value">${value}</span>
            </div>
            <div class="stat-bar">
                <div class="stat-fill" style="width: ${percentage}%"></div>
            </div>
        `;
        
        container.appendChild(statDiv);
    });
}

function addItemsOnLoad(items) {
    if (!items || !Array.isArray(items)) {
        return;
    }

    items.forEach(itemName => {
        addToInventory(itemName);
    });
}

function initializeCombat(containerId, foe, options = {}) {
    const container = document.getElementById(containerId);
    if (!container || !foe) {
        console.error(`Combat initialization failed: container or foe missing`);
        return;
    }

    const {
        successMessage = 'You are victorious.',
        successRedirect = 'forest',
        fleeRedirect = null,
        defeatRedirect = 'start',
        heroArmourModifier = 0
    } = options;

    const weaponChoice = container.querySelector('#weapon-choice');
    const attackButton = container.querySelector('#attack-button');
    const fleeButton = container.querySelector('#flee-button');
    const foeName = container.querySelector('#foe-name');
    const combatStatus = container.querySelector('#combat-status');
    const combatLog = container.querySelector('#combat-log');

    let combatEnded = false;

    function appendLog(message) {
        const entry = document.createElement('p');
        entry.textContent = message;
        combatLog.appendChild(entry);
        combatLog.scrollTop = combatLog.scrollHeight;
    }

    function renderWeapons() {
        const weapons = getCombatWeaponsFromInventory();
        weaponChoice.innerHTML = '';

        if (weapons.length === 0) {
            const fists = document.createElement('option');
            fists.value = '__fists__';
            fists.textContent = 'Bare Hands (Untrained)';
            weaponChoice.appendChild(fists);
            return;
        }

        weapons.forEach(weapon => {
            const option = document.createElement('option');
            option.value = weapon.id;
            option.textContent = `${weapon.name} (Skill ${weapon.skillLevel}, +${weapon.combat.attackModifier} hit)`;
            weaponChoice.appendChild(option);
        });
    }

    function getSelectedWeapon() {
        const chosen = weaponChoice.value;
        const weapons = getCombatWeaponsFromInventory();
        const selected = weapons.find(weapon => weapon.id === chosen);

        if (selected) {
            return selected;
        }

        return {
            id: '__fists__',
            name: 'Bare Hands',
            skillLevel: 0,
            combat: {
                skill: null,
                attackModifier: 0,
                damage: [1, 3]
            }
        };
    }

    function updateDisplay() {
        if (foeName) {
            foeName.textContent = foe.name;
        }

        renderCombatStats('foe-stats', foe, 'foe');
        renderCombatStats('hero-stats', gameState.stats, 'hero');
    }

    function endCombat(message, redirectTo) {
        combatEnded = true;
        if (attackButton) attackButton.disabled = true;
        if (fleeButton) fleeButton.disabled = true;
        if (combatStatus) combatStatus.textContent = message;

        if (redirectTo) {
            setTimeout(() => {
                window.location.href = `${redirectTo}.html`;
            }, 1800);
        }
    }

    if (attackButton) {
        attackButton.addEventListener('click', function() {
            if (combatEnded) {
                return;
            }

            const weapon = getSelectedWeapon();

            const heroAttack = resolveAttackRound({
                attackerSkill: weapon.skillLevel,
                weaponAttackModifier: weapon.combat.attackModifier,
                defenderDexterity: foe.dexterity,
                defenderArmourModifier: foe.armourModifier,
                damageRange: weapon.combat.damage,
                weaponTags: weapon.combat.tags,
                weaponName: weapon.name
            });

            if (heroAttack.isFumble) {
                const fumbleText = heroAttack.fumbleResult ? heroAttack.fumbleResult.text : "You stumble!";
                appendLog(`FUMBLE! (Roll ${heroAttack.fumbleRoll}) ${fumbleText}`);
                if (heroAttack.fumbleResult && heroAttack.fumbleResult.damage_self > 0) {
                    modifyStat('endurance', -heroAttack.fumbleResult.damage_self);
                    appendLog(`You take ${heroAttack.fumbleResult.damage_self} damage from your clumsiness.`);
                }
            } else if (heroAttack.isCritical) {
                const critText = heroAttack.critResult ? heroAttack.critResult.text : "A devastating blow!";
                appendLog(`CRITICAL HIT! (Roll ${heroAttack.critRoll}) ${critText}`);
                foe.endurance = Math.max(0, foe.endurance - heroAttack.damage);
                appendLog(`You deal ${heroAttack.damage} damage to ${foe.name}.`);
            } else if (heroAttack.hit) {
                appendLog(`You attack with ${weapon.name}: ${heroAttack.attackRoll} vs Defence ${heroAttack.defenceRoll}.`);
                foe.endurance = Math.max(0, foe.endurance - heroAttack.damage);
                appendLog(`Hit! ${weapon.name} deals ${heroAttack.damage} damage.`);
            } else {
                appendLog(`You attack with ${weapon.name}: ${heroAttack.attackRoll} vs Defence ${heroAttack.defenceRoll}.`);
                appendLog('Miss. Your strike is evaded.');
            }

            updateDisplay();

            if (foe.endurance <= 0) {
                endCombat(successMessage, successRedirect);
                return;
            }

            const foeAttack = resolveAttackRound({
                attackerSkill: foe.attackSkill,
                weaponAttackModifier: foe.weaponAttackModifier,
                defenderDexterity: gameState.stats.dexterity,
                defenderArmourModifier: heroArmourModifier,
                damageRange: foe.damage,
                weaponName: foe.name // Use foe name to guess damage type (e.g. "Wolf" -> crush/slash)
            });

            if (foeAttack.isFumble) {
                const fumbleText = foeAttack.fumbleResult ? foeAttack.fumbleResult.text : "stumbles!";
                appendLog(`${foe.name} FUMBLES! (Roll ${foeAttack.fumbleRoll}) ${fumbleText}`);
                if (foeAttack.fumbleResult && foeAttack.fumbleResult.damage_self > 0) {
                    foe.endurance = Math.max(0, foe.endurance - foeAttack.fumbleResult.damage_self);
                    appendLog(`${foe.name} hurts themselves for ${foeAttack.fumbleResult.damage_self} damage.`);
                }
            } else if (foeAttack.isCritical) {
                const critText = foeAttack.critResult ? foeAttack.critResult.text : "A devastating blow!";
                appendLog(`${foe.name} lands a CRITICAL HIT! (Roll ${foeAttack.critRoll}) ${critText}`);
                modifyStat('endurance', -foeAttack.damage);
                appendLog(`You take ${foeAttack.damage} damage!`);
            } else if (foeAttack.hit) {
                appendLog(`${foe.name} attacks: ${foeAttack.attackRoll} vs your Defence ${foeAttack.defenceRoll}.`);
                modifyStat('endurance', -foeAttack.damage);
                appendLog(`${foe.name} hits you for ${foeAttack.damage} damage.`);
            } else {
                appendLog(`${foe.name} attacks: ${foeAttack.attackRoll} vs your Defence ${foeAttack.defenceRoll}.`);
                appendLog('You evade the attack.');
            }

            updateDisplay();

            if (gameState.stats.endurance <= 0) {
                endCombat('You are reduced to 0 endurance, fall unconscious, and are defeated.', defeatRedirect);
            }
        });
    }

    if (fleeButton) {
        fleeButton.addEventListener('click', function() {
            if (combatEnded) {
                return;
            }

            appendLog('You flee from combat.');
            endCombat('You have escaped.', fleeRedirect || successRedirect);
        });
    }

    // Defer initialization to ensure game.js loadGame() completes first
    setTimeout(function() {
        renderWeapons();
        updateDisplay();
        appendLog('Combat begins. Choose a weapon and fight round by round or flee.');
    }, 0);
}

function showItemDetails(itemName) {
    const itemData = getItemData(itemName);
    if (!itemData) return;

    const popup = document.getElementById('item-details-popup');
    const nameElement = document.getElementById('item-details-name');
    const contentElement = document.getElementById('item-details-content');

    nameElement.textContent = itemName;
    contentElement.innerHTML = '';

    // Description
    if (itemData.description) {
        const descDiv = document.createElement('p');
        descDiv.className = 'item-details-description';
        descDiv.textContent = itemData.description;
        contentElement.appendChild(descDiv);
    }

    // Weight and space
    const statsDiv = document.createElement('div');
    statsDiv.className = 'item-stats';
    statsDiv.innerHTML = `
        <p><strong>Weight:</strong> ${itemData.weight}</p>
        <p><strong>Space:</strong> ${itemData.space}</p>
    `;
    contentElement.appendChild(statsDiv);

    // Combat stats if available
    if (itemData.combat) {
        const combatDiv = document.createElement('div');
        combatDiv.className = 'item-combat-stats';
        let combatHTML = '<strong>Combat Stats:</strong><ul>';
        combatHTML += `<li>Skill: ${itemData.combat.skill}</li>`;
        combatHTML += `<li>Attack Modifier: +${itemData.combat.attackModifier}</li>`;
        combatHTML += `<li>Damage: ${itemData.combat.damage[0]}d${itemData.combat.damage[1]}</li>`;
        if (itemData.combat.tags && itemData.combat.tags.length > 0) {
            combatHTML += `<li>Tags: ${itemData.combat.tags.join(', ')}</li>`;
        }
        combatHTML += '</ul>';
        combatDiv.innerHTML = combatHTML;
        contentElement.appendChild(combatDiv);
    }

    // Consumable effect if available
    if (itemData.consumable && itemData.effect) {
        const effectDiv = document.createElement('div');
        effectDiv.className = 'item-effect';
        let effectHTML = '<strong>Effect when used:</strong><ul>';
        const effect = itemData.effect;
        if (effect.type === 'heal-stat') {
            effectHTML += `<li>Restores ${effect.stat} to full</li>`;
        } else if (effect.type === 'boost-stat') {
            effectHTML += `<li>Boosts ${effect.stat} by ${effect.amount}</li>`;
        }
        effectHTML += '</ul>';
        effectDiv.innerHTML = effectHTML;
        contentElement.appendChild(effectDiv);
    }

    // Show popup
    if (popup) {
        popup.classList.add('show');
    }
}

function closeItemDetails() {
    const popup = document.getElementById('item-details-popup');
    if (popup) {
        popup.classList.remove('show');
    }
}

window.showGlideAlert = showGlideAlert;
window.getFoeData = getFoeData;
window.displayAvailableItems = displayAvailableItems;
window.addItemsOnLoad = addItemsOnLoad;
window.initializeCombat = initializeCombat;
window.initializeAvailableItems = initializeAvailableItems;
