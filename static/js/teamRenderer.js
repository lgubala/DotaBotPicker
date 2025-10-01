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

        // Analyze current team composition
        const currentTeamHeroes = app.currentTeams[teamName].filter(h => h !== null);
        const neededRoles = this.getNeededRoles(currentTeamHeroes);

        let selectedHeroId;
        let rolePrioritized = false;

        // If team already has heroes, try to fill missing roles
        if (currentTeamHeroes.length > 0 && neededRoles.length > 0) {
            // Find heroes that match needed roles
            const roleMatchHeroes = unusedHeroes.filter(heroId => {
                const hero = app.heroes[heroId];
                if (!hero.roles || hero.roles.length === 0) return false;
                
                // Check if hero has any of the needed roles
                return hero.roles.some(role => neededRoles.includes(role));
            });

            if (roleMatchHeroes.length > 0) {
                // Prioritize heroes based on most needed roles
                const prioritizedHeroes = this.prioritizeHeroesByRole(roleMatchHeroes, neededRoles);
                const randomIndex = Math.floor(Math.random() * prioritizedHeroes.length);
                selectedHeroId = prioritizedHeroes[randomIndex];
                rolePrioritized = true;
            }
        }

        // If no role-specific hero found, select any unused hero
        if (!selectedHeroId) {
            const randomIndex = Math.floor(Math.random() * unusedHeroes.length);
            selectedHeroId = unusedHeroes[randomIndex];
        }

        // Add hero to slot
        TeamManager.addHeroToSlot(teamName, slotIndex, selectedHeroId);
        
        // Show notification with role info
        const heroName = app.heroes[selectedHeroId].display_name;
        const heroRoles = app.heroes[selectedHeroId].roles || [];
        
        if (rolePrioritized && heroRoles.length > 0) {
            const roleText = heroRoles.map(r => r.toUpperCase()).join('/');
            NotificationManager.show(`${heroName} (${roleText}) selected to fill missing role!`);
        } else {
            NotificationManager.show(`${heroName} randomly selected!`);
        }
    }

    static getNeededRoles(currentTeamHeroes) {
        // Ideal composition: 1 mid, 1 safe, 1 off, 2 supp
        const idealComposition = {
            mid: 1,
            safe: 1,
            off: 1,
            supp: 2
        };

        // Count current roles in team
        const currentRoles = {
            mid: 0,
            safe: 0,
            off: 0,
            supp: 0
        };

        currentTeamHeroes.forEach(heroId => {
            const hero = app.heroes[heroId];
            if (hero && hero.roles) {
                hero.roles.forEach(role => {
                    if (currentRoles[role] !== undefined) {
                        currentRoles[role]++;
                    }
                });
            }
        });

        // Calculate needed roles
        const completelyMissing = [];
        const belowIdeal = [];
        
        // Separate completely missing roles from below-ideal roles
        for (const [role, idealCount] of Object.entries(idealComposition)) {
            if (currentRoles[role] === 0) {
                completelyMissing.push(role);
            } else if (currentRoles[role] < idealCount) {
                belowIdeal.push(role);
            }
        }

        // Shuffle both arrays to add randomness
        this.shuffleArray(completelyMissing);
        this.shuffleArray(belowIdeal);

        // Combine: completely missing roles first, then below-ideal
        return [...completelyMissing, ...belowIdeal];
    }

    static shuffleArray(array) {
        // Fisher-Yates shuffle algorithm
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    static prioritizeHeroesByRole(heroIds, neededRoles) {
        // Score heroes based on how many needed roles they can fill
        const scoredHeroes = heroIds.map(heroId => {
            const hero = app.heroes[heroId];
            let score = 0;
            
            if (hero.roles) {
                // Higher score for heroes that match multiple needed roles
                hero.roles.forEach(role => {
                    if (neededRoles.includes(role)) {
                        score++;
                        // Extra weight for completely missing roles (first in neededRoles array)
                        if (neededRoles.indexOf(role) === 0) {
                            score += 2;
                        }
                    }
                });
            }
            
            return { heroId, score };
        });

        // Sort by score (highest first)
        scoredHeroes.sort((a, b) => b.score - a.score);

        // Return heroes with top scores (include some randomness by taking top 50%)
        const topScoreThreshold = scoredHeroes[0].score;
        const topHeroes = scoredHeroes
            .filter(h => h.score >= topScoreThreshold * 0.7)
            .map(h => h.heroId);

        return topHeroes.length > 0 ? topHeroes : heroIds;
    }
}

// Make function available globally
window.selectRandomHero = (teamName, slotIndex) => TeamRenderer.selectRandomHero(teamName, slotIndex);