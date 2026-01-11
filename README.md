Lógica do Jogo - Battle Aquarium
Visão Geral
Battle Aquarium é um simulador de batalha autônomo onde NPCs de diferentes classes e facções lutam pela supremacia. O jogador atua como um espectador (uma "câmera fantasma"), observando o caos evoluir.

Mecânicas Principais
1. Loop de Jogo (Game Loop)
O jogo roda em um loop contínuo que atualiza:

Estado (State): Vida, posição e status de todos os NPCs e Chefes.
IA (Inteligência Artificial): Decisões de movimento e combate.
Física: Movimento, colisão e separação.
Renderização: Gráficos 3D e efeitos visuais.
2. Combate
Ataque Automático: NPCs atacam inimigos próximos automaticamente.
Dano: Baseado no ATK do atacante e DEF do defensor. Críticos causam 2x dano.
Cura ao Matar: Quem dá o golpe final recupera 30% da vida máxima. Isso incentiva a sobrevivência dos mais fortes.
3. Evolução (Level Up)
XP: NPCs ganham experiência ao causar dano e ao matar inimigos.
Nível: Ao acumular XP suficiente, o NPC sobe de nível.
Crescimento:
Status: HP, ATK e DEF aumentam.
Tamanho: O NPC cresce visualmente (5% maior por nível, até 3x o tamanho original).
4. Chefes (Bosses)
Existem duas entidades supremas no mapa:

Entidade do Vazio (Roxo): Fica no centro ou vaga pelo mapa. Extremamente forte.
Deusa do Ouro (Dourado): Uma fonte de poder que também se defende.
5. Modo Espectador
O jogador não tem corpo físico.
Controles: WASD para mover a câmera, Shift para acelerar.
O objetivo é apenas assistir e relaxar vendo as batalhas.
