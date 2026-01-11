# Battle Aquarium

## Visão Geral

Battle Aquarium é um simulador de batalha autônomo onde NPCs de diferentes classes e facções lutam pela supremacia.

O jogador atua como um espectador, funcionando como uma câmera fantasma, apenas observando o caos evoluir.


## Conceito

* Simulação contínua e autônoma
* Progressão emergente baseada em sobrevivência
* O jogador não interfere diretamente no mundo
* Experiência focada em observação e análise

## Lógica do Jogo

O jogo opera em um loop contínuo responsável por manter o mundo vivo e em constante evolução.



<img src="./public/img/Screenshot from 2026-01-11 13-50-19.png" alt="Screencast from 2026-01-11 01-21-50">



### Game Loop

* Atualização de estado: vida, posição e status de todos os NPCs e chefes
* Processamento da IA: movimentação, escolha de alvos e decisões de combate
* Simulação de física: movimento, colisões e separação entre entidades
* Renderização: gráficos 3D e efeitos visuais em tempo real

## Combate

* NPCs atacam inimigos próximos automaticamente
* O dano é calculado com base no ATK do atacante e na DEF do defensor
* Ataques críticos causam dano dobrado
* A entidade que realiza o golpe final recupera 30% da vida máxima

Essa mecânica favorece a sobrevivência e a consolidação das entidades mais fortes.

## Evolução

* NPCs ganham experiência ao causar dano e ao eliminar inimigos
* Ao acumular XP suficiente, a entidade sobe de nível
* Cada nível aumenta os atributos:

  * HP
  * ATK
  * DEF
* O tamanho visual do NPC aumenta 5% por nível
* O crescimento visual é limitado a até 3x o tamanho original

## Chefes

O mapa contém duas entidades supremas que alteram o equilíbrio da simulação.

### Entidade do Vazio

* Aparência roxa
* Normalmente localizada no centro ou vagando pelo mapa
* Extremamente poderosa

### Deusa do Ouro

* Aparência dourada
* Fonte de poder do mapa
* Capaz de se defender de ataques

## Modo Espectador

O jogador não possui corpo físico dentro do mundo.

### Controles

* WASD para mover a câmera
* Shift para acelerar o movimento

### Objetivo

* Observar a simulação
* Acompanhar batalhas emergentes
* Assistir à evolução natural das entidades

## Proposta

Battle Aquarium não possui condição de vitória.

O foco está na observação de sistemas autônomos interagindo, criando hierarquias, conflitos e sobreviventes ao longo do tempo.


<img src="./public/img/Screenshot from 2026-01-11 13-52-27.png" alt="Screencast from 2026-01-11 01-21-50">

