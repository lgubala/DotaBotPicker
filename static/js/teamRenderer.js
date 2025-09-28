// Team rendering functions
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
        console.log(`Rendering ${teamName} team with ${teamHeroes.length} heroes:`, teamHeroes);

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
                slot.classList.add('empty');
                slot.classList.remove('occupied');
                slot.style.backgroundImage = '';
                slot.innerHTML = '';
            }

            slot.addEventListener('dragover', DragDropManager.handleDragOver);
            slot.addEventListener('drop', DragDropManager.handleDrop);
            slot.addEventListener('dragleave', DragDropManager.handleDragLeave);

            slotsContainer.appendChild(slot);
        }
    }
}