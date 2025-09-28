// Team management functions
class TeamManager {
    static addHeroToSlot(teamName, slotIndex, heroId) {
        // Remove hero from other slots if it exists
        this.removeHeroFromAllSlots(heroId);

        // Ensure the array is large enough
        while (app.currentTeams[teamName].length <= slotIndex) {
            app.currentTeams[teamName].push(null);
        }

        app.currentTeams[teamName][slotIndex] = heroId;
        TeamRenderer.renderTeams();
    }

    static removeHeroFromSlot(teamName, slotIndex) {
        if (app.currentTeams[teamName][slotIndex]) {
            app.currentTeams[teamName][slotIndex] = null;
            TeamRenderer.renderTeams();
        }
    }

    static removeHeroFromAllSlots(heroId) {
        ['radiant', 'dire'].forEach(teamName => {
            for (let i = 0; i < app.currentTeams[teamName].length; i++) {
                if (app.currentTeams[teamName][i] === heroId) {
                    app.currentTeams[teamName][i] = null;
                }
            }
        });
    }
}

// Make functions available globally for HTML onclick handlers
window.removeHeroFromSlot = (teamName, slotIndex) => TeamManager.removeHeroFromSlot(teamName, slotIndex);