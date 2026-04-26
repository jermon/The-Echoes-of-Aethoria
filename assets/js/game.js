// game.js

const DEFAULT_INVENTORY_COMPARTMENTS = {
    back: { label: 'Back', maxWeight: 8, maxSpace: 6 },
    belt: { label: 'Belt', maxWeight: 4, maxSpace: 4 },
    hands: { label: 'Hands', maxWeight: 6, maxSpace: 2 },
    armour: { label: 'Armour', maxWeight: 10, maxSpace: 6 }
};

const DATA_INVENTORY_COMPARTMENTS = window.GAME_DATA?.inventory_compartments;
const INVENTORY_COMPARTMENTS = Object.keys(DEFAULT_INVENTORY_COMPARTMENTS).reduce((compartments, key) => {
    const candidate = DATA_INVENTORY_COMPARTMENTS?.[key];
    const fallback = DEFAULT_INVENTORY_COMPARTMENTS[key];

    compartments[key] = {
        label: typeof candidate?.label === 'string' ? candidate.label : fallback.label,
        maxWeight: typeof candidate?.maxWeight === 'number' ? candidate.maxWeight : fallback.maxWeight,
        maxSpace: typeof candidate?.maxSpace === 'number' ? candidate.maxSpace : fallback.maxSpace
    };

    return compartments;
}, {});

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

const DEFAULT_SKILL_TREE = [
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

const DEFAULT_SKILL_LEVELS = {
    Swordplay: 4,
    'Shield Bash': 3,
    Riposte: 2,
    'Longbow Aim': 5,
    'Quick Draw': 3,
    'Piercing Shot': 4,
    'Trail Reading': 4,
    'Scent Marking': 2,
    'Silent Pursuit': 3,
    'Camp Setup': 4,
    Foraging: 5,
    'Herbal Remedy': 3,
    'Glyph Etching': 2,
    'Ward Sigils': 3,
    'Resonance Binding': 1,
    'Focus Trance': 4,
    'Echo Sense': 5,
    'Spirit Lure': 2
};

const DATA_SKILLS = Array.isArray(window.GAME_DATA?.skills) ? window.GAME_DATA.skills : [];
const SKILL_TREE = DATA_SKILLS.length
    ? DATA_SKILLS.map(discipline => ({
        name: discipline?.discipline || discipline?.name || 'Unknown',
        branches: Array.isArray(discipline?.branches)
            ? discipline.branches.map(branch => ({
                name: branch?.name || 'Uncategorized',
                skills: Array.isArray(branch?.skills)
                    ? branch.skills
                        .filter(skill => typeof skill?.name === 'string')
                        .map(skill => ({
                            name: skill.name,
                            level: typeof skill.level === 'number'
                                ? skill.level
                                : (DEFAULT_SKILL_LEVELS[skill.name] || 1)
                        }))
                    : []
            }))
            : []
    }))
    : DEFAULT_SKILL_TREE;

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

function generateItemId() {
    return `item-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function rollDie(sides = 6) {
    return Math.floor(Math.random() * sides) + 1;
}

function rollRange(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

class GameApp {
    constructor() {
        this.data = {
            inventoryCompartments: INVENTORY_COMPARTMENTS,
            itemCatalog: ITEM_CATALOG,
            foes: DATA_FOES,
            combatTables: DATA_COMBAT_TABLES,
            skillTree: SKILL_TREE,
            defaultStats: DEFAULT_STATS,
            defaultInventory: DEFAULT_INVENTORY
        };

        this.state = {
            inventory: cloneInventory(),
            stats: { ...DEFAULT_STATS },
            skills: cloneSkills()
        };

        this.ui = new UIManager(this);
        this.inventory = new InventoryManager(this);
        this.combat = new CombatManager(this);
        this.storage = new StorageManager(this);
    }

    getFoeData(foeIdOrName) {
        const foe = this.data.foes.find(entry => entry.id === foeIdOrName || entry.name === foeIdOrName);
        return foe || null;
    }

    getSkillLevel(skillName) {
        if (!skillName) {
            return 0;
        }

        for (const generalSkill of this.state.skills) {
            for (const branch of generalSkill.branches) {
                const match = branch.skills.find(skill => skill.name === skillName);
                if (match) {
                    return match.level;
                }
            }
        }

        return 0;
    }

    calculatePassiveEffects() {
        const passiveBonus = {
            strength: 0,
            endurance: 0,
            dexterity: 0,
            intelligence: 0,
            wisdom: 0,
            armourBonus: 0
        };

        this.inventory.getAllInventoryItems().forEach(item => {
            const itemData = this.inventory.getItemData(item.name);

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

    modifyStat(stat, amount) {
        if (Object.prototype.hasOwnProperty.call(this.state.stats, stat)) {
            this.state.stats[stat] = Math.max(0, this.state.stats[stat] + amount);
            this.ui.updateStatsDisplay();
            this.storage.save();
        }
    }

    loadGame() {
        this.storage.load();
        this.ui.updateInventoryDisplay();
        this.ui.updateStatsDisplay();
        this.ui.updateSkillsDisplay();
    }

    resetGameToDefaults() {
        this.state.inventory = cloneInventory();
        this.state.stats = { ...DEFAULT_STATS };
        this.state.skills = cloneSkills();
        this.storage.save();
        this.ui.updateInventoryDisplay();
        this.ui.updateStatsDisplay();
        this.ui.updateSkillsDisplay();
    }

    isStartPage() {
        return /\/(?:scenes\/)?start(?:\.html)?\/?$/.test(window.location.pathname);
    }

    handle404() {
        if (document.title.includes('Lost in the Void')) {
            console.log('Player encountered a 404 error');
            document.body.style.opacity = 0;
            setTimeout(() => {
                document.body.style.transition = 'opacity 2s';
                document.body.style.opacity = 1;
            }, 100);
        }
    }

    applyPageStatBonuses() {
        if (!window.PAGE_STAT_BONUSES || typeof window.PAGE_STAT_BONUSES !== 'object') {
            return;
        }

        for (const stat in window.PAGE_STAT_BONUSES) {
            const bonus = window.PAGE_STAT_BONUSES[stat];
            if (bonus && typeof bonus === 'number') {
                this.modifyStat(stat, bonus);
            }
        }

        this.ui.updateStatsDisplay();
        this.storage.save();
    }

    init() {
        const app = this;
        if (this.isStartPage()) {
            this.resetGameToDefaults();
        } else {
            this.loadGame();
        }

        this.handle404();
        this.ui.setupEdgePopups();
        this.ui.setupInventoryPopup();
        this.ui.setupSkillsPopup();
        this.ui.initializeAvailableItems();
        this.ui.openInventoryByDefaultWhenItemsPresent();
        this.applyPageStatBonuses();

        document.querySelectorAll('#choices a').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                app.storage.save();
                window.location.href = this.href;
            });
        });
    }
}

class UIManager {
    constructor(app) {
        this.app = app;
    }

    showGlideAlert(message, type = 'info') {
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

    setInventoryMessage(message) {
        const messageElement = document.getElementById('inventory-message');
        if (messageElement) {
            messageElement.textContent = message;
        }
    }

    updateInventoryDisplay() {
        const inventoryList = document.getElementById('inventory-list');

        if (!inventoryList) {
            return;
        }

        inventoryList.innerHTML = '';

        const summary = document.createElement('p');
        summary.className = 'inventory-summary';
        summary.textContent = `Total weight: ${this.app.inventory.getTotalCarriedWeight()}/${this.app.inventory.getStrengthWeightLimit()} (limited by Strength)`;
        inventoryList.appendChild(summary);

        Object.keys(this.app.data.inventoryCompartments).forEach(compartment => {
            const capacity = this.app.inventory.getCompartmentCapacity(compartment);
            const usage = this.app.inventory.getCompartmentUsage(compartment);

            const section = document.createElement('section');
            section.className = 'inventory-compartment';
            section.dataset.compartment = compartment;

            const heading = document.createElement('h3');
            heading.textContent = `${this.app.data.inventoryCompartments[compartment].label} (${usage.space}/${capacity.maxSpace} space, ${usage.weight}/${capacity.maxWeight} weight)`;
            section.appendChild(heading);

            const list = document.createElement('ul');
            list.className = 'inventory-items';

            list.addEventListener('dragover', event => {
                event.preventDefault();
            });

            list.addEventListener('drop', event => {
                this.app.inventory.handleInventoryDrop(event, compartment);
            });

            if (this.app.state.inventory[compartment].length > 0) {
                this.app.state.inventory[compartment].forEach(item => {
                    const listItem = document.createElement('li');
                    listItem.draggable = true;
                    listItem.dataset.itemId = item.id;

                    const labelSpan = document.createElement('span');
                    labelSpan.textContent = item.name;

                    const buttonContainer = document.createElement('div');
                    buttonContainer.className = 'inventory-item-buttons';

                    const itemData = this.app.inventory.getItemData(item.name);
                    if (itemData.consumable) {
                        const useButton = document.createElement('button');
                        useButton.type = 'button';
                        useButton.className = 'inventory-use-btn';
                        useButton.textContent = 'Use';
                        useButton.addEventListener('click', () => {
                            this.app.inventory.useItem(item.id);
                        });
                        buttonContainer.appendChild(useButton);
                    }

                    const discardButton = document.createElement('button');
                    discardButton.type = 'button';
                    discardButton.className = 'inventory-discard-btn';
                    discardButton.textContent = 'Drop';
                    discardButton.addEventListener('click', () => {
                        this.app.inventory.discardItem(item.id);
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

    updateStatsDisplay() {
        const maxDisplayValue = 20;
        const passiveBonus = this.app.calculatePassiveEffects();

        for (const stat in this.app.state.stats) {
            const baseValue = this.app.state.stats[stat];
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

    updateSkillsDisplay() {
        const skillsTreeElement = document.getElementById('skills-tree');

        if (!skillsTreeElement) {
            return;
        }

        skillsTreeElement.innerHTML = '';

        const rootList = document.createElement('ul');
        rootList.className = 'skills-list skills-list-general';

        this.app.state.skills.forEach(generalSkill => {
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

    renderCombatStats(statsContainerId, stats, type = 'foe') {
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

    setupEdgePopups() {
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

    setupInventoryPopup() {
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

    setupSkillsPopup() {
        const popup = document.getElementById('skills-popup');

        if (!popup) {
            return;
        }

        popup.addEventListener('mouseleave', () => {
            popup.classList.remove('show');
        });
    }

    openInventoryByDefaultWhenItemsPresent() {
        const hasSceneItems = document.querySelector('.available-item-chip') !== null;

        if (!hasSceneItems) {
            return;
        }

        const inventoryPopup = document.getElementById('inventory-popup');
        if (inventoryPopup) {
            inventoryPopup.classList.add('show');
        }
    }

    displayAvailableItems(items, containerId = 'available-items-bar') {
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
        this.initializeAvailableItems();
    }

    initializeAvailableItems() {
        document.addEventListener('dragstart', function(e) {
            if (e.target.classList.contains('available-item-chip')) {
                const itemName = e.target.dataset.itemName;
                e.dataTransfer.effectAllowed = 'copy';
                e.dataTransfer.setData('application/x-available-item', itemName);
            }
        });

        document.querySelectorAll('.available-item-chip').forEach(chip => {
            chip.draggable = true;
        });
    }
}

class InventoryManager {
    constructor(app) {
        this.app = app;
    }

    getItemData(itemName) {
        const itemData = this.app.data.itemCatalog[itemName];
        if (!itemData) {
            console.warn(`Item not found in catalog: ${itemName}`);
            return { weight: 1, space: 1 };
        }
        return itemData;
    }

    getAllInventoryItems() {
        return Object.values(this.app.state.inventory).flat();
    }

    getTotalCarriedWeight() {
        return this.getAllInventoryItems().reduce((total, item) => total + item.weight, 0);
    }

    getStrengthWeightLimit() {
        const baseStrength = this.app.state.stats.strength;
        const passiveBonus = this.app.calculatePassiveEffects().strength || 0;
        return Math.max(0, baseStrength + passiveBonus);
    }

    hasItemByName(itemName) {
        return this.getAllInventoryItems().some(item => item.name === itemName);
    }

    getCompartmentCapacity(compartment) {
        const baseCapacity = this.app.data.inventoryCompartments[compartment];
        const capacity = { ...baseCapacity };

        this.getAllInventoryItems().forEach(item => {
            if (item.upgrade?.compartment === compartment) {
                capacity.maxWeight += item.upgrade.maxWeight;
                capacity.maxSpace += item.upgrade.maxSpace;
            }
        });

        return capacity;
    }

    getCompartmentUsage(compartment) {
        return this.app.state.inventory[compartment].reduce(
            (usage, item) => {
                usage.weight += item.weight;
                usage.space += item.space;
                return usage;
            },
            { weight: 0, space: 0 }
        );
    }

    canAddItemToCompartment(itemData, compartment) {
        if (!itemData || typeof itemData.weight !== 'number' || typeof itemData.space !== 'number') {
            console.error('Invalid item data passed to canAddItemToCompartment:', itemData);
            return {
                fitsWeight: false,
                fitsSpace: false,
                fitsStrength: false
            };
        }

        const capacity = this.getCompartmentCapacity(compartment);
        const usage = this.getCompartmentUsage(compartment);
        const weightLimit = this.getStrengthWeightLimit();
        const totalWeight = this.getTotalCarriedWeight();

        return {
            fitsWeight: usage.weight + itemData.weight <= capacity.maxWeight,
            fitsSpace: usage.space + itemData.space <= capacity.maxSpace,
            fitsStrength: totalWeight + itemData.weight <= weightLimit
        };
    }

    addToInventory(itemName, preferredCompartment = 'back') {
        if (this.hasItemByName(itemName)) {
            this.app.ui.setInventoryMessage(`${itemName} is already equipped in your inventory.`);
            this.app.ui.showGlideAlert(`${itemName} is already equipped.`, 'warning');
            return false;
        }

        const itemData = this.getItemData(itemName);
        const item = { id: generateItemId(), name: itemName, ...itemData };
        const targetCompartment = item.requiredCompartment || preferredCompartment;

        const fitCheck = this.canAddItemToCompartment(item, targetCompartment);

        if (!(fitCheck.fitsWeight && fitCheck.fitsSpace && fitCheck.fitsStrength)) {
            this.app.ui.setInventoryMessage(`No room for ${itemName} in ${this.app.data.inventoryCompartments[targetCompartment].label}.`);
            this.app.ui.showGlideAlert(`No room for ${itemName} in ${this.app.data.inventoryCompartments[targetCompartment].label}.`, 'warning');
            return false;
        }

        this.app.state.inventory[targetCompartment].push(item);
        this.app.ui.setInventoryMessage(`${itemName} added to ${this.app.data.inventoryCompartments[targetCompartment].label}.`);
        this.app.ui.showGlideAlert(`${itemName} added to ${this.app.data.inventoryCompartments[targetCompartment].label}.`, 'success');
        this.app.ui.updateInventoryDisplay();
        this.app.ui.updateStatsDisplay();
        this.app.storage.save();
        return true;
    }

    addAvailableItem(itemName, targetCompartment = 'back') {
        if (!itemName || this.hasItemByName(itemName)) {
            return false;
        }

        const itemData = this.getItemData(itemName);
        const compartment = itemData.requiredCompartment || targetCompartment;
        return this.addToInventory(itemName, compartment);
    }

    handleInventoryDrop(event, targetCompartment) {
        event.preventDefault();

        const itemId = event.dataTransfer.getData('text/plain');
        if (itemId) {
            this.moveItem(itemId, targetCompartment);
            return;
        }

        const itemName = event.dataTransfer.getData('application/x-available-item')
            || event.dataTransfer.getData('text/inventory-item-name');

        if (itemName) {
            this.addAvailableItem(itemName, targetCompartment);
        }
    }

    moveItem(itemId, targetCompartment) {
        let sourceCompartment = null;
        let itemIndex = -1;

        Object.keys(this.app.state.inventory).forEach(compartment => {
            const index = this.app.state.inventory[compartment].findIndex(item => item.id === itemId);
            if (index !== -1) {
                sourceCompartment = compartment;
                itemIndex = index;
            }
        });

        if (sourceCompartment === null || itemIndex === -1 || sourceCompartment === targetCompartment) {
            return false;
        }

        const [item] = this.app.state.inventory[sourceCompartment].splice(itemIndex, 1);

        if (item.requiredCompartment && targetCompartment !== item.requiredCompartment) {
            this.app.state.inventory[sourceCompartment].splice(itemIndex, 0, item);
            this.app.ui.setInventoryMessage(`${item.name} must stay in ${this.app.data.inventoryCompartments[item.requiredCompartment].label}.`);
            this.app.ui.showGlideAlert(`${item.name} must stay in ${this.app.data.inventoryCompartments[item.requiredCompartment].label}.`, 'warning');
            this.app.ui.updateInventoryDisplay();
            return false;
        }

        const fitCheck = this.canAddItemToCompartment(item, targetCompartment);

        if (!(fitCheck.fitsWeight && fitCheck.fitsSpace && fitCheck.fitsStrength)) {
            this.app.state.inventory[sourceCompartment].splice(itemIndex, 0, item);
            this.app.ui.setInventoryMessage(`Cannot move ${item.name} to ${this.app.data.inventoryCompartments[targetCompartment].label}.`);
            this.app.ui.showGlideAlert('Move blocked by carrying limits.', 'warning');
            this.app.ui.updateInventoryDisplay();
            return false;
        }

        this.app.state.inventory[targetCompartment].push(item);
        this.app.ui.setInventoryMessage(`${item.name} moved to ${this.app.data.inventoryCompartments[targetCompartment].label}.`);
        this.app.ui.showGlideAlert(`${item.name} moved.`, 'success');
        this.app.ui.updateInventoryDisplay();
        this.app.ui.updateStatsDisplay();
        this.app.storage.save();
        return true;
    }

    discardItem(itemId) {
        for (const compartment of Object.keys(this.app.state.inventory)) {
            const index = this.app.state.inventory[compartment].findIndex(item => item.id === itemId);

            if (index !== -1) {
                const [item] = this.app.state.inventory[compartment].splice(index, 1);
                this.app.ui.setInventoryMessage(`${item.name} discarded.`);
                this.app.ui.showGlideAlert(`${item.name} discarded.`, 'info');
                this.app.ui.updateInventoryDisplay();
                this.app.ui.updateStatsDisplay();
                this.app.storage.save();
                return true;
            }
        }

        return false;
    }

    applyItemEffect(item) {
        if (!item.effect) {
            console.warn(`Item ${item.name} has no effect defined`);
            return false;
        }

        const effect = item.effect;

        if (effect.type === 'heal-stat') {
            const stat = effect.stat;
            const defaultStat = this.app.data.defaultStats[stat];

            if (effect.amount === 'all') {
                this.app.state.stats[stat] = defaultStat;
                this.app.ui.showGlideAlert(`${item.name} healed your ${stat} back to ${defaultStat}!`, 'success');
            } else {
                this.app.state.stats[stat] = Math.min(this.app.state.stats[stat] + effect.amount, defaultStat);
                this.app.ui.showGlideAlert(`${item.name} healed your ${stat} by ${effect.amount}!`, 'success');
            }
            return true;
        } else if (effect.type === 'boost-stat') {
            const stat = effect.stat;
            this.app.state.stats[stat] += effect.amount;
            this.app.ui.showGlideAlert(`${item.name} increased your ${stat} by ${effect.amount}!`, 'success');
            return true;
        }

        return false;
    }

    useItem(itemId) {
        for (const compartment of Object.keys(this.app.state.inventory)) {
            const index = this.app.state.inventory[compartment].findIndex(item => item.id === itemId);

            if (index !== -1) {
                const item = this.app.state.inventory[compartment][index];
                const itemData = this.getItemData(item.name);

                if (!itemData.consumable) {
                    this.app.ui.showGlideAlert(`${item.name} cannot be used.`, 'warning');
                    return false;
                }

                if (this.applyItemEffect({ ...item, ...itemData })) {
                    this.app.state.inventory[compartment].splice(index, 1);
                    this.app.ui.setInventoryMessage(`${item.name} used and consumed.`);
                    this.app.ui.updateInventoryDisplay();
                    this.app.ui.updateStatsDisplay();
                    this.app.storage.save();
                    return true;
                }

                return false;
            }
        }

        return false;
    }

    addItemsOnLoad(items) {
        if (!items || !Array.isArray(items)) {
            return;
        }

        items.forEach(itemName => {
            this.addToInventory(itemName);
        });
    }
}

class CombatManager {
    constructor(app) {
        this.app = app;
    }

    getDamageType(tags = [], name = '') {
        const lowerName = name.toLowerCase();
        if (tags.includes('ranged') || tags.includes('piercing') || lowerName.includes('bow') || lowerName.includes('arrow')) return 'puncture';
        if (tags.includes('blunt') || lowerName.includes('hammer') || lowerName.includes('mace') || lowerName.includes('fist')) return 'crush';
        return 'slash';
    }

    lookupCombatTable(table, roll) {
        if (!Array.isArray(table) || table.length === 0) return null;
        const entry = table.find(entryItem => roll <= entryItem.max);
        return entry || table[table.length - 1];
    }

    resolveAttackRound({
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
                const type = this.getDamageType(weaponTags, weaponName);
                const table = this.app.data.combatTables.criticals[type] || this.app.data.combatTables.criticals.slash;
                critResult = this.lookupCombatTable(table, critRoll);

                if (critResult) {
                    damage = Math.floor(baseDamage * (critResult.multiplier || 1));
                } else {
                    damage = baseDamage * 2;
                }
            } else {
                damage = baseDamage;
            }
        } else if (isFumble) {
            fumbleRoll = rollRange(1, 100);
            const table = this.app.data.combatTables.fumbles;
            fumbleResult = this.lookupCombatTable(table, fumbleRoll);
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

    getCombatWeaponsFromInventory() {
        return this.app.inventory.getAllInventoryItems()
            .map(item => {
                const catalogData = this.app.inventory.getItemData(item.name);
                const combat = item.combat || catalogData.combat;

                if (!combat) {
                    return null;
                }

                return {
                    ...item,
                    combat,
                    skillLevel: this.app.getSkillLevel(combat.skill)
                };
            })
            .filter(Boolean);
    }

    initializeCombat(containerId, foe, options = {}) {
        const container = document.getElementById(containerId);
        if (!container || !foe) {
            console.error('Combat initialization failed: container or foe missing');
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

        const renderWeapons = () => {
            const weapons = this.getCombatWeaponsFromInventory();
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
        };

        const getSelectedWeapon = () => {
            const chosen = weaponChoice.value;
            const weapons = this.getCombatWeaponsFromInventory();
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
        };

        const updateDisplay = () => {
            if (foeName) {
                foeName.textContent = foe.name;
            }

            this.app.ui.renderCombatStats('foe-stats', foe, 'foe');
            this.app.ui.renderCombatStats('hero-stats', this.app.state.stats, 'hero');
        };

        const endCombat = (message, redirectTo) => {
            combatEnded = true;
            if (attackButton) attackButton.disabled = true;
            if (fleeButton) fleeButton.disabled = true;
            if (combatStatus) combatStatus.textContent = message;

            if (redirectTo) {
                setTimeout(() => {
                    window.location.href = `${redirectTo}.html`;
                }, 1800);
            }
        };

        if (attackButton) {
            attackButton.addEventListener('click', () => {
                if (combatEnded) {
                    return;
                }

                const weapon = getSelectedWeapon();

                const heroAttack = this.resolveAttackRound({
                    attackerSkill: weapon.skillLevel,
                    weaponAttackModifier: weapon.combat.attackModifier,
                    defenderDexterity: foe.dexterity,
                    defenderArmourModifier: foe.armourModifier,
                    damageRange: weapon.combat.damage,
                    weaponTags: weapon.combat.tags,
                    weaponName: weapon.name
                });

                if (heroAttack.isFumble) {
                    const fumbleText = heroAttack.fumbleResult ? heroAttack.fumbleResult.text : 'You stumble!';
                    appendLog(`FUMBLE! (Roll ${heroAttack.fumbleRoll}) ${fumbleText}`);
                    if (heroAttack.fumbleResult && heroAttack.fumbleResult.damage_self > 0) {
                        this.app.modifyStat('endurance', -heroAttack.fumbleResult.damage_self);
                        appendLog(`You take ${heroAttack.fumbleResult.damage_self} damage from your clumsiness.`);
                    }
                } else if (heroAttack.isCritical) {
                    const critText = heroAttack.critResult ? heroAttack.critResult.text : 'A devastating blow!';
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

                const foeAttack = this.resolveAttackRound({
                    attackerSkill: foe.attackSkill,
                    weaponAttackModifier: foe.weaponAttackModifier,
                    defenderDexterity: this.app.state.stats.dexterity,
                    defenderArmourModifier: heroArmourModifier,
                    damageRange: foe.damage,
                    weaponName: foe.name
                });

                if (foeAttack.isFumble) {
                    const fumbleText = foeAttack.fumbleResult ? foeAttack.fumbleResult.text : 'stumbles!';
                    appendLog(`${foe.name} FUMBLES! (Roll ${foeAttack.fumbleRoll}) ${fumbleText}`);
                    if (foeAttack.fumbleResult && foeAttack.fumbleResult.damage_self > 0) {
                        foe.endurance = Math.max(0, foe.endurance - foeAttack.fumbleResult.damage_self);
                        appendLog(`${foe.name} hurts themselves for ${foeAttack.fumbleResult.damage_self} damage.`);
                    }
                } else if (foeAttack.isCritical) {
                    const critText = foeAttack.critResult ? foeAttack.critResult.text : 'A devastating blow!';
                    appendLog(`${foe.name} lands a CRITICAL HIT! (Roll ${foeAttack.critRoll}) ${critText}`);
                    this.app.modifyStat('endurance', -foeAttack.damage);
                    appendLog(`You take ${foeAttack.damage} damage!`);
                } else if (foeAttack.hit) {
                    appendLog(`${foe.name} attacks: ${foeAttack.attackRoll} vs your Defence ${foeAttack.defenceRoll}.`);
                    this.app.modifyStat('endurance', -foeAttack.damage);
                    appendLog(`${foe.name} hits you for ${foeAttack.damage} damage.`);
                } else {
                    appendLog(`${foe.name} attacks: ${foeAttack.attackRoll} vs your Defence ${foeAttack.defenceRoll}.`);
                    appendLog('You evade the attack.');
                }

                updateDisplay();

                if (this.app.state.stats.endurance <= 0) {
                    endCombat('You are reduced to 0 endurance, fall unconscious, and are defeated.', defeatRedirect);
                }
            });
        }

        if (fleeButton) {
            fleeButton.addEventListener('click', () => {
                if (combatEnded) {
                    return;
                }

                appendLog('You flee from combat.');
                endCombat('You have escaped.', fleeRedirect || successRedirect);
            });
        }

        setTimeout(() => {
            renderWeapons();
            updateDisplay();
            appendLog('Combat begins. Choose a weapon and fight round by round or flee.');
        }, 0);
    }
}

class StorageManager {
    constructor(app) {
        this.app = app;
    }

    save() {
        localStorage.setItem('gameState', JSON.stringify(this.app.state));
    }

    migrateLegacyInventory(legacyInventory) {
        if (!Array.isArray(legacyInventory)) {
            return { back: [], belt: [], hands: [], armour: [] };
        }

        const migrated = { back: [], belt: [], hands: [], armour: [] };

        legacyInventory.forEach(itemName => {
            const itemData = this.app.inventory.getItemData(itemName);
            migrated.back.push({ id: generateItemId(), name: itemName, ...itemData });
        });

        return migrated;
    }

    load() {
        const savedState = localStorage.getItem('gameState');

        if (savedState) {
            const loadedState = JSON.parse(savedState);

            if (Array.isArray(loadedState.inventory)) {
                this.app.state.inventory = this.migrateLegacyInventory(loadedState.inventory);
            } else {
                this.app.state.inventory = loadedState.inventory || this.app.state.inventory;
            }

            Object.keys(this.app.data.inventoryCompartments).forEach(compartment => {
                this.app.state.inventory[compartment] = (this.app.state.inventory[compartment] || []).map(item => ({
                    id: item.id || generateItemId(),
                    ...item
                }));
            });

            this.app.state.stats = loadedState.stats || this.app.state.stats;
            this.app.state.skills = loadedState.skills || this.app.state.skills;
        }
    }
}

const gameApp = new GameApp();

document.addEventListener('DOMContentLoaded', () => {
    gameApp.init();
});

window.showGlideAlert = (message, type = 'info') => gameApp.ui.showGlideAlert(message, type);
window.getFoeData = foeIdOrName => gameApp.getFoeData(foeIdOrName);
window.displayAvailableItems = (items, containerId = 'available-items-bar') => gameApp.ui.displayAvailableItems(items, containerId);
window.addItemsOnLoad = items => gameApp.inventory.addItemsOnLoad(items);
window.initializeCombat = (containerId, foe, options = {}) => gameApp.combat.initializeCombat(containerId, foe, options);
window.initializeAvailableItems = () => gameApp.ui.initializeAvailableItems();
