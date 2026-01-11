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

## 🧟 Necromante (Melhorias de Classe)
Aprimoramentos específicos para a classe Verde Escuro.

- **Vampirismo de Almas**:
    - Ao transformar um inimigo em Zumbi, o Necromante recupera **20% de HP**.
    - Ganha um bônus permanente de **+5 ATK** e **+2 DEF** por zumbi criado.
- **IA de Lacaios (Zumbis)**:
    - Zumbis agora são leais e **seguem o mestre** pelo mapa.
    - Formam um exército coeso em vez de vagarem aleatoriamente.

## 🧠 Inteligência Artificial (IA)
Melhorias na tomada de decisão de NPCs e Chefes.

- **Curandeiro (Verde)**:
    - **Triagem**: Prioriza curar aliados com vida crítica (< 30%) em vez de alvos aleatórios.
    - **Fuga**: Se um inimigo chegar muito perto (< 8 unidades), o curandeiro foge para sobreviver.
- **Chefes (Bosses)**:
    - **Sistema de Ameaça**: Chefes agora focam nos alvos mais fortes (Maior Nível ou o outro Chefe) em 70% das vezes.
    - Isso cria duelos épicos entre os Chefes e os "Campeões" dos NPCs.
    - **Aprendizado de Combate**:
        - NPCs que sobrevivem por muito tempo **aprendem** com a batalha.
        - A cada **10 segundos** vivos, eles ganham **+1 INT** e **+0.5% EVA**.
        - Veteranos de guerra tornam-se naturalmente mais difíceis de matar e mais eficientes.
    - **Blocos de Poder (Power-Ups)**:
        - Pequenos cubos coloridos surgem no campo de batalha.
        - **🟩 Verde**: Recupera 20% de Vida.
        - **🟥 Vermelho**: Aumenta o Ataque (+2 Permanente).
        - **🟦 Azul**: Aumenta a Defesa (+1 Permanente).
        - **🟦 Ciano**: Aumenta a Vida Máxima (+50 Permanente).
        - NPCs e Chefes competem por esses recursos para ficarem mais fortes.

## 🎨 Visual e Interface (UI)
Melhorias na apresentação e interatividade.

- **Inspetor de NPCs**:
    - Ao clicar em qualquer NPC, um painel detalhado aparece mostrando:
        - **Atributos**: ATK, DEF, INT (Novo!) e EVA.
        - **Status**: Vida atual/máxima, Nível e Facção.
    - Permite analisar a força de cada unidade individualmente.
    - **Efeitos Visuais (VFX)**:
    - **Fogo**: Partículas mais densas e com movimento de subida realista.
    - **Raios**: Mais segmentos e "jitter" para parecer eletricidade real.
    - **Inteligência (INT)**: Novo atributo adicionado que diferencia classes mágicas (Magos) de guerreiras.
    - **Log de Batalha**:
        - Novo painel no canto inferior direito.
        - Notifica em tempo real: **Mortes** (Vermelho), **Level Up** (Amarelo) e **Derrota de Chefes** (Roxo).
        - Permite acompanhar o fluxo da guerra sem perder detalhes.
