// Team rendering functions with random hero selection
class TeamRenderer {
    // Render team slots
    static renderTeams() {
        this.renderTeam('radiant');
        this.renderTeam('dire');
    }

    static renderTeam(teamName) {
        const slotsContainer = document.getElementById(`${teamName}Slots`);
        slotsContainer.innerHTML = '';

        const teamHeroes = app.currentTeams[teamName] || [];

        // Always show exactly 5 slots
        for (let i = 0; i < 5; i++) {
            const slot = document.createElement('div');
            slot.className = 'hero-slot';
            slot.dataset.team = teamName;
            slot.dataset.slot = i;

            if (i < teamHeroes.length && teamHeroes[i] && app.heroes[teamHeroes[i]]) {
                const hero = app.heroes[teamHeroes[i]];
                slot.classList.add('occupied');
                slot.classList.remove('empty');
                
                // Set background image directly
                slot.style.backgroundImage = `url(${hero.portrait_url})`;
                slot.style.backgroundSize = 'cover';
                slot.style.backgroundPosition = 'center';
                slot.style.backgroundRepeat = 'no-repeat';
                
                slot.dataset.hero = hero.internal_name;
                slot.title = hero.display_name;

                // Add role badges if hero has roles
                if (hero.roles && hero.roles.length > 0) {
                    const rolesContainer = document.createElement('div');
                    rolesContainer.className = 'hero-roles';
                    
                    hero.roles.forEach(role => {
                        const roleBadge = document.createElement('span');
                        roleBadge.className = `role-badge ${role}`;
                        roleBadge.textContent = role.toUpperCase();
                        rolesContainer.appendChild(roleBadge);
                    });
                    
                    slot.appendChild(rolesContainer);
                }

                slot.addEventListener('click', (e) => {
                    e.stopPropagation();
                    ItemModal.show(hero.internal_name);
                });

                const removeBtn = document.createElement('button');
                removeBtn.className = 'slot-remove-btn';
                removeBtn.innerHTML = '×';
                removeBtn.onclick = (e) => {
                    e.stopPropagation();
                    TeamManager.removeHeroFromSlot(teamName, i);
                };
                slot.appendChild(removeBtn);
            } else {
                // Empty slot - add random button
                const randomBtn = document.createElement('button');
                randomBtn.className = 'slot-random-btn';
                randomBtn.innerHTML = '🎲';
                randomBtn.title = 'Random Hero';
                randomBtn.onclick = (e) => {
                    e.stopPropagation();
                    this.selectRandomHero(teamName, i);
                };
                slot.appendChild(randomBtn);
            }

            slot.addEventListener('dragover', DragDropManager.handleDragOver);
            slot.addEventListener('drop', DragDropManager.handleDrop);
            slot.addEventListener('dragleave', DragDropManager.handleDragLeave);

            slotsContainer.appendChild(slot);
        }
    }

    static selectRandomHero(teamName, slotIndex) {
        // Get all available heroes (status = 'available')
        const availableHeroes = Object.entries(app.heroes)
            .filter(([heroId, hero]) => hero.status === 'available')
            .map(([heroId, hero]) => heroId);

        if (availableHeroes.length === 0) {
            NotificationManager.show('No available heroes to select from', 'error');
            return;
        }

        // Get heroes already in teams to avoid duplicates
        const usedHeroes = new Set([
            ...app.currentTeams.radiant,
            ...app.currentTeams.dire
        ].filter(h => h !== null));

        // Filter out already used heroes
        const unusedHeroes = availableHeroes.filter(heroId => !usedHeroes.has(heroId));

        if (unusedHeroes.length === 0) {
            NotificationManager.show('All available heroes are already selected', 'error');
            return;
        }

        // Select random hero
        const randomIndex = Math.floor(Math.random() * unusedHeroes.length);
        const selectedHeroId = unusedHeroes[randomIndex];

        // Add hero to slot
        TeamManager.addHeroToSlot(teamName, slotIndex, selectedHeroId);
        
        // Show notification
        const heroName = app.heroes[selectedHeroId].display_name;
        NotificationManager.show(`${heroName} randomly selected!`);
    }
}

// Make function available globally
window.selectRandomHero = (teamName, slotIndex) => TeamRenderer.selectRandomHero(teamName, slotIndex);