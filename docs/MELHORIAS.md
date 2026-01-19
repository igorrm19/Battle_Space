# Registro de Melhorias (Performance, Escalabilidade e UX)

Este documento rastreia as melhorias contínuas implementadas no projeto Battle Aquarium.

## 🚀 Performance (Desempenho)
Otimizações para garantir que o jogo rode suavemente (60 FPS) e sem travamentos.

- **Correção de Vazamento de Memória (Memory Leak)**:
    - Implementado `.dispose()` para todas as geometrias e materiais de efeitos visuais (raios, fogo, orbes) em `NPC.js` e `Scene.js`. Isso impede que a memória RAM/VRAM encha infinitamente.
- **Prevenção de Erros Matemáticos (NaN)**:
    - Adicionadas verificações de segurança em `NPC.js` para evitar divisão por zero na física de separação.
    - Adicionadas travas em `Game.js` para impedir que posições inválidas (`NaN`) corrompam o estado global.
- **Otimização de Geometria**:
    - Redução da complexidade de malhas (low poly) para NPCs e Chefes, melhorando o tempo de renderização.

## 📈 Escalabilidade (Código e Estrutura)
Mudanças para facilitar o crescimento do projeto e a adição de novas funcionalidades.

- **Modularização**:
    - Criação de `src/utils/MathUtils.js` para funções matemáticas reutilizáveis.
    - Criação de `src/data/Constants.js` para centralizar configurações (cores, status), evitando "números mágicos" espalhados pelo código.
- **Documentação Técnica**:
    - Criação de `docs/CODIGO.md` explicando a arquitetura e o fluxo de dados.
    - Criação de `docs/LOGICA_JOGO.md` e `docs/GUIA_NPCS.md` para facilitar o entendimento das regras de negócio.
- **Refatoração de Classes**:
    - Limpeza do `NPC.js` e `Game.js` para delegar responsabilidades, tornando os arquivos menores e mais legíveis.

## 👁️ Experiência do Usuário (UX - Espectador)
Melhorias visuais e de usabilidade para quem está assistindo.

- **Modo Espectador Real**:
    - Remoção do corpo físico do jogador e barras de status inúteis.
    - Implementação de **Câmera Livre** (voo com WASD) para total liberdade de visualização.
- **Clareza Visual**:
    - Redução drástica do tamanho dos NPCs e Chefes para evitar poluição visual.
    - Ajuste na velocidade de movimento para tornar as batalhas mais compreensíveis.
- **Feedback Visual**:
    - **Crescimento**: NPCs crescem visualmente ao subir de nível (feedback de progresso).
    - **Cura ao Matar**: Efeito visual verde e recuperação de vida ao eliminar inimigos (feedback de recompensa).
    - **Cores de Facção**: Halos coloridos para identificar facilmente a quem o NPC pertence.

## 🧠 Estabilidade e Suavidade (Zero Jitter)
Implementações para garantir máxima fluidez visual.

- **Câmera Ultra-Suave**: 
    - Implementação de hierarquia de câmera (`cameraGroup`).
    - Separação física entre o tremor de tela (screen shake) e a posição base da câmera.
    - Uso de interpolação amortecida (`Damped Lerp`) para seguir o jogador e alvos.
- **Física Baseada em Delta Time**:
    - Todos os sistemas de movimento agora são independentes da taxa de quadros (FPS). NPCs e câmera movem-se na mesma velocidade em qualquer monitor (60Hz, 144Hz+), eliminando "shuttering" e "jitter".
- **VFX Profissional**:
    - Shaders de distorção e aberração cromática suavizados para evitar artefatos de "linhas de luz" ou "tremores" distractivos.
    - Limpeza sistemática de rastros e efeitos para manter a performance estável.

## 🧠 Inteligência Artificial (IA)
Melhorias na tomada de decisão de NPCs e Chefes.

- **Curandeiro (Verde)**:
    - **Triagem**: Prioriza curar aliados com vida crítica (< 30%) em vez de alvos aleatórios.
    - **Fuga**: Se um inimigo chegar muito perto (< 8 unidades), o curandeiro foge para sobreviver.
- **Chefes (Bosses)**:
    - **Sistema de Ameaça**: Chefes agora focam nos alvos mais fortes (Maior Nível ou o outro Chefe) em 70% das vezes.
- **Aprendizado de Combate**:
    - NPCs veteranos ganham bônus de Inteligência e Evasão quanto mais tempo sobrevivem.

## 🎨 Visual e Interface (UI)
- **Inspetor de NPCs**: Painel detalhado ao clicar em unidades.
- **Log de Batalha**: Notificações em tempo real de mortes, subidas de nível e vitórias de chefes.
