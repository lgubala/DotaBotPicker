// Captain's Mode draft management
class CaptainsModeManager {
    constructor() {
        this.draftState = {
            radiantHumans: 2,
            direHumans: 1,
            currentStep: 0,
            currentTeam: 'radiant',
            currentAction: 'ban',
            radiantBans: [],
            direBans: [],
            radiantPicks: [],
            direPicks: [],
            bannedHeroes: new Set(),
            pickedHeroes: new Set(),
            isActive: false
        };

        // Captain's Mode draft order (official tournament format) https://www.dota2.com/patches/7.34
        this.draftOrder = [
            {team: 'radiant', action: 'ban'},
            {team: 'dire', action: 'ban'},     
            {team: 'dire', action: 'ban'},  
            {team: 'radiant', action: 'ban'}, 
            {team: 'dire', action: 'ban'},     
            {team: 'dire', action: 'ban'},
            {team: 'radiant', action: 'ban'},
            
            {team: 'radiant', action: 'pick'},
            {team: 'dire', action: 'pick'},
            {team: 'radiant', action: 'ban'},
            {team: 'radiant', action: 'ban'},
            {team: 'dire', action: 'ban'},
            
            {team: 'dire', action: 'pick'},
            {team: 'radiant', action: 'pick'},
            {team: 'radiant', action: 'pick'},
            {team: 'dire', action: 'pick'},
            {team: 'dire', action: 'pick'},
            {team: 'radiant', action: 'pick'},
            {team: 'radiant', action: 'ban'},
            {team: 'dire', action: 'ban'},
            {team: 'dire', action: 'ban'},
            {team: 'radiant', action: 'ban'},
            
            {team: 'radiant', action: 'pick'},
            {team: 'dire', action: 'pick'}

        ];
    }

    // Initialize Captain's Mode interface
    showSetupModal() {
        this.startDraft();
    }

    createSetupModal() {
        const modal = document.createElement('div');
        modal.className = 'preset-modal';
        modal.id = 'captainsModeModal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <h3>Captain's Mode Setup</h3>
                
                <div style="display: flex; gap: 40px; justify-content: center; margin: 30px 0;">
                    <div style="text-align: center;">
                        <h4 style="color: #4a8f2a; margin-bottom: 15px;">Radiant Team</h4>
                        <div style="margin-bottom: 10px;">Human Players:</div>
                        <div style="display: flex; align-items: center; gap: 10px; justify-content: center;">
                            <button class="count-btn" onclick="captainsMode.changePlayerCount('radiant', -1)">-</button>
                            <div class="count-display" id="radiantHumans">2</div>
                            <button class="count-btn" onclick="captainsMode.changePlayerCount('radiant', 1)">+</button>
                        </div>
                        <div style="font-size: 12px; opacity: 0.8; margin-top: 5px;">
                            <span id="radiantBots">5</span> Bot Players
                        </div>
                    </div>
                    
                    <div style="text-align: center; align-self: center; font-size: 24px; font-weight: bold;">VS</div>
                    
                    <div style="text-align: center;">
                        <h4 style="color: #8b2635; margin-bottom: 15px;">Dire Team</h4>
                        <div style="margin-bottom: 10px;">Human Players:</div>
                        <div style="display: flex; align-items: center; gap: 10px; justify-content: center;">
                            <button class="count-btn" onclick="captainsMode.changePlayerCount('dire', -1)">-</button>
                            <div class="count-display" id="direHumans">1</div>
                            <button class="count-btn" onclick="captainsMode.changePlayerCount('dire', 1)">+</button>
                        </div>
                        <div style="font-size: 12px; opacity: 0.8; margin-top: 5px;">
                            <span id="direBots">5</span> Bot Players
                        </div>
                    </div>
                </div>
                
                <div class="modal-buttons">
                    <button class="modal-btn secondary" onclick="captainsMode.closeSetupModal()">Cancel</button>
                    <button class="modal-btn primary" onclick="captainsMode.startDraft()">Start Draft</button>
                </div>
            </div>
        `;
        return modal;
    }

    changePlayerCount(team, delta) {
        const currentCount = this.draftState[team + 'Humans'];
        const newCount = Math.max(0, Math.min(5, currentCount + delta));
        
        this.draftState[team + 'Humans'] = newCount;
        document.getElementById(team + 'Humans').textContent = newCount;
        document.getElementById(team + 'Bots').textContent = 5 - newCount;
    }

    closeSetupModal() {
        const modal = document.getElementById('captainsModeModal');
        if (modal) {
            modal.remove();
        }
    }

    startDraft() {
        this.draftState.isActive = true;
        
        // Hide regular interface and show draft interface
        document.querySelector('.main-content').style.display = 'none';
        document.querySelector('.floating-actions').style.display = 'none';
        
        DraftRenderer.showDraftInterface();
        DraftRenderer.initializeDraftSlots();
        this.updateCurrentTurn();
    }

    selectHero(heroId) {
        if (!this.draftState.isActive) return;
        if (this.draftState.bannedHeroes.has(heroId) || this.draftState.pickedHeroes.has(heroId)) {
            return;
        }
        
        const currentStep = this.draftOrder[this.draftState.currentStep];
        const hero = app.heroes[heroId];
        
        if (!hero) return;
        
        if (currentStep.action === 'ban') {
            this.addBan(heroId, hero, currentStep.team);
        } else if (currentStep.action === 'pick') {
            this.addPick(heroId, hero, currentStep.team);
        }
        
        this.draftState.currentStep++;
        this.updateCurrentTurn();
        DraftRenderer.updateHeroPool();
        
        // Check if draft is complete
        if (this.draftState.currentStep >= this.draftOrder.length) {
            this.completeDraft();
        }
    }

    addBan(heroId, hero, team) {
        this.draftState.bannedHeroes.add(heroId);
        const banArray = team === 'radiant' ? this.draftState.radiantBans : this.draftState.direBans;
        banArray.push({heroId, name: hero.display_name, portrait: hero.portrait_url});
        
        DraftRenderer.updateBanSlot(team, banArray.length - 1, hero);
    }

    addPick(heroId, hero, team) {
        this.draftState.pickedHeroes.add(heroId);
        const pickArray = team === 'radiant' ? this.draftState.radiantPicks : this.draftState.direPicks;
        pickArray.push({heroId, name: hero.display_name, portrait: hero.portrait_url, isHuman: false});
        
        DraftRenderer.updatePickSlot(team, pickArray.length - 1, hero);
    }

    updateCurrentTurn() {
        if (this.draftState.currentStep >= this.draftOrder.length) {
            this.completeDraft();
            return;
        }
        
        const currentStep = this.draftOrder[this.draftState.currentStep];
        this.draftState.currentTeam = currentStep.team;
        this.draftState.currentAction = currentStep.action;
        
        // Better phase detection based on step ranges
        let phaseName = '';
        if (this.draftState.currentStep < 2) {
            phaseName = 'First Pick Phase';
        } else if (this.draftState.currentStep < 9) {
            phaseName = 'First Ban Phase';
        } else if (this.draftState.currentStep < 11) {
            phaseName = 'Second Pick Phase';
        } else if (this.draftState.currentStep < 14) {
            phaseName = 'Second Ban Phase';
        } else if (this.draftState.currentStep < 20) {
            phaseName = 'Third Pick Phase';
        } else if (this.draftState.currentStep < 24) {
            phaseName = 'Third Ban Phase';
        } else {
            phaseName = 'Final Pick Phase';
        }
        
        DraftRenderer.updateTurnIndicator(currentStep, phaseName);
        DraftRenderer.updateDraftOrder(this.draftState.currentStep);
    }

    completeDraft() {
        const currentTurnEl = document.getElementById('currentTurn');
        currentTurnEl.innerHTML = `
            <div class="phase-indicator" style="color: #4caf50; font-size: 32px; font-weight: bold;">
                DRAFT COMPLETE
            </div>
            <div class="turn-info" style="color: #c9aa71; font-size: 20px;">
                Click the toggle buttons to assign which heroes are played by humans vs bots
            </div>
        `;
        
        // Disable all hero clicking
        DraftRenderer.disableHeroPool();
        
        document.getElementById('draftFinalizeBtn').disabled = false;
        this.autoAssignPlayers();
    }

    autoAssignPlayers() {
        // Set all picks as bots by default
        for (let i = 0; i < this.draftState.radiantPicks.length; i++) {
            this.draftState.radiantPicks[i].isHuman = false;
        }
        
        for (let i = 0; i < this.draftState.direPicks.length; i++) {
            this.draftState.direPicks[i].isHuman = false;
        }
        
        DraftRenderer.updateAllPickDisplays();
    }

    togglePlayerType(team, pickIndex) {
        const pickArray = team === 'radiant' ? this.draftState.radiantPicks : this.draftState.direPicks;
        pickArray[pickIndex].isHuman = !pickArray[pickIndex].isHuman;
        
        DraftRenderer.updatePickDisplay(team, pickIndex);
    }

    async finalizeDraft() {
        // Collect only bot heroes for saving
        const botHeroes = {
            radiant: this.draftState.radiantPicks.filter(pick => !pick.isHuman).map(pick => pick.heroId),
            dire: this.draftState.direPicks.filter(pick => !pick.isHuman).map(pick => pick.heroId)
        };
        
        console.log('Saving bot heroes:', botHeroes);
        
        try {
            const response = await fetch('/api/teams', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(botHeroes)
            });
            
            const result = await response.json();
            if (result.success) {
                // Update app state with the bot heroes
                app.currentTeams = botHeroes;
                
                NotificationManager.show('Captain\'s Mode draft completed! Bot configuration saved.');
                
                // Return to main screen
                this.resetDraft();
            } else {
                NotificationManager.show(result.error || 'Failed to save draft configuration', 'error');
            }
        } catch (error) {
            console.error('Error saving draft:', error);
            NotificationManager.show('Failed to save draft configuration', 'error');
        }
    }

    resetDraft() {
        this.draftState = {
            radiantHumans: 2,
            direHumans: 1,
            currentStep: 0,
            currentTeam: 'radiant',
            currentAction: 'ban',
            radiantBans: [],
            direBans: [],
            radiantPicks: [],
            direPicks: [],
            bannedHeroes: new Set(),
            pickedHeroes: new Set(),
            isActive: false
        };
        
        // Show regular interface
        document.querySelector('.main-content').style.display = 'block';
        document.querySelector('.floating-actions').style.display = 'block';
        
        // Hide draft interface
        DraftRenderer.hideDraftInterface();
        
        // Clear any residual styles and force re-render
        setTimeout(() => {
            const slots = document.querySelectorAll('.hero-slot');
            slots.forEach(slot => {
                slot.style.cssText = ''; // Clear all inline styles
            });
            
            TeamRenderer.renderTeams();
            HeroPoolRenderer.renderHeroPools();
        }, 150);
    }
}

// Create global instance
const captainsMode = new CaptainsModeManager();

// Global functions for HTML onclick handlers
window.startCaptainsMode = () => captainsMode.showSetupModal();