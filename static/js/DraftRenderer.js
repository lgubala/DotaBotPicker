// Draft interface rendering
class DraftRenderer {
    static showDraftInterface() {
        // Create draft interface if it doesn't exist
        if (!document.getElementById('draftInterface')) {
            this.createDraftInterface();
        }
        
        document.getElementById('draftInterface').style.display = 'block';
        this.renderHeroPool();
        this.renderDraftOrder();
    }

    static createDraftInterface() {
        const draftInterface = document.createElement('div');
        draftInterface.id = 'draftInterface';
        draftInterface.innerHTML = `
            <div class="draft-container">
                <div class="draft-header">
                    <div class="current-turn" id="currentTurn">
                        <div class="phase-indicator" id="phaseIndicator">First Ban Phase</div>
                        <div class="turn-info" id="turnInfo">Radiant Captain - Select a hero to ban</div>
                    </div>
                </div>

                <div class="draft-order" id="draftOrder">
                    <div class="order-header">Draft Order</div>
                    <div class="order-steps" id="orderSteps"></div>
                </div>

                <div class="draft-layout">
                    <!-- Radiant Team -->
                    <div class="team-section radiant-section">
                        <div class="team-title radiant-title">Radiant</div>
                        <div class="picks-bans">
                            <div class="bans">
                                <div class="section-label">Bans</div>
                                <div class="hero-slots" id="radiantBans"></div>
                            </div>
                            <div class="picks">
                                <div class="section-label">Picks</div>
                                <div class="hero-slots" id="radiantPicks"></div>
                            </div>
                        </div>
                    </div>

                    <!-- Hero Pool -->
                    <div class="hero-pool-section">
                        <h3 style="text-align: center; margin-top: 0;">Available Heroes</h3>
                        <input type="text" class="search-box" id="draftHeroSearch" placeholder="Search heroes..." style="width: calc(100% - 20px); margin: 0 10px 10px 10px;">
                        <div class="draft-hero-pool" id="draftHeroPool"></div>
                    </div>

                    <!-- Dire Team -->
                    <div class="team-section dire-section">
                        <div class="team-title dire-title">Dire</div>
                        <div class="picks-bans">
                            <div class="bans">
                                <div class="section-label">Bans</div>
                                <div class="hero-slots" id="direBans"></div>
                            </div>
                            <div class="picks">
                                <div class="section-label">Picks</div>
                                <div class="hero-slots" id="direPicks"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="draft-controls">
                    <button class="btn secondary" onclick="captainsMode.resetDraft()">Exit Draft</button>
                    <button class="btn primary" onclick="captainsMode.finalizeDraft()" id="draftFinalizeBtn" disabled>Complete Assignment</button>
                </div>
            </div>
        `;

        // Add CSS styles
        const style = document.createElement('style');
        style.textContent = `
            #draftInterface {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: #1a1a1a;
                z-index: 1000;
                overflow-y: auto;
            }

            .draft-container {
                max-width: 100%;
                width: 100%;
                margin: 0;
                padding: 10px 20px; /* Reduced top/bottom padding */
                color: #c9aa71;
                box-sizing: border-box;
                height: 100vh; /* Use full viewport height */
                display: flex;
                flex-direction: column;
            }
            

            .draft-header {
                text-align: center;
                margin-bottom: 20px;
            }

            .current-turn {
                background: linear-gradient(135deg, rgba(201, 170, 113, 0.3), rgba(201, 170, 113, 0.1));
                border: 3px solid #c9aa71;
                border-radius: 12px;
                padding: 20px;
                margin: 20px 0;
                box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            }

            .phase-indicator {
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 10px;
            }

            .turn-info {
                font-size: 18px;
            }

            .draft-order {
                background: rgba(0,0,0,0.7);
                border: 3px solid #c9aa71;
                border-radius: 12px;
                padding: 25px;
                margin-bottom: 25px;
                width: 100%;
            }
            
            .order-header {
                text-align: center;
                font-weight: bold;
                font-size: 22px;
                margin-bottom: 20px;
                color: #c9aa71;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
            }
            
            .order-steps {
                display: flex;
                flex-wrap: wrap;
                gap: 12px;
                justify-content: center;
                max-width: 100%;
            }
            
            .order-step {
                padding: 12px 16px;
                border-radius: 8px;
                font-size: 16px;
                font-weight: bold;
                min-width: 65px;
                text-align: center;
                border: 3px solid transparent;
                text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
                transition: all 0.3s ease;
            }
            
            .order-step.current {
                background: linear-gradient(135deg, #c9aa71, #d4b876);
                color: #000;
                border-color: #fff;
                font-size: 18px;
                transform: scale(1.15);
                box-shadow: 0 4px 8px rgba(0,0,0,0.4);
            }
            
            .order-step.completed {
                background: linear-gradient(135deg, #4caf50, #45a049);
                color: #fff;
                border-color: #2e7d32;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            }
            
            .order-step.pending {
                background: linear-gradient(135deg, #555, #444);
                color: #bbb;
                border-color: #666;
            }
            
            .order-step.ban {
                border-left: 6px solid #f44336;
            }
            
            .order-step.pick {
                border-left: 6px solid #4caf50;
            }

            .draft-layout {
                display: grid;
                grid-template-columns: 200px 1fr 200px;
                gap: 20px;
                flex: 1; /* Take remaining space */
                min-height: 0; /* Allow shrinking */
            }

            .team-section {
                background: rgba(0,0,0,0.3);
                border-radius: 8px;
                padding: 15px;
            }

            .radiant-section {
                border: 2px solid #4a8f2a;
            }

            .dire-section {
                border: 2px solid #8b2635;
            }

            .team-title {
                text-align: center;
                font-size: 20px;
                font-weight: bold;
                margin-bottom: 15px;
                padding: 8px;
                border-radius: 4px;
            }

            .radiant-title {
                background: rgba(74, 143, 42, 0.3);
                color: #4a8f2a;
            }

            .dire-title {
                background: rgba(139, 38, 53, 0.3);
                color: #8b2635;
            }

            .picks-bans {
                display: flex;
                flex-direction: column;
                gap: 15px;
            }

            .section-label {
                font-weight: bold;
                color: #c9aa71;
                border-bottom: 1px solid #c9aa71;
                padding-bottom: 5px;
                margin-bottom: 8px;
            }

            .hero-slots {
                display: flex;
                flex-direction: column;
                gap: 5px;
            }

            .hero-slot {
                height: 50px;
                border: 2px dashed #666;
                border-radius: 4px;
                display: flex;
                align-items: center;
                padding: 5px;
                background: rgba(0,0,0,0.2);
                position: relative;
            }

            .hero-slot.filled {
                border: 2px solid #c9aa71;
                background: rgba(201, 170, 113, 0.1);
            }

            .hero-slot.banned {
                border: 2px solid #f44336;
                background: rgba(244, 67, 54, 0.1);
            }

            .hero-slot.picked {
                border: 2px solid #4caf50;
                background: rgba(76, 175, 80, 0.1);
            }

            .draft-hero-portrait {
                width: 40px;
                height: 40px;
                background-size: cover;
                background-position: center;
                border-radius: 3px;
                margin-right: 10px;
                flex-shrink: 0;
            }

            .draft-hero-info {
                flex: 1;
                display: flex;
                flex-direction: column;
                justify-content: center;
                overflow: hidden;
            }

            .draft-hero-name {
                font-weight: bold;
                font-size: 14px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .draft-player-type {
                font-size: 12px;
                opacity: 0.8;
            }

            .human-toggle {
                background: #666;
                color: white;
                border: none;
                border-radius: 3px;
                padding: 2px 6px;
                cursor: pointer;
                font-size: 11px;
                position: absolute;
                right: 5px;
                top: 5px;
            }

            .human-toggle.human {
                background: #2196f3;
            }

            .hero-pool-section {
                background: rgba(0,0,0,0.3);
                border: 1px solid #c9aa71;
                border-radius: 8px;
                padding: 5px; /* Reduced padding */
                display: flex;
                flex-direction: column;
                height: 100%; /* Use full available height */
                overflow: hidden; /* Prevent any overflow */
            }

            .draft-hero-pool {
                max-height: 600px;
                overflow-y: auto;
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
                gap: 8px;
                padding: 10px;
            }
            .draft-pool-hero {
                width: 65px;
                height: 65px;
                background-size: cover;
                background-position: center;
                border: 2px solid transparent;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.3s ease;
                position: relative;
            }

            .draft-pool-hero:hover {
                border-color: #c9aa71;
                transform: scale(1.05);
            }

            .draft-pool-hero.disabled {
                opacity: 0.3;
                cursor: not-allowed;
                filter: grayscale(100%);
            }

            .draft-pool-hero.disabled:hover {
                transform: none;
                border-color: transparent;
            }

            .draft-hero-tooltip {
                position: absolute;
                bottom: -25px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0,0,0,0.9);
                color: white;
                padding: 2px 6px;
                border-radius: 3px;
                font-size: 11px;
                white-space: nowrap;
                z-index: 100;
                display: none;
                pointer-events: none;
            }

            .draft-pool-hero:hover .draft-hero-tooltip {
                display: block;
            }

            .draft-controls {
                display: flex;
                gap: 10px;
                justify-content: center;
                margin-top: 20px;
            }

            .count-btn {
                background: #c9aa71;
                color: #000;
                border: none;
                border-radius: 3px;
                padding: 5px 10px;
                cursor: pointer;
                font-weight: bold;
            }

            .count-btn:hover {
                background: #d4b876;
            }

            .count-display {
                background: rgba(0,0,0,0.5);
                border: 1px solid #c9aa71;
                padding: 8px 15px;
                border-radius: 4px;
                min-width: 40px;
                text-align: center;
                font-weight: bold;
                color: #c9aa71;
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(draftInterface);

        // Add search functionality
        document.getElementById('draftHeroSearch').addEventListener('input', () => {
            this.filterHeroPool();
        });
    }

    static hideDraftInterface() {
        const draftInterface = document.getElementById('draftInterface');
        if (draftInterface) {
            draftInterface.style.display = 'none';
        }
    }

    static initializeDraftSlots() {
        this.createSlots('radiantBans', 7);
        this.createSlots('direBans', 7);
        this.createSlots('radiantPicks', 5);
        this.createSlots('direPicks', 5);
    }

    static createSlots(containerId, count) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = '';
        
        for (let i = 0; i < count; i++) {
            const slot = document.createElement('div');
            slot.className = 'hero-slot';
            slot.dataset.index = i;
            container.appendChild(slot);
        }
    }

static renderHeroPool() {
    const container = document.getElementById('draftHeroPool');
    if (!container) return;
    
    // Override the existing CSS completely
    container.innerHTML = '';
    container.style.cssText = `
        flex: 1;
        overflow-y: auto !important; /* Allow scrolling when needed */
        padding: 5px;
        display: block !important;
        height: 100%;
        max-height: none !important; /* Remove height restriction */
    `;
    // Create attribute groups for available heroes
    const attributeGroups = {
        strength: { title: 'Strength', color: '#ff6b6b' },
        agility: { title: 'Agility', color: '#4ecdc4' }, 
        intelligence: { title: 'Intelligence', color: '#45b7d1' },
        universal: { title: 'Universal', color: '#f39c12' }
    };
    
    const availableSection = document.createElement('div');
    availableSection.innerHTML = '<h4 style="color: #4caf50; margin: 5px 0 10px 0; text-align: center; font-size: 16px;">Available Heroes (Can be Bot Players)</h4>';    
    // Create attribute groups
    Object.entries(attributeGroups).forEach(([attribute, config]) => {
        const groupDiv = document.createElement('div');
        groupDiv.style.cssText = `
            margin-bottom: 5px; /* Reduced even more */
            border: 1px solid ${config.color};
            border-radius: 4px;
            background: rgba(${this.hexToRgb(config.color).r}, ${this.hexToRgb(config.color).g}, ${this.hexToRgb(config.color).b}, 0.1);
        `;
            
            const groupHeader = document.createElement('div');
        groupHeader.style.cssText = `
            background: ${config.color};
            color: #000;
            font-weight: bold;
            padding: 4px 8px; /* Reduced padding */
            font-size: 11px; /* Smaller font */
            border-radius: 3px 3px 0 0;
            text-align: center;
        `;
        groupHeader.textContent = config.title;
        
        const groupGrid = document.createElement('div');
        groupGrid.style.cssText = `
            display: grid !important; 
            grid-template-columns: repeat(auto-fill, minmax(65px, 1fr)) !important; /* Updated to match hero size */
            gap: 6px !important;
            padding: 8px !important;
        `;
        
        // Get heroes for this attribute
        const attributeHeroes = this.getHeroesByAttribute(attribute, 'available');
        
        attributeHeroes.forEach(([heroId, hero]) => {
            const heroEl = this.createDraftHeroElement(heroId, hero);
            groupGrid.appendChild(heroEl);
        });
        
        if (attributeHeroes.length > 0) {
            groupDiv.appendChild(groupHeader);
            groupDiv.appendChild(groupGrid);
            availableSection.appendChild(groupDiv);
        }
    });
    
    // Create unimplemented heroes section
    const unimplementedSection = document.createElement('div');
    unimplementedSection.innerHTML = '<h4 style="color: #ff9800; margin: 10px 0 10px 0; text-align: center; font-size: 16px;">Unimplemented Heroes (Human Players Only)</h4>';    const unimplementedGrid = document.createElement('div');
    unimplementedGrid.style.cssText = `
        display: grid !important; 
        grid-template-columns: repeat(auto-fill, minmax(60px, 1fr)) !important; 
        gap: 8px !important; 
        padding: 10px !important; 
        background: rgba(255, 152, 0, 0.1) !important;
        border: 2px dashed #ff9800 !important; 
        border-radius: 8px !important;
    `;
    
    Object.entries(app.heroes).forEach(([heroId, hero]) => {
        if (hero.status === 'unimplemented') {
            const heroEl = this.createDraftHeroElement(heroId, hero, true);
            unimplementedGrid.appendChild(heroEl);
        }
    });
    
    unimplementedSection.appendChild(unimplementedGrid);
    
    container.appendChild(availableSection);
    container.appendChild(unimplementedSection);
}

// Helper function to get heroes by attribute
static getHeroesByAttribute(attribute, status) {
    const attributeHeroIds = window.getHeroesByAttribute(attribute);
    return Object.entries(app.heroes).filter(([heroId, hero]) => 
        hero.status === status && attributeHeroIds.includes(hero.internal_name)
    );
}

// Helper function to create hero elements
// Helper function to create hero elements
static createDraftHeroElement(heroId, hero, isUnimplemented = false) {
    const heroEl = document.createElement('div');
    heroEl.className = 'draft-pool-hero';
    // Only set the background image and border - let CSS handle the rest
    heroEl.style.backgroundImage = `url(${hero.portrait_url})`;
    if (isUnimplemented) {
        heroEl.style.border = '2px solid #ff9800';
    }
    
    heroEl.dataset.heroId = heroId;
    heroEl.dataset.heroName = hero.display_name.toLowerCase();
    
    if (captainsMode.draftState.bannedHeroes.has(heroId) || captainsMode.draftState.pickedHeroes.has(heroId)) {
        heroEl.classList.add('disabled');
    } else {
        heroEl.onclick = () => captainsMode.selectHero(heroId);
    }
    
    const tooltip = document.createElement('div');
    tooltip.className = 'draft-hero-tooltip';
    tooltip.textContent = hero.display_name;
    heroEl.appendChild(tooltip);
    
    return heroEl;
}

// Helper function to convert hex to RGB (same as in heroPoolRenderer.js)
static hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

    static disableHeroPool() {
        const heroes = document.querySelectorAll('.draft-pool-hero');
        heroes.forEach(heroEl => {
            heroEl.classList.add('disabled');
            heroEl.onclick = null;
            heroEl.style.cursor = 'not-allowed';
        });
    }

    static updateHeroPool() {
        const heroes = document.querySelectorAll('.draft-pool-hero');
        heroes.forEach(heroEl => {
            const heroId = heroEl.dataset.heroId;
            
            if (captainsMode.draftState.bannedHeroes.has(heroId) || captainsMode.draftState.pickedHeroes.has(heroId)) {
                heroEl.classList.add('disabled');
                heroEl.onclick = null;
            } else {
                heroEl.classList.remove('disabled');
                heroEl.onclick = () => captainsMode.selectHero(heroId);
            }
        });
    }

    static filterHeroPool() {
        const searchTerm = document.getElementById('draftHeroSearch').value.toLowerCase();
        const heroes = document.querySelectorAll('.draft-pool-hero');
        
        heroes.forEach(heroEl => {
            const heroName = heroEl.dataset.heroName;
            if (heroName.includes(searchTerm)) {
                heroEl.style.display = 'block';
            } else {
                heroEl.style.display = 'none';
            }
        });
    }

    static renderDraftOrder() {
        const container = document.getElementById('orderSteps');
        if (!container) return;
        
        container.innerHTML = '';
        
        captainsMode.draftOrder.forEach((step, index) => {
            const stepEl = document.createElement('div');
            stepEl.className = `order-step ${step.action}`;
            
            // More descriptive text
            const teamInitial = step.team.charAt(0).toUpperCase();
            const actionText = step.action === 'ban' ? 'BAN' : 'PICK';
            stepEl.textContent = `${teamInitial} ${actionText}`;
            
            if (index < captainsMode.draftState.currentStep) {
                stepEl.classList.add('completed');
            } else if (index === captainsMode.draftState.currentStep) {
                stepEl.classList.add('current');
            } else {
                stepEl.classList.add('pending');
            }
            
            container.appendChild(stepEl);
        });
    }

    static updateDraftOrder(currentStep) {
        const steps = document.querySelectorAll('.order-step');
        steps.forEach((stepEl, index) => {
            stepEl.classList.remove('current', 'completed', 'pending');
            
            if (index < currentStep) {
                stepEl.classList.add('completed');
            } else if (index === currentStep) {
                stepEl.classList.add('current');
            } else {
                stepEl.classList.add('pending');
            }
        });
    }

    static updateTurnIndicator(currentStep, phaseName) {
        const actionColor = currentStep.action === 'ban' ? '#ff4444' : '#44ff44';
        const teamColor = currentStep.team === 'radiant' ? '#4a8f2a' : '#8b2635';
        const actionText = currentStep.action.toUpperCase();
        const teamText = currentStep.team.charAt(0).toUpperCase() + currentStep.team.slice(1);
        
        document.getElementById('phaseIndicator').innerHTML = `
            <div style="background: rgba(0,0,0,0.8); padding: 8px 16px; border-radius: 8px; display: inline-block;">
                <span style="color: ${actionColor}; font-size: 28px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,1);">
                    ${actionText}
                </span>
                <span style="color: #ffffff; font-size: 18px; margin: 0 10px; text-shadow: 2px 2px 4px rgba(0,0,0,1);">
                    PHASE
                </span>
            </div>
        `;
        
        document.getElementById('turnInfo').innerHTML = `
            <div style="background: rgba(0,0,0,0.8); padding: 6px 12px; border-radius: 6px; display: inline-block; margin-top: 8px;">
                <span style="color: ${teamColor}; font-size: 20px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,1);">
                    ${teamText}
                </span>
                <span style="color: #ffffff; font-size: 16px; margin: 0 8px; text-shadow: 2px 2px 4px rgba(0,0,0,1);">
                    Captain - Select a hero to
                </span>
                <span style="color: ${actionColor}; font-size: 20px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,1);">
                    ${actionText}
                </span>
            </div>
        `;
    }
    static updateBanSlot(team, index, hero) {
        const container = document.getElementById(team + 'Bans');
        if (!container) return;
        
        const slot = container.children[index];
        if (!slot) return;
        
        this.fillSlot(slot, hero, 'banned');
    }

    static updatePickSlot(team, index, hero) {
        const container = document.getElementById(team + 'Picks');
        if (!container) return;
        
        const slot = container.children[index];
        if (!slot) return;
        
        this.fillSlot(slot, hero, 'picked', index, team);
    }

    static fillSlot(slot, hero, type, pickIndex = null, team = null) {
        slot.classList.add('filled', type);
        
        const portrait = document.createElement('div');
        portrait.className = 'draft-hero-portrait';
        portrait.style.backgroundImage = `url(${hero.portrait_url})`;
        
        const info = document.createElement('div');
        info.className = 'draft-hero-info';
        
        const name = document.createElement('div');
        name.className = 'draft-hero-name';
        name.textContent = hero.display_name;
        
        const playerType = document.createElement('div');
        playerType.className = 'draft-player-type';
        playerType.textContent = 'Bot Player';
        
        info.appendChild(name);
        info.appendChild(playerType);
        
        slot.appendChild(portrait);
        slot.appendChild(info);
        
        // Add human toggle for picks
        if (type === 'picked' && pickIndex !== null && team !== null) {
            const toggle = document.createElement('button');
            toggle.className = 'human-toggle';
            toggle.textContent = 'Bot';
            toggle.onclick = () => captainsMode.togglePlayerType(team, pickIndex);
            slot.appendChild(toggle);
        }
    }

    static showHumanAssignment() {
        const currentTurnEl = document.getElementById('currentTurn');
        currentTurnEl.innerHTML = `
            <div class="phase-indicator">Assign Human Players</div>
            <div class="turn-info">Click the toggle buttons to assign which heroes are played by humans vs bots</div>
        `;
        
        document.getElementById('draftFinalizeBtn').disabled = false;
    }

    static updatePickDisplay(team, index) {
        const container = document.getElementById(team + 'Picks');
        if (!container) return;
        
        const slot = container.children[index];
        if (!slot) return;
        
        const pick = (team === 'radiant' ? captainsMode.draftState.radiantPicks : captainsMode.draftState.direPicks)[index];
        
        const toggle = slot.querySelector('.human-toggle');
        const playerType = slot.querySelector('.draft-player-type');
        
        if (toggle && playerType) {
            if (pick.isHuman) {
                toggle.textContent = 'Human';
                toggle.classList.add('human');
                playerType.textContent = 'Human Player';
            } else {
                toggle.textContent = 'Bot';
                toggle.classList.remove('human');
                playerType.textContent = 'Bot Player';
            }
        }
    }

    static updateAllPickDisplays() {
        for (let i = 0; i < 5; i++) {
            this.updatePickDisplay('radiant', i);
            this.updatePickDisplay('dire', i);
        }
    }

    static showDraftSummary(draftState) {
        const currentTurnEl = document.getElementById('currentTurn');
        
        let summaryHTML = '<div class="phase-indicator">Draft Complete!</div>';
        summaryHTML += '<div style="display: flex; gap: 40px; justify-content: center; margin-top: 20px;">';
        
        // Radiant summary
        summaryHTML += '<div><h4 style="color: #4a8f2a; margin-bottom: 15px;">Radiant Team</h4>';
        draftState.radiantPicks.forEach((pick, i) => {
            const type = pick.isHuman ? 'Human' : 'Bot';
            const color = pick.isHuman ? '#2196f3' : '#666';
            summaryHTML += `<div style="margin: 5px 0; display: flex; align-items: center; gap: 10px;">
                <span style="color: ${color}; font-weight: bold; min-width: 60px;">[${type}]</span> 
                <span>${pick.name}</span>
            </div>`;
        });
        summaryHTML += '</div>';
        
        // Dire summary
        summaryHTML += '<div><h4 style="color: #8b2635; margin-bottom: 15px;">Dire Team</h4>';
        draftState.direPicks.forEach((pick, i) => {
            const type = pick.isHuman ? 'Human' : 'Bot';
            const color = pick.isHuman ? '#2196f3' : '#666';
            summaryHTML += `<div style="margin: 5px 0; display: flex; align-items: center; gap: 10px;">
                <span style="color: ${color}; font-weight: bold; min-width: 60px;">[${type}]</span> 
                <span>${pick.name}</span>
            </div>`;
        });
        summaryHTML += '</div>';
        
        summaryHTML += '</div>';
        summaryHTML += '<div style="text-align: center; margin-top: 20px; color: #4caf50;">Bot configuration has been saved!</div>';
        
        currentTurnEl.innerHTML = summaryHTML;
        
        // Update finalize button to exit
        const finalizeBtn = document.getElementById('draftFinalizeBtn');
        finalizeBtn.textContent = 'Exit Draft';
        finalizeBtn.onclick = () => captainsMode.resetDraft();
    }
}