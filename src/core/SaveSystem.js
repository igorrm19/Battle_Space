import { state, updateState } from './State.js';

export function saveGame() {
    localStorage.setItem('shadowRealmSave', JSON.stringify(state));
    window.dispatchEvent(new CustomEvent('gameSaved'));
}

export function loadGame() {
    const saved = localStorage.getItem('shadowRealmSave');
    if (saved) {
        updateState(JSON.parse(saved));
    }
}
