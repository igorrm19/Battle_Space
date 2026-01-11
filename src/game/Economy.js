import { state, updateState } from '../core/State.js';

export function buyItem(name, price, type, value) {
    if (state.gold >= price) {
        const newGold = state.gold - price;
        const newInventory = [...state.inventory, { name, type, value }];
        updateState({ gold: newGold, inventory: newInventory });
        return true;
    }
    return false;
}

export function useInventoryItem(item, index) {
    const newInventory = [...state.inventory];
    if (item.type === 'hp') {
        const newHp = Math.min(state.maxHp, state.hp + item.value);
        newInventory.splice(index, 1);
        updateState({ hp: newHp, inventory: newInventory });
    } else if (item.type === 'weapon') {
        updateState({ equipped: item.name });
    }
}
