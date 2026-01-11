# Documentação Técnica - Battle Aquarium

## Estrutura de Arquivos

### `src/core/`
- **`Game.js`**: O coração do jogo. Gerencia o loop principal (`animate`), inicialização de sistemas, input do jogador e coordena a lógica dos chefes.
- **`State.js`**: Gerenciamento de estado global (Redux-like). Contém dados como HP, posições, lista de NPCs e eventos de atualização.
- **`Audio.js`**: Sistema de áudio procedural usando Web Audio API.

### `src/world/`
- **`Scene.js`**: Gerencia a cena Three.js, câmera, luzes e pós-processamento (Bloom, etc.).
- **`NPC.js`**: Classe que define um NPC individual. Contém lógica de movimento (boids), renderização do modelo 3D e efeitos visuais.
- **`NPCManager.js`**: Gerencia a coleção de NPCs, spawning, respawning e atualizações em lote.
- **`Monster.js`**: Classe do Chefe do Vazio (Void Boss).
- **`Environment.js`**: Gerencia perigos ambientais como Fendas do Vazio e Poços de Ouro.

### `src/game/`
- **`Combat.js`**: Lógica pura de combate. Define funções de ataque, cálculo de dano e habilidades especiais de cada classe.

### `src/ui/`
- **`HUD.js`**: Interface do usuário (SVG sobreposto ao Canvas). Mostra barras de vida, notificações e contadores.

### `src/utils/` & `src/data/`
- **`MathUtils.js`**: Funções matemáticas auxiliares.
- **`Constants.js`**: Configurações globais, cores e status base.

## Fluxo de Dados
1.  **Input**: `Game.js` captura teclado/mouse.
2.  **Update**: `Game.js` chama `update()` de `NPCManager`, `Monster`, etc.
3.  **Combate**: `NPCManager` chama lógica de `Combat.js` para resolver ataques.
4.  **Estado**: Alterações de vida/status são salvas em `State.js`.
5.  **Render**: `Scene.js` desenha a cena baseada no estado atual.
