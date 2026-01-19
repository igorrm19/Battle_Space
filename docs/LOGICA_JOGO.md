# Lógica de Jogo - Battle Aquarium

Este documento detalha o funcionamento interno do jogo e suas mecânicas.

### 1. Movimentação (Boids Simplificado)
Os NPCs usam uma lógica baseada em comportamentos de grupo:
- **Separação**: Evitam colidir uns com os outros.
- **Busca**: Movem-se em direção ao seu alvo (Monstro ou Boss).
- **Fuga**: Alguns NPCs (como Curandeiros) fogem se o perigo estiver muito próximo.
- **Independência de FPS**: Toda física é calculada usando `delta time`, garantindo movimento suave em qualquer computador.

### 2. Atributos dos NPCs
- **ATK (Ataque)**: Dano causado por golpe.
- **DEF (Defesa)**: Redução de dano recebido.
- **INT (Inteligência)**: Aumenta a eficácia de habilidades especiais (Cura, Void, Raio).
- **EVA (Evasão)**: Chance de desviar totalmente de um ataque.

### 3. Sistema de Nível e Facções
- Matar inimigos concede XP. 
- Ao subir de nível, todos os atributos aumentam e o NPC cresce visualmente.
- Existem facções identificadas por cores (Halos). NPCs da mesma facção não se atacam.

### 4. Ciclo de Combate
- O jogo é um "Battle Simulator". NPCs lutam entre si e contra dois Chefes Globais.
- Os Chefes possuem inteligência superior e focam nos alvos mais perigosos.

### 5. Modo Espectador
- O jogador não tem corpo físico.
- Controles: **WASD** para mover a câmera, **Shift** para acelerar.
- **Sistema de Câmera Suave**: Utiliza hierarquia de objetos e interpolação amortecida para garantir estabilidade total e zero jitter.

### 6. Efeitos Visuais e Suavidade
- **Zero Jitter**: O sistema garante que os efeitos visuais (rastros, raios) acompanhem o movimento sem "tremer".
- **Modo de Redução de Tremor**: Configuração global em `Constants.js` que suaviza flashes e movimentos bruscos para uma experiência mais confortável.
