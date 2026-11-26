# WerZatSong

O WerZatSong é uma ferramenta que ajuda a descobrir o nome de músicas a partir de arquivos de áudio. Ele tem vários modos de busca para encontrar correspondências: **Audfprint, Audiotag, MusicBrainz (AcoustID) e Shazam.** Dá para usar um modo só ou combinar vários. Se mais de um for escolhido, eles são executados nesta ordem de prioridade:

1. **MusicBrainz** (AcoustID)

2. **Audiotag**

3. **Shazam**

4. **Audfprint**

Este documento é um guia simples, passo a passo, para instalar, configurar e usar o WerZatSong.

> **For English speakers:** the original English version of this document is [**README.md.**](../README.md)

> **Per chi parla italiano:** una traduzione completa di questo documento è disponibile in [**README_ITA.md.**](README_ITA.md)

> **Pour les francophones:** une traduction intégrale de ce document est disponible dans [**README_FRA.md.**](README_FRA.md)

## Requisitos e instalação

Antes de começar, estes programas precisam estar instalados:

### Requisitos do sistema

- [**Node.js**](https://nodejs.org) (v20.0 ou superior) → Adicionar ao PATH e conferir no terminal com `node -v` e `npm -v`.

- [**Python**](https://www.python.org/downloads) (v3.13 ou superior) → Adicionar ao PATH e conferir no terminal com `python --version` e `pip --version`. No macOS e no Linux eles costumam se chamar `python3` e `pip3`: usar esses nos comandos abaixo (o WerZatSong encontra o `python3` sozinho).

- [**FFmpeg**](https://www.gyan.dev/ffmpeg/builds) → Adicionar ao PATH e conferir no terminal com `ffmpeg -version`.

  ![Programas](../images/programs.png)

### Requisitos do programa

Para usar bem o WerZatSong, também são necessários:

- **URL de webhook do Discord** → Para receber as notificações de correspondências (ver *"Como obter uma URL de webhook do Discord"* abaixo).

- **Chave da API do Audiotag** → Necessária para o modo de busca Audiotag (ver *"Como obter uma chave da API do Audiotag"* abaixo).

- **Chave da API do AcoustID** → Necessária para o modo de busca MusicBrainz (ver *"Como obter uma chave da API do AcoustID"* abaixo).

- **Banco de dados para o Audfprint** → Necessário para o modo de busca Audfprint (ver *"Baixar o banco de dados do Audfprint"* abaixo).

  - **Atenção ao espaço** → O banco de dados ocupa bastante espaço em disco. É recomendável usar um **SSD** para ter um desempenho melhor.

O WerZatSong só pede a chave de API de um modo quando esse modo está no comando, e dá para ficar sem o webhook e sem as duas chaves (ver *"Rodando sem webhook ou sem uma chave de API"* abaixo).

#### Como obter uma URL de webhook do Discord

1. Abrir o Discord e criar um servidor (se ainda não houver um).

2. No canal de texto **#geral,** clicar no ícone de engrenagem (**Editar canal**).

3. Ir em **Integrações** → **Webhooks.**

4. Clicar em **Criar webhook,** depois abri-lo e selecionar **Copiar URL do webhook.**

5. Guardar a URL por enquanto, ela vai ser necessária daqui a pouco.

#### Como obter uma chave da API do Audiotag

1. Acessar o site do [Audiotag.](https://audiotag.info)

2. Criar uma conta nova, ou entrar em uma conta existente.

3. Ir até a [**User Section**](https://user.audiotag.info) e clicar na aba **API keys.**

4. Clicar no botão **Create new API key,** copiar a chave e guardá-la por enquanto.

#### Como obter uma chave da API do AcoustID

1. Acessar o site do [AcoustID.](https://acoustid.org)

2. Criar uma conta nova, ou entrar em uma conta existente.

3. Em [**My Applications,**](https://acoustid.org/my-applications) clicar no botão **Register a new application.**

4. Preencher os campos com informações básicas (podem ser inventadas) e clicar em **Register.**

5. Copiar a **API key** do aplicativo que aparecer e guardá-la por enquanto.

#### Baixar o banco de dados do Audfprint

- Baixar as **pastas do banco de dados** com os **arquivos PKLZ** criados pela comunidade [**aqui.**](https://wzs.cosine.club)

### Instalação do programa

1. **Baixar o WerZatSong:**

   - Ir até o repositório, clicar em **<> Code** → **Download ZIP.**

   - Extrair o arquivo em qualquer pasta.

   - Agora deve haver uma pasta chamada `WerZatSong-main`.

2. **Entrar na pasta:**

   - Ir até a pasta extraída usando o comando `cd` no terminal:

     ```bash
     cd WerZatSong-main
     ```

3. **Executar este comando para instalar as dependências do Node.js:**

    ```bash
    npm install
    ```

4. **Executar estes comandos um de cada vez para instalar as dependências do Python:**

    ```bash
    pip install -r requirements.txt
    pip install audioop-lts
    pip install shazamio
    ```

    - **Nota:** se aparecer um erro durante a instalação dessas dependências, pode ser que esteja faltando alguma outra coisa. Aqui estão dois problemas comuns e como resolvê-los:

        - **Erro do Rust** (ver a captura de tela abaixo):

            - Instalar o Rust pelo [site oficial.](https://www.rust-lang.org/tools/install)

            - Depois da instalação, conferir se ele funciona executando `rustc --version` no terminal.

            - Com o Rust instalado, tentar de novo os comandos `pip install` acima.

            ![Erro do Rust](../images/rust-error.png)

        - **Erro das C++ Build Tools** (ver a captura de tela abaixo):

            - Instalar as Build Tools para Visual Studio 2017 ou mais recente pelo [site oficial.](https://visualstudio.microsoft.com/thank-you-downloading-visual-studio/?sku=BuildTools&rel=16)

            - Durante a instalação, selecionar a carga de trabalho *"Desenvolvimento para desktop com C++"* (as ferramentas de C++).

            - Depois da instalação, reiniciar o computador.

            - Tentar de novo os comandos `pip install` acima.

            ![Erro do Shazam](../images/shazam-error.png)

Pronto! Agora o WerZatSong está pronto para ser configurado.

## Configuração inicial

### Configurar o WerZatSong pela primeira vez

No terminal, executar o seguinte comando:
```bash
node werzatsong.js --audiotag --musicbrainz
```

Na **primeira execução,** este comando:

- Cria automaticamente todas as pastas necessárias.

- Pede a **URL do webhook do Discord, a chave da API do Audiotag e a chave da API do AcoustID.**

- Fecha sozinho com uma mensagem de erro quando a configuração termina.

  ![Configuração](../images/setup.png)

Se algo colado não estiver certo, o WerZatSong avisa e pede de novo, então um erro de digitação não obriga a refazer a configuração. Ele também diz qual opção permite ficar sem isso, para o que for melhor configurar depois. A URL do webhook só é salva depois que o WerZatSong publica uma mensagem de boas-vindas com ela, e a chave do Audiotag só depois que o Audiotag a aceita.

### Configurar o banco de dados do Audfprint

Depois da primeira execução, colocar as pastas baixadas com os arquivos PKLZ dentro da pasta `database` que foi criada. Este passo é necessário para o modo de busca Audfprint. Para guardá-las em outro lugar, como outro disco, escrever essa pasta como `DATABASE_FOLDER` em `utils/consts.js` (por exemplo `'D:/pklz'`, `'/Volumes/Disco/pklz'` ou `'~/pklz'`):

  ![Banco de dados](../images/database.png)

## Como usar o WerZatSong

1. **Preparar os arquivos MP3**

    - Colocar os arquivos MP3 a identificar na pasta `input` (criada automaticamente depois da configuração).

    - Há um limite de **30 arquivos MP3 por execução,** então é melhor não colocar mais do que isso.

    - Evitar arquivos MP3 curtos demais (menos de 5 segundos), porque eles podem não ser processados direito.

    - Evitar nomes de arquivos com caracteres unicode raros ou especiais, para prevenir possíveis erros.

2. **Executar o WerZatSong**

    - Usar este comando no terminal com o modo ou os modos escolhidos. Por exemplo, para usar todos:

        ```bash
        node werzatsong.js --audfprint --audiotag --musicbrainz --shazam
        ```

### Opções gerais

- **`--audfprint`** → Ativa o modo de busca Audfprint.

- **`--audiotag`** → Ativa o modo de busca Audiotag.

- **`--musicbrainz`** → Ativa o modo de busca MusicBrainz (AcoustID).

- **`--shazam`** → Ativa o modo de busca Shazam.

- **`--trim <segundos>`** → Encurta os arquivos MP3 para a duração indicada (por exemplo, `--trim 60` para 60 segundos). Isso deve deixar tudo mais rápido ao identificar arquivos longos [**padrão:** sem corte].

- **`--language <idioma>`** → O idioma de tudo o que o WerZatSong mostra e escreve (ver *"Idiomas"* abaixo) [**padrão:** inglês].

- **`--no-discord`** → Não publica nada no Discord nesta execução, mesmo que o arquivo `.env` tenha um webhook, e não pede um. Os resultados continuam sendo salvos em `logs` como sempre.

  Para manter só algumas mensagens, adicionar `keep-match` (só as mensagens de correspondência encontrada) ou `keep-nomatch` (só as de nenhuma correspondência encontrada): aí o webhook é necessário, e o aviso sobre os arquivos do banco de dados que não puderam ser pesquisados continua sendo enviado. Escrever `--no-discord all` é o mesmo que escrever `--no-discord` sozinho.

- **`--no-prompt`** → Nunca para para pedir nada ao usuário. Pensado principalmente para execuções que ninguém está acompanhando, como scripts ou execuções agendadas (ver *"Rodando sem webhook ou sem uma chave de API"* abaixo).

### Rodando sem webhook ou sem uma chave de API

O WerZatSong pede o webhook do Discord em toda execução que não tem um, a não ser com `--no-discord` (sozinho ou com `all`), e uma chave de API só quando o modo dela está no comando: uma busca só com `--audfprint` ou `--shazam` nunca pede a chave do Audiotag ou do AcoustID. Para buscar sem uma chave, basta tirar o modo dela do comando.

`--no-prompt` serve para execuções em que ninguém pode responder. O WerZatSong usa o que o arquivo `.env` tem e não pede nada:

- **Sem webhook do Discord** → nada é publicado no Discord, e o WerZatSong avisa quando começa. Os resultados continuam sendo salvos em `logs`.

- **Sem chave da API do Audiotag ou do AcoustID** → esse modo não roda e o WerZatSong avisa, enquanto os outros modos funcionam normalmente. Se não sobrar nenhum dos modos escolhidos, ele para.

Por exemplo, com um arquivo `.env` vazio, este comando roda o Audfprint e o Shazam, pula o MusicBrainz e o Audiotag e não publica nada no Discord:

```bash
node werzatsong.js --audfprint --musicbrainz --audiotag --shazam --no-prompt
```

Para adicionar o webhook ou uma chave depois, rodar o WerZatSong uma vez sem essas opções e colar quando ele pedir, ou escrever direto no arquivo `.env` (`WEBHOOK_URL`, `AUDIOTAG_KEY`, `ACOUSTID_KEY`).

### Idiomas

O WerZatSong suporta atualmente o português (brasileiro), o inglês, o italiano e o francês. Adicionar `--language` com um destes:

- `Português` ou `Portuguese`

- `English`

- `Italiano` ou `Italian`

- `Français` ou `French`

Letras maiúsculas e acentos não fazem diferença, então `--language portugues` também funciona. Por exemplo:

```bash
node werzatsong.js --audfprint --language Português
```

As mensagens no terminal, o `--help`, as perguntas da configuração, os arquivos de resultados e as mensagens no Discord ficam todos nesse idioma. Se for pedido um idioma que o WerZatSong não tem, ele avisa em inglês e continua em inglês.

Para traduzir o WerZatSong para outro idioma, ou para melhorar uma tradução, ler o [**TRANSLATION_GUIDE.md**](../TRANSLATION_GUIDE.md) (em inglês). Um novo arquivo de tradução funciona assim que é colocado na pasta `localizations`.

## Modos de busca explicados

### 1. Audfprint

Encontra correspondências comparando os arquivos MP3 com um banco de dados local de impressões digitais (arquivos PKLZ):

```bash
node werzatsong.js --audfprint
```

#### Opções adicionais do Audfprint

- **`--folder <subpasta>`** → Escolhe uma subpasta específica dentro da pasta `database`. Útil para buscar só entre as impressões digitais de um certo gênero ou fonte, em vez de processar de uma vez todas as impressões digitais de todas as pastas, o que demora mais (por exemplo, `--folder "indie-rock"`). O caminho dela é escrito a partir da pasta `database` (`--folder "generos/indie-rock"`, com `/` ou `\`), ou só o nome, se só uma pasta do banco de dados tiver esse nome. Maiúsculas e minúsculas não importam.

- **`--threads <número>`** → Define o número de threads de processamento (por exemplo, `--threads 4`) [**máximo:** 16] [**padrão:** o máximo de threads disponíveis no computador].

- **`--shifts <número>`** → O `--shifts` do audfprint do lado da busca, de 1 a 8. Valores mais altos são mais confiáveis, mas mais lentos (por exemplo, `--shifts 2` para uma busca mais rápida) [**padrão:** 4].

- **`--shard-timeout <minutos>`** → Quanto tempo um arquivo do banco de dados pode levar antes que o matcher dele seja parado e o arquivo seja marcado como falho [**padrão:** 15].

- **`--resume`** → Continua uma busca do Audfprint que parou no meio (travamento, cancelamento): só os arquivos do banco de dados que ela não tinha terminado são buscados, e depois os resultados são mostrados como sempre.

- **`--merge <subpasta>`** → Manutenção do banco de dados (avançado): junta os arquivos PKLZ de uma subpasta do banco de dados (indicada como com `--folder`) em poucos shards grandes, colocados ao lado dela em `<subpasta>__merged`, e depois fecha (usar `""` para a pasta `database` inteira). `--shard-files <número>` [**padrão:** 64] define quantos arquivos PKLZ vão em cada shard, e `--max-dropped <porcentagem>` [**padrão:** 3] descarta um shard que perde mais do que essa parte dos seus hashes. Cada shard ganha ao lado um pequeno arquivo `.sources.json` que lembra de qual arquivo PKLZ veio cada música, para que as correspondências encontradas no shard mantenham seus créditos (ver *"Créditos dos PKLZ"* abaixo). Usar com moderação, e principalmente para arquivos PKLZ bem pequenos.

#### Velocidade de busca do Audfprint

Algumas configurações opcionais podem deixar uma busca do Audfprint mais rápida ou mais rigorosa. Nenhuma é necessária:

- **isal** → `python -m pip install isal` deixa o carregamento dos arquivos do banco de dados cerca de três vezes mais rápido. O WerZatSong passa a usá-lo assim que é instalado; `FAST_INFLATE=off` no `.env` o desativa.

- **`VERIFY_CHECKSUMS=always`** no `.env` → sem o isal, o checksum de um arquivo do banco de dados é verificado na primeira vez que ele é lido e depois mais ou menos uma vez por mês, enquanto o arquivo não mudar. Com essa configuração, todo arquivo é verificado em toda busca. Com o isal, todo arquivo já é verificado toda vez.

- **`DISK_PRIORITY=normal`** no `.env` → Só no Windows. O WerZatSong pode herdar uma prioridade de disco baixa do programa que o inicia, o que deixa a busca bem mais lenta; com essa configuração, o banco de dados é lido com prioridade normal de qualquer jeito.

Quando `--audfprint` roda junto com `--musicbrainz`, `--audiotag` ou `--shazam`, esses modos buscam enquanto o Audfprint lê o banco de dados, então uma execução leva mais ou menos o tempo do mais lento dos dois. Os outros modos publicam seus resultados conforme avançam, e os do Audfprint vêm depois. `SEQUENTIAL_MODES=on` no `.env` roda primeiro os outros modos e depois o Audfprint. Se uma execução parar no meio, o `--resume` também lista os arquivos que os outros modos ainda não tinham buscado.

### 2. Audiotag

Usa a API do Audiotag para buscar correspondências no banco de dados online dele:

```bash
node werzatsong.js --audiotag
```

### 3. MusicBrainz (AcoustID)

Usa o MusicBrainz (API do AcoustID) para buscar correspondências no banco de dados online dele:

```bash
node werzatsong.js --musicbrainz
```

#### Opções adicionais do MusicBrainz

Estas opções ajudam o MusicBrainz a encontrar correspondências mudando a forma como ele busca nos arquivos MP3:

- **`--duration <min:max>`**

  - **O que faz:** define uma faixa de duração da música (em segundos) em que o MusicBrainz procura correspondências, como `"140:360"` [**padrão:** `--duration "140:360"`].

  - **Por que usar:** se a música for bem mais curta ou mais longa, basta ajustar a faixa para que ela caiba. Por exemplo, `--duration "30:200"` para músicas curtas ou `--duration "300:600"` para as mais longas.

  - **Limites:** o mínimo é 30 segundos e o máximo é 600 segundos.

- **`--extension <segundos>`**

  - **O que faz:** ajuda o MusicBrainz a encontrar correspondências quando o começo do arquivo MP3 precisa se alinhar melhor [**padrão:** `--extension 10`].

  - **Por que usar:** se estiver faltando o começo da música, por exemplo porque ela começa atrasada. Tentar `--extension 15` se o começo parecer deslocado em uns 15 segundos.

  - **Limites:** o máximo é 25 segundos.

### 4. Shazam

Usa a API oficial do Shazam para identificar músicas:

```bash
node werzatsong.js --shazam
```

## Onde encontrar os resultados

Cada execução tem a sua própria pasta dentro de **`logs`,** com o nome da data e da hora em que começou (por exemplo `logs/2026-11-25_14-03-51`), e no final o terminal diz onde ela está. Cada modo que encontra algo escreve ali um arquivo `.txt` para cada arquivo MP3: `<nome do arquivo>.audfprint.txt`, `<nome do arquivo>.musicbrainz.txt`, `<nome do arquivo>.audiotag.txt` e `<nome do arquivo>.shazam.txt`.

As correspondências também são publicadas no **webhook do Discord,** se a execução tiver um, e uma mensagem curta avisa quando um arquivo não tem nenhuma correspondência. Os resultados publicados no Discord são os mais confiáveis (os menos propensos a falsos positivos), enquanto os arquivos `.txt` também podem conter falsos positivos.

## Formato dos logs

Os arquivos do MusicBrainz, do Audiotag e do Shazam são curtos: o MusicBrainz escreve uma linha por correspondência, com a pontuação e o link da faixa no AcoustID, o Audiotag escreve a correspondência do jeito que o Audiotag a envia, e o Shazam escreve a música que encontrou.

Os arquivos do Audfprint listam todos os candidatos que a busca encontrou, começando pelos que têm mais hashes alinhados. Eles começam com uma legenda que explica o formato, e depois cada entrada ocupa três linhas:

```
[MUITO FORTE] 59 alinhados / 61 brutos (96.72%) | x1 | #0 | azureblast-variety-mix-vol-1500.pklz | offset 31.27s
Some Song.mp3 (files/@transmit13/Some Song.mp3)
Créditos: impressões digitais feitas por AzureBlast (planilha) | sugerido por S3V3R3DH3AD (planilha)
```

A primeira linha descreve a correspondência:

- **RÓTULO** → o quanto a correspondência é provável. **MUITO FORTE,** **FORTE** e **PROVÁVEL** também são publicadas no Discord, **BORDERLINE** vale a pena conferir à mão, e **NÃO ENCONTRADA** fica abaixo de todos os limiares e só aparece para a lista ficar completa.

- **alinhados** → os hashes correspondentes que coincidem no tempo. É a evidência principal: mais de 5 ou 6 geralmente indicam uma correspondência real.

- **brutos** → todos os hashes que o arquivo buscado e a correspondência têm em comum, alinhados ou não.

- **cons%** → alinhados dividido por brutos. Arquivos sem relação ficam abaixo de mais ou menos 1%, então até poucos por cento já contam.

- **hits** → quantas vezes os dois arquivos se mostraram alinhados.

- **rank** → a posição da correspondência na primeira classificação do Audfprint. É uma informação útil, não uma medida de confiança.

- **pklz de origem** → o arquivo PKLZ de onde veio a correspondência.

- **offset** → onde o arquivo buscado se alinha com a correspondência, em segundos (negativo quer dizer que o arquivo buscado começa antes).

A segunda linha é a música encontrada, com o caminho que ela tinha quando as impressões digitais foram feitas, e a terceira linha traz os créditos (ver *"Créditos dos PKLZ"* abaixo).

Em cada idioma, a legenda e as palavras de cada entrada são traduzidas, mas os campos e a ordem deles continuam os mesmos.

## Créditos dos PKLZ

Os arquivos PKLZ são feitos por pessoas da comunidade, e encontrar boas fontes para sugerir também leva tempo. A terceira linha de cada entrada do Audfprint diz quem cuidou disso:

- **impressões digitais feitas por** → quem fez o arquivo PKLZ: quem reservou a fonte na [planilha Lostwave Fingerprints.](https://docs.google.com/spreadsheets/d/1JtbAJhd78Ji18LMKVmKrRbGEq_Q1zB7SrnIbCXrihxc/edit?usp=sharing) Quando uma linha indica várias pessoas que fizeram cada uma os próprios arquivos, cada arquivo recebe só quem o fez. Quando a planilha não diz, o nome do arquivo ou da pasta dele pode dizer.

- **impressões digitais talvez feitas por** → só um palpite, usado quando não se sabe nada com certeza.

- **sugerido por** → quem sugeriu a fonte, quando a planilha diz isso com certeza.

- **nenhum crédito conhecido para este pklz** → nada diz quem fez o arquivo nem quem sugeriu a fonte dele.

O que não se sabe fica de fora, então `Créditos: impressões digitais feitas por EierkuchenHD (planilha)` quer dizer que não se sabe com certeza quem sugeriu essa fonte. Os arquivos de resultados também trazem o link da planilha, para que qualquer crédito possa ser conferido lá.

Cada parte termina com a origem dela: `(arquivo de créditos)`, `(credits-overrides.tsv)`, `(planilha)`, `(wzs.cosine.club)`, `(lista embutida)`, `(nome do arquivo)`, `(pasta do banco de dados)` ou `(caminho da música)`. A planilha Lostwave Fingerprints é a fonte principal, usada junto com palpites experimentais a partir das outras, e o arquivo de créditos de um pacote vem antes de todas.

### Arquivos de créditos

Um pacote de arquivos PKLZ pode vir com um arquivo de créditos, um pequeno arquivo `.wzsc` ao lado dos arquivos PKLZ que diz quem fez as impressões digitais e quem sugeriu a fonte deles, para o pacote inteiro ou para arquivos específicos. O WerZatSong lê todos os arquivos de créditos da pasta `database`, e os créditos deles vêm antes de todo o resto, `credits-overrides.tsv` incluído. Os nomes do pacote valem para todos os arquivos PKLZ da pasta do arquivo de créditos e das pastas dentro dela, e cada arquivo listado também é encontrado pela soma de verificação em qualquer lugar da pasta `database`, então renomear um arquivo ou mover o arquivo de créditos para outro lugar não muda nada. O que um arquivo de créditos não diz, como quem sugeriu uma fonte, continua vindo da planilha quando ela diz com certeza. Um arquivo de créditos que não pode ser lido é ignorado com um aviso.

### Atualizando os créditos

Os créditos vêm junto com o WerZatSong, em `resources/credits/pklz-credits.tsv`. Esse arquivo é atualizado com a planilha a cada hora, então atualizar o WerZatSong também traz os créditos mais recentes. Uma busca nunca baixa nada; quando faltam créditos, o WerZatSong avisa no final.

Para ter agora mesmo o que a planilha diz, dar um clique duplo em **`update-credits.cmd`** no Windows, ou rodar **`sh update-credits.sh`** no Linux e no macOS (`npm run credits:update` funciona em qualquer lugar). Ele lê a planilha, procura pelo nome os arquivos PKLZ da pasta `database` (um arquivo PKLZ só é lido para compará-lo com a soma de verificação de um arquivo de créditos) e completa os créditos que faltavam nos arquivos de resultados que já estão em `logs`, em qualquer idioma em que tenham sido escritos. Os nomes que já estão lá nunca são mudados. Se não for possível acessar a planilha, ele avisa e nada muda. `-- --save <arquivo>` guarda uma cópia da planilha, e `-- --logs <pasta>` ou `-- --database <pasta>` usam outras pastas.

Para corrigir ou adicionar um crédito em um computador só, criar **`credits-overrides.tsv`** na pasta do WerZatSong, com uma linha por arquivo PKLZ: o nome dele, depois quem fez as impressões digitais, quem o reservou e quem o sugeriu, separados por tabulações (vários nomes separados por `, `). Essas linhas valem mais do que todo o resto, menos os arquivos de créditos, planilha incluída.

Para adicionar créditos para todo mundo, preencher a planilha: as colunas claimed by, suggested by e PKLZ filename são tudo de que o WerZatSong precisa.

### Quando a planilha muda

- **Uma linha nova** → é adicionada.

- **Uma linha editada** → o que ela diz agora substitui o que dizia antes. Uma célula que foi esvaziada mantém o nome que tinha.

- **Uma linha apagada** → continua conhecida. Todas as linhas que a planilha já teve ficam guardadas no arquivo de créditos, então uma linha tirada da planilha, por engano ou não, não leva nenhum crédito junto.

- **Linhas, abas ou colunas mudadas de lugar** → nada muda. Uma linha é reconhecida pelo assunto dela (o ID do canal do YouTube, senão a URL, o título, a faixa de IDs ou a tag, e o tipo de aba em que está), não pela posição, e as colunas são encontradas pelos cabeçalhos.

- **A planilha esvaziada ou apagada** → nada se perde, pelo mesmo motivo.

- **A planilha de repente indicando outra pessoa para muitas fontes de uma vez** (mais de 5% das linhas dela, ou mais de 200 quando isso for mais), como faria uma planilha danificada ou vandalizada → nada é alterado, e a atualização explica por quê. Se as mudanças estiverem certas, executar de novo com `--force` (`npm run credits:update -- --force`).

### Mantendo os créditos atualizados

Estes servem para quem mantém o WerZatSong. Também funcionam com `--language`.

- **`.github/workflows/update-credits.yml`** → a cada hora, o GitHub lê a planilha, roda `npm run credits:build` e faz o commit de `resources/credits/pklz-credits.tsv` quando algo mudou. Se a planilha não puder ser baixada, a execução termina com um aviso e nada muda. Se a planilha passar a atribuir muitas fontes a outra pessoa de uma vez, a execução falha; quando essas mudanças estiverem certas, rodar o workflow à mão pela aba **Actions** com *force* marcado.

- **`npm run credits:build`** → a mesma coisa à mão. Ele procura de novo cada arquivo PKLZ do arquivo de créditos e nunca tira nada. `-- --sheet <arquivo ou link>` lê uma cópia baixada da planilha (`.xlsx`, a exportação HTML dela ou arquivos `.csv`) ou outro link. `-- --fresh --list <arquivo> --list <arquivo>` reconstrói o arquivo a partir de listas de arquivos PKLZ (filetrees de pastas do banco de dados ou um caminho por linha, a mais recente primeiro), que precisam incluir o conteúdo dos arquivos compactados de onde vêm alguns arquivos, como os lotes da Reverbnation. `--report <arquivo>` também escreve de onde veio cada crédito. Termina com o código de saída 3 quando a planilha não pode ser baixada.

- **`npm run credits:report -- --database <pasta>`** → lista os créditos que cada arquivo PKLZ de uma pasta receberia, e como cada um foi encontrado. `--tree <arquivo>` lê os nomes de uma lista, e `--logs <pasta>` passa pelos arquivos de resultados anteriores.

O link da planilha é `CREDITS_SHEET`, no começo de `utils/credits.js`. A planilha só é lida, então ela precisa continuar compartilhada com "Qualquer pessoa com o link" como leitor. As regras sobre nomes ficam em `utils/creditsRules.js`: `PEOPLE` tem o nome que os créditos mostram para cada apelido, `FAMILIES` os packs de quem se sabe o autor (adicionar um pack ali quando alguém disser que é dele), `SHEET_MAKERS` os nomes da planilha cujos arquivos PKLZ são todos feitos pelas mesmas pessoas, não importa quem tenha reservado as linhas deles, `NAMING_STYLES` os estilos de nome de arquivo que só uma pessoa usa, `NAMED_MAKERS` os jeitos de nomear arquivos PKLZ que dizem quem os fez, `PATH_MAKERS` os caminhos de músicas guardados que dizem quem fez um arquivo PKLZ, `OWN_FOLDERS` as pastas cujos arquivos PKLZ são todos feitos por uma pessoa só, e `FOLDER_FAMILIES` as pastas que guardam os arquivos PKLZ de uma pessoa só, que só dão *talvez.*

## Créditos de desenvolvimento

Desenvolvido por **Nel** com contribuições de **Numerophobe,** **AzureBlast,** **Mystic65,** **EierkuchenHD** e **some random account.**

Tradução para o português brasileiro: **(W.I.P.)**
