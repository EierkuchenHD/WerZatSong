# WerZatSong

WerZatSong est un outil qui aide à retrouver le nom de chansons à partir de fichiers audio. Il propose plusieurs modes de recherche pour trouver des correspondances: **Audfprint, Audiotag, MusicBrainz (AcoustID) et Shazam.** On peut utiliser un seul mode ou en combiner plusieurs. Si plusieurs modes sont choisis, ils s'exécutent dans cet ordre de priorité:

1. **MusicBrainz** (AcoustID)

2. **Audiotag**

3. **Shazam**

4. **Audfprint**

Ce document est un guide simple, pas à pas, pour installer, configurer et utiliser WerZatSong.

> **For English speakers:** the original English version of this document is [**README.md.**](../README.md)

> **Per chi parla italiano:** una traduzione completa di questo documento è disponibile in [**README_ITA.md.**](README_ITA.md)

> **Para quem fala português:** uma tradução completa deste documento está disponível em [**README_POR.md.**](README_POR.md)

## Prérequis et installation

Avant de commencer, ces programmes doivent être installés:

### Prérequis système

- [**Node.js**](https://nodejs.org) (v20.0 ou supérieure) → L'ajouter au PATH et le vérifier dans le terminal avec `node -v` et `npm -v`.

- [**Python**](https://www.python.org/downloads) (v3.13 ou supérieure) → L'ajouter au PATH et le vérifier dans le terminal avec `python --version` et `pip --version`. Sous macOS et Linux, ils s'appellent souvent `python3` et `pip3`: les utiliser dans les commandes plus bas (WerZatSong trouve `python3` tout seul).

- [**FFmpeg**](https://www.gyan.dev/ffmpeg/builds) → L'ajouter au PATH et le vérifier dans le terminal avec `ffmpeg -version`.

  ![Programmes](../images/programs.png)

### Prérequis du programme

Pour bien utiliser WerZatSong, il faut aussi:

- **URL de webhook Discord** → Pour recevoir les notifications de correspondances (voir *"Comment obtenir une URL de webhook Discord"* plus bas).

- **Clé API Audiotag** → Nécessaire pour le mode de recherche Audiotag (voir *"Comment obtenir une clé API Audiotag"* plus bas).

- **Clé API AcoustID** → Nécessaire pour le mode de recherche MusicBrainz (voir *"Comment obtenir une clé API AcoustID"* plus bas).

- **Base de données pour Audfprint** → Nécessaire pour le mode de recherche Audfprint (voir *"Télécharger la base de données Audfprint"* plus bas).

  - **Attention à l'espace disque** → La base de données prend beaucoup de place sur le disque. Un **SSD** est recommandé pour de meilleures performances.

WerZatSong ne demande la clé API d'un mode que quand ce mode est dans la commande, et on peut se passer du webhook comme des deux clés (voir *"Lancer sans webhook ou sans clé API"* plus bas).

#### Comment obtenir une URL de webhook Discord

1. Ouvrir Discord et créer un serveur (s'il n'y en a pas déjà un).

2. Dans le salon textuel **#général,** cliquer sur l'icône en forme d'engrenage (**Modifier le salon**).

3. Aller dans **Intégrations** → **Webhooks.**

4. Cliquer sur **Créer un webhook,** puis l'ouvrir et choisir **Copier l'URL du webhook.**

5. La garder de côté pour l'instant, elle servira bientôt.

#### Comment obtenir une clé API Audiotag

1. Aller sur le site d'[Audiotag.](https://audiotag.info)

2. Créer un nouveau compte, ou se connecter à un compte existant.

3. Aller dans la [**User Section**](https://user.audiotag.info) et cliquer sur l'onglet **API keys.**

4. Cliquer sur le bouton **Create new API key,** copier la clé et la garder de côté pour l'instant.

#### Comment obtenir une clé API AcoustID

1. Aller sur le site d'[AcoustID.](https://acoustid.org)

2. Créer un nouveau compte, ou se connecter à un compte existant.

3. Dans [**My Applications,**](https://acoustid.org/my-applications) cliquer sur le bouton **Register a new application.**

4. Remplir les champs avec des informations de base (elles peuvent être inventées) et cliquer sur **Register.**

5. Copier l'**API key** de l'application qui apparaît et la garder de côté pour l'instant.

#### Télécharger la base de données Audfprint

- Télécharger les **dossiers de la base de données** qui contiennent les **fichiers PKLZ** créés par la communauté depuis [**ici.**](https://wzs.cosine.club)

### Installation du programme

1. **Télécharger WerZatSong:**

   - Aller sur le dépôt, cliquer sur **<> Code** → **Download ZIP.**

   - Décompresser le fichier dans n'importe quel dossier.

   - Un dossier appelé `WerZatSong-main` devrait maintenant être là.

2. **Aller dans le dossier:**

   - Se rendre dans le dossier décompressé avec la commande `cd` dans le terminal:

     ```bash
     cd WerZatSong-main
     ```

3. **Lancer cette commande pour installer les dépendances Node.js:**

    ```bash
    npm install
    ```

4. **Lancer ces commandes une par une pour installer les dépendances Python:**

    ```bash
    pip install -r requirements.txt
    pip install audioop-lts
    pip install shazamio
    ```

    - **Remarque:** si une erreur apparaît pendant l'installation de ces dépendances, il manque peut-être autre chose. Voici deux problèmes courants et leurs solutions:

        - **Erreur Rust** (voir la capture d'écran ci-dessous):

            - Installer Rust depuis [le site officiel.](https://www.rust-lang.org/tools/install)

            - Après l'installation, vérifier qu'il fonctionne en lançant `rustc --version` dans le terminal.

            - Une fois Rust installé, relancer les commandes `pip install` ci-dessus.

            ![Erreur Rust](../images/rust-error.png)

        - **Erreur des outils de compilation C++** (voir la capture d'écran ci-dessous):

            - Installer les Build Tools pour Visual Studio 2017 ou plus récent depuis [le site officiel.](https://visualstudio.microsoft.com/thank-you-downloading-visual-studio/?sku=BuildTools&rel=16)

            - Pendant l'installation, sélectionner la charge de travail *"Développement Desktop en C++"* (les outils C++).

            - Après l'installation, redémarrer l'ordinateur.

            - Relancer les commandes `pip install` ci-dessus.

            ![Erreur Shazam](../images/shazam-error.png)

C'est fait! WerZatSong est maintenant prêt à être configuré.

## Configuration initiale

### Configurer WerZatSong pour la première fois

Dans le terminal, lancer la commande suivante:
```bash
node werzatsong.js --audiotag --musicbrainz
```

Au **premier lancement,** cette commande:

- Crée automatiquement tous les dossiers nécessaires.

- Demande **l'URL de webhook Discord, la clé API Audiotag et la clé API AcoustID.**

- Se ferme toute seule avec un message d'erreur une fois la configuration terminée.

  ![Configuration](../images/setup.png)

Si quelque chose de collé ne convient pas, WerZatSong le dit et le redemande, donc une faute de frappe n'oblige pas à tout recommencer. Il indique aussi l'option qui permet de s'en passer, pour ce qu'on préfère configurer plus tard. L'URL du webhook n'est enregistrée qu'une fois que WerZatSong y a publié un message de bienvenue, et la clé Audiotag qu'une fois qu'Audiotag l'a acceptée.

### Configurer la base de données Audfprint

Après le premier lancement, placer les dossiers téléchargés qui contiennent les fichiers PKLZ dans le dossier `database` qui vient d'être créé. Cette étape est nécessaire pour le mode de recherche Audfprint. Pour les garder ailleurs, par exemple sur un autre disque, indiquer ce dossier comme `DATABASE_FOLDER` dans `utils/consts.js` (par exemple `'D:/pklz'`, `'/Volumes/Disque/pklz'` ou `'~/pklz'`):

  ![Base de données](../images/database.png)

## Comment utiliser WerZatSong

1. **Préparer les fichiers MP3**

    - Mettre les fichiers MP3 à identifier dans le dossier `input` (créé automatiquement après la configuration).

    - La limite est de **30 fichiers MP3 par exécution,** mieux vaut donc ne pas en mettre plus.

    - Éviter les fichiers MP3 trop courts (moins de 5 secondes), car ils risquent de ne pas être traités correctement.

    - Éviter les noms de fichiers avec des caractères unicode rares ou spéciaux, pour prévenir d'éventuelles erreurs.

2. **Lancer WerZatSong**

    - Utiliser cette commande dans le terminal avec le ou les modes choisis. Par exemple, pour utiliser tous les modes:

        ```bash
        node werzatsong.js --audfprint --audiotag --musicbrainz --shazam
        ```

### Options générales

- **`--audfprint`** → Active le mode de recherche Audfprint.

- **`--audiotag`** → Active le mode de recherche Audiotag.

- **`--musicbrainz`** → Active le mode de recherche MusicBrainz (AcoustID).

- **`--shazam`** → Active le mode de recherche Shazam.

- **`--trim <secondes>`** → Raccourcit les fichiers MP3 à la durée indiquée (par exemple `--trim 60` pour 60 secondes). Cela devrait accélérer les choses pour identifier des fichiers longs [**par défaut:** pas de coupe].

- **`--language <langue>`** → La langue de tout ce que WerZatSong affiche et écrit (voir *"Langues"* plus bas) [**par défaut:** anglais].

- **`--no-discord`** → Ne publie rien sur Discord pendant cette exécution, même si le fichier `.env` a un webhook, et ne le demande pas. Les résultats sont quand même enregistrés comme d'habitude dans `logs`.

  Pour ne garder que certains messages, ajouter `keep-match` (seulement les messages de correspondance trouvée) ou `keep-nomatch` (seulement ceux d'aucune correspondance trouvée): le webhook est alors nécessaire, et l'avis sur les fichiers de la base de données qui n'ont pas pu être cherchés est quand même envoyé. Écrire `--no-discord all` revient à écrire `--no-discord` seul.

- **`--no-prompt`** → Ne s'arrête jamais pour demander quoi que ce soit à l'utilisateur. Surtout pensé pour les exécutions que personne ne surveille, comme des scripts ou des exécutions programmées (voir *"Lancer sans webhook ou sans clé API"* plus bas).

### Lancer sans webhook ou sans clé API

WerZatSong demande le webhook Discord à chaque exécution qui n'en a pas, sauf avec `--no-discord` (seul ou avec `all`), et une clé API seulement quand son mode est dans la commande: une recherche avec seulement `--audfprint` ou `--shazam` ne demande jamais la clé Audiotag ou AcoustID. Pour chercher sans une clé, il suffit de retirer son mode de la commande.

`--no-prompt` sert aux exécutions où personne ne peut répondre. WerZatSong utilise ce que contient le fichier `.env` et ne demande rien:

- **Pas de webhook Discord** → rien n'est publié sur Discord, et WerZatSong le dit au démarrage. Les résultats sont quand même enregistrés dans `logs`.

- **Pas de clé API Audiotag ou AcoustID** → ce mode n'est pas lancé et WerZatSong le signale, pendant que les autres modes fonctionnent comme d'habitude. S'il ne reste aucun des modes choisis, il s'arrête.

Par exemple, avec un fichier `.env` vide, cette commande lance Audfprint et Shazam, saute MusicBrainz et Audiotag, et ne publie rien sur Discord:

```bash
node werzatsong.js --audfprint --musicbrainz --audiotag --shazam --no-prompt
```

Pour ajouter le webhook ou une clé plus tard, lancer WerZatSong une fois sans ces options et le coller quand il le demande, ou l'écrire directement dans le fichier `.env` (`WEBHOOK_URL`, `AUDIOTAG_KEY`, `ACOUSTID_KEY`).

### Langues

WerZatSong prend actuellement en charge le français, l'anglais, l'italien et le portugais (brésilien). Ajouter `--language` avec l'une de ces valeurs:

- `Français` ou `French`

- `English`

- `Italiano` ou `Italian`

- `Português` ou `Portuguese`

Les majuscules et les accents n'ont pas d'importance, donc `--language francais` fonctionne aussi. Par exemple:

```bash
node werzatsong.js --audfprint --language Français
```

Les messages du terminal, `--help`, les questions de la configuration, les fichiers de résultats et les messages Discord sont alors tous dans cette langue. Si une langue que WerZatSong n'a pas est demandée, il le dit en anglais et continue en anglais.

Pour traduire WerZatSong dans une autre langue, ou pour améliorer une traduction, consulter [**TRANSLATION_GUIDE.md**](../TRANSLATION_GUIDE.md) (en anglais). Un nouveau fichier de traduction fonctionne dès qu'il est placé dans le dossier `localizations`.

## Explication des modes de recherche

### 1. Audfprint

Trouve des correspondances en comparant les fichiers MP3 à une base de données locale d'empreintes (fichiers PKLZ):

```bash
node werzatsong.js --audfprint
```

#### Options supplémentaires d'Audfprint

- **`--folder <sous-dossier>`** → Choisit un sous-dossier précis dans le dossier `database`. Utile pour chercher seulement parmi les empreintes d'un certain genre ou d'une certaine source au lieu de traiter d'un coup toutes les empreintes de tous les dossiers, ce qui prend plus de temps (par exemple `--folder "indie-rock"`). Son chemin s'écrit à partir du dossier `database` (`--folder "genres/indie-rock"`, avec `/` ou `\`), ou seulement son nom si un seul dossier de la base de données le porte. Les majuscules et les minuscules ne comptent pas.

- **`--threads <nombre>`** → Définit le nombre de fils de traitement (par exemple `--threads 4`) [**max:** 16] [**par défaut:** le maximum de fils disponibles sur l'ordinateur].

- **`--shifts <nombre>`** → Le `--shifts` d'audfprint côté recherche, de 1 à 8. Plus la valeur est haute, plus la recherche est fiable mais lente (par exemple `--shifts 2` pour une recherche plus rapide) [**par défaut:** 4].

- **`--shard-timeout <minutes>`** → Combien de temps un fichier de la base de données peut prendre avant que son matcher soit arrêté et que le fichier soit signalé comme ayant échoué [**par défaut:** 15].

- **`--resume`** → Reprend une recherche Audfprint qui s'est arrêtée en cours de route (plantage, annulation): seuls les fichiers de la base de données qu'elle n'avait pas terminés sont cherchés, puis les résultats sont rapportés comme d'habitude.

- **`--merge <sous-dossier>`** → Maintenance de la base de données (avancé): fusionne les fichiers PKLZ d'un sous-dossier de la base de données (indiqué comme avec `--folder`) en quelques grands shards, placés à côté de lui dans `<sous-dossier>__merged`, puis s'arrête (utiliser `""` pour tout le dossier `database`). `--shard-files <nombre>` [**par défaut:** 64] fixe le nombre de fichiers PKLZ par shard, et `--max-dropped <pourcentage>` [**par défaut:** 3] écarte un shard qui perd une part plus grande de ses hachages. Chaque shard a à côté de lui un petit fichier `.sources.json` qui retient de quel fichier PKLZ vient chaque chanson, pour que les correspondances trouvées dans le shard gardent leurs crédits (voir *"Crédits des PKLZ"* plus bas). À utiliser avec modération, et surtout pour de très petits fichiers PKLZ.

#### Vitesse de recherche d'Audfprint

Quelques réglages facultatifs peuvent rendre une recherche Audfprint plus rapide ou plus rigoureuse. Aucun n'est nécessaire:

- **isal** → `python -m pip install isal` rend le chargement des fichiers de la base de données environ trois fois plus rapide. WerZatSong l'utilise dès qu'il est installé; `FAST_INFLATE=off` dans `.env` le désactive.

- **`VERIFY_CHECKSUMS=always`** dans `.env` → sans isal, la somme de contrôle d'un fichier de la base de données est vérifiée la première fois qu'il est lu, puis environ une fois par mois, tant que le fichier ne change pas. Avec ce réglage, chaque fichier est vérifié à chaque recherche. Avec isal, chaque fichier est de toute façon vérifié à chaque fois.

- **`DISK_PRIORITY=normal`** dans `.env` → Windows uniquement. WerZatSong peut hériter d'une priorité disque basse du programme qui le lance, ce qui ralentit beaucoup une recherche; avec ce réglage, la base de données est lue en priorité normale quoi qu'il arrive.

Quand `--audfprint` est lancé avec `--musicbrainz`, `--audiotag` ou `--shazam`, ces modes cherchent pendant qu'Audfprint lit la base de données, donc une exécution dure à peu près autant que le plus lent des deux. Les autres modes publient leurs résultats au fur et à mesure, et ceux d'Audfprint arrivent après. `SEQUENTIAL_MODES=on` dans `.env` lance plutôt les autres modes d'abord, puis Audfprint. Si une exécution s'arrête en cours de route, `--resume` liste aussi les fichiers que les autres modes n'avaient pas encore cherchés.

### 2. Audiotag

Utilise l'API d'Audiotag pour chercher des correspondances dans sa base de données en ligne:

```bash
node werzatsong.js --audiotag
```

### 3. MusicBrainz (AcoustID)

Utilise MusicBrainz (API d'AcoustID) pour chercher des correspondances dans sa base de données en ligne:

```bash
node werzatsong.js --musicbrainz
```

#### Options supplémentaires de MusicBrainz

Ces options aident MusicBrainz à trouver des correspondances en changeant sa façon de chercher dans les fichiers MP3:

- **`--duration <min:max>`**

  - **Ce qu'elle fait:** définit une plage de durée de la chanson (en secondes) dans laquelle MusicBrainz cherche des correspondances, comme `"140:360"` [**par défaut:** `--duration "140:360"`].

  - **Pourquoi l'utiliser:** si la chanson est beaucoup plus courte ou plus longue, il suffit d'ajuster la plage pour qu'elle rentre dedans. Par exemple, `--duration "30:200"` pour des chansons courtes ou `--duration "300:600"` pour des plus longues.

  - **Limites:** le minimum est de 30 secondes, le maximum de 600 secondes.

- **`--extension <secondes>`**

  - **Ce qu'elle fait:** aide MusicBrainz à trouver des correspondances quand le début du fichier MP3 doit mieux s'aligner [**par défaut:** `--extension 10`].

  - **Pourquoi l'utiliser:** si le début de la chanson manque, par exemple parce qu'elle commence en retard. Essayer `--extension 15` si le début semble décalé d'environ 15 secondes.

  - **Limites:** le maximum est de 25 secondes.

### 4. Shazam

Utilise l'API officielle de Shazam pour identifier les chansons:

```bash
node werzatsong.js --shazam
```

## Où trouver les résultats

Chaque exécution a son propre dossier dans **`logs`,** nommé d'après la date et l'heure de son lancement (par exemple `logs/2026-11-25_14-03-51`), et le terminal indique où il se trouve à la fin. Chaque mode qui trouve quelque chose y écrit un fichier `.txt` par fichier MP3: `<nom du fichier>.audfprint.txt`, `<nom du fichier>.musicbrainz.txt`, `<nom du fichier>.audiotag.txt` et `<nom du fichier>.shazam.txt`.

Les correspondances sont aussi publiées sur le **webhook Discord,** si l'exécution en a un, et un court message le signale quand un fichier n'a aucune correspondance. Les résultats publiés sur Discord sont les plus fiables (les moins susceptibles d'être des faux positifs), alors que les fichiers `.txt` peuvent aussi contenir des faux positifs.

## Format des logs

Les fichiers de MusicBrainz, Audiotag et Shazam sont courts: MusicBrainz écrit une ligne par correspondance, avec son score et le lien du morceau sur AcoustID, Audiotag écrit la correspondance telle qu'Audiotag l'envoie, et Shazam écrit la chanson qu'il a trouvée.

Les fichiers d'Audfprint listent tous les candidats trouvés par la recherche, en commençant par ceux qui ont le plus de hachages alignés. Ils commencent par une légende qui explique le format, puis chaque entrée tient sur trois lignes:

```
[TRÈS FORTE] 59 alignés / 61 bruts (96.72%) | x1 | #0 | azureblast-variety-mix-vol-1500.pklz | offset 31.27s
Some Song.mp3 (files/@transmit13/Some Song.mp3)
Crédits: empreintes réalisées par AzureBlast (feuille) | suggéré par S3V3R3DH3AD (feuille)
```

La première ligne décrit la correspondance:

- **ÉTIQUETTE** → la probabilité que ce soit la bonne. **TRÈS FORTE,** **FORTE** et **PROBABLE** sont aussi publiées sur Discord, **BORDERLINE** mérite une vérification à la main, et **NON TROUVÉE** est sous tous les seuils et n'est listée que pour être complet.

- **alignés** → les hachages correspondants qui coïncident dans le temps. C'est la preuve principale: plus de 5 ou 6 indiquent généralement une vraie correspondance.

- **bruts** → tous les hachages que le fichier cherché et la correspondance ont en commun, alignés ou non.

- **cons%** → alignés divisé par bruts. Des fichiers sans rapport restent sous environ 1%, donc même quelques pourcents comptent.

- **hits** → combien de fois les deux fichiers se sont révélés alignés.

- **rank** → la place de la correspondance dans le premier classement d'Audfprint. C'est une indication utile, pas une mesure de fiabilité.

- **pklz source** → le fichier PKLZ d'où vient la correspondance.

- **offset** → l'endroit où le fichier cherché s'aligne avec la correspondance, en secondes (négatif veut dire que le fichier cherché commence plus tôt).

La deuxième ligne est la chanson trouvée, avec le chemin qu'elle avait quand ses empreintes ont été faites, et la troisième ligne donne les crédits (voir *"Crédits des PKLZ"* plus bas).

Dans chaque langue, la légende et les mots de chaque entrée sont traduits, mais les champs et leur ordre restent les mêmes.

## Crédits des PKLZ

Les fichiers PKLZ sont faits par des membres de la communauté, et trouver de bonnes sources à suggérer prend du temps aussi. La troisième ligne de chaque entrée d'Audfprint dit qui s'en est occupé:

- **empreintes réalisées par** → qui a fait le fichier PKLZ: la personne qui a réservé la source sur la [feuille Lostwave Fingerprints.](https://docs.google.com/spreadsheets/d/1JtbAJhd78Ji18LMKVmKrRbGEq_Q1zB7SrnIbCXrihxc/edit?usp=sharing) Quand une ligne nomme plusieurs personnes qui ont chacune fait leurs propres fichiers, chaque fichier ne reçoit que la personne qui l'a fait. Quand la feuille ne le dit pas, le nom du fichier ou de son dossier peut le dire.

- **empreintes peut-être réalisées par** → seulement une supposition, utilisée quand rien de sûr n'est connu.

- **suggéré par** → qui a suggéré la source, quand la feuille le dit avec certitude.

- **aucun crédit connu pour ce pklz** → rien ne dit qui a fait le fichier ni qui en a suggéré la source.

Ce qui n'est pas connu est omis, donc `Crédits: empreintes réalisées par EierkuchenHD (feuille)` veut dire qu'on ne sait pas avec certitude qui a suggéré cette source. Les fichiers de résultats donnent aussi le lien de la feuille, pour que chaque crédit puisse y être vérifié.

Chaque partie se termine par son origine: `(fichier de crédits)`, `(credits-overrides.tsv)`, `(feuille)`, `(wzs.cosine.club)`, `(liste intégrée)`, `(nom du fichier)`, `(dossier de la base de données)` ou `(chemin de la chanson)`. La feuille Lostwave Fingerprints est la source principale, utilisée avec des suppositions expérimentales d'après les autres, et le fichier de crédits d'un paquet passe avant toutes.

### Fichiers de crédits

Un paquet de fichiers PKLZ peut avoir un fichier de crédits, un petit fichier `.wzsc` à côté des fichiers PKLZ qui dit qui en a fait les empreintes et qui en a suggéré la source, pour tout le paquet ou pour des fichiers précis. WerZatSong lit chaque fichier de crédits du dossier `database`, et leurs crédits passent avant tout le reste, `credits-overrides.tsv` compris. Les noms du paquet valent pour chaque fichier PKLZ du dossier du fichier de crédits et des dossiers qu'il contient, et chaque fichier listé est aussi retrouvé par sa somme de contrôle n'importe où dans le dossier `database`, donc renommer un fichier ou déplacer ailleurs le fichier de crédits ne change rien. Ce qu'un fichier de crédits ne dit pas, comme qui a suggéré une source, vient quand même de la feuille quand elle le dit avec certitude. Un fichier de crédits illisible est ignoré avec un avertissement.

### Mettre à jour les crédits

Les crédits sont fournis avec WerZatSong, dans `resources/credits/pklz-credits.tsv`. Ce fichier est mis à jour avec la feuille toutes les heures, donc mettre WerZatSong à jour apporte aussi les crédits les plus récents. Une recherche ne télécharge jamais rien; quand des crédits manquent, WerZatSong le dit à la fin.

Pour avoir tout de suite ce que dit la feuille, double-cliquer sur **`update-credits.cmd`** sous Windows, ou lancer **`sh update-credits.sh`** sous Linux et macOS (`npm run credits:update` fonctionne partout). Il lit la feuille, cherche par leur nom les fichiers PKLZ du dossier `database` (un fichier PKLZ n'est lu que pour le comparer à la somme de contrôle d'un fichier de crédits) et complète les crédits manquants dans les fichiers de résultats déjà présents dans `logs`, quelle que soit la langue dans laquelle ils ont été écrits. Les noms déjà présents ne sont jamais changés. Si la feuille est inaccessible, il le dit et rien ne change. `-- --save <fichier>` garde une copie de la feuille, et `-- --logs <dossier>` ou `-- --database <dossier>` utilisent d'autres dossiers.

Pour corriger ou ajouter un crédit sur un seul ordinateur, créer **`credits-overrides.tsv`** dans le dossier de WerZatSong, avec une ligne par fichier PKLZ: son nom, puis qui en a fait les empreintes, qui l'a réservé et qui l'a suggéré, séparés par des tabulations (plusieurs noms séparés par `, `). Ces lignes l'emportent sur tout le reste sauf les fichiers de crédits, feuille comprise.

Pour ajouter des crédits pour tout le monde, remplir la feuille: les colonnes claimed by, suggested by et PKLZ filename sont tout ce dont WerZatSong a besoin.

### Quand la feuille change

- **Une nouvelle ligne** → ajoutée.

- **Une ligne modifiée** → ce qu'elle dit maintenant remplace ce qu'elle disait avant. Une cellule vidée garde le nom qu'elle avait.

- **Une ligne supprimée** → toujours connue. Chaque ligne que la feuille a jamais eue est gardée dans le fichier des crédits, donc une ligne retirée de la feuille, par erreur ou non, n'emporte aucun crédit avec elle.

- **Des lignes, onglets ou colonnes déplacés** → rien ne change. Une ligne est reconnue par ce dont elle parle (l'ID de sa chaîne YouTube, sinon son URL, son titre, sa plage d'ID ou son tag, et le type d'onglet où elle se trouve), pas par sa place, et les colonnes sont trouvées grâce à leurs en-têtes.

- **La feuille vidée ou supprimée** → rien n'est perdu, pour la même raison.

- **La feuille qui nomme soudain quelqu'un d'autre pour beaucoup de sources à la fois** (plus de 5% de ses lignes, ou plus de 200 si c'est davantage), comme le ferait une feuille abîmée ou vandalisée → rien n'est changé, et la mise à jour explique pourquoi. Si les changements sont justes, la relancer avec `--force` (`npm run credits:update -- --force`).

### Garder les crédits à jour

Pour la personne qui maintient WerZatSong. Ces commandes fonctionnent aussi avec `--language`.

- **`.github/workflows/update-credits.yml`** → toutes les heures, GitHub lit la feuille, lance `npm run credits:build` et fait le commit de `resources/credits/pklz-credits.tsv` quand quelque chose a changé. Si la feuille ne peut pas être téléchargée, l'exécution se termine par un avertissement et rien ne change. Si la feuille attribue d'un coup beaucoup de sources à quelqu'un d'autre, l'exécution échoue; quand ces changements sont justes, lancer le workflow à la main depuis l'onglet **Actions** en cochant *force.*

- **`npm run credits:build`** → la même chose à la main. Il cherche à nouveau chaque fichier PKLZ du fichier des crédits et n'enlève jamais rien. `-- --sheet <fichier ou lien>` lit une copie téléchargée de la feuille (`.xlsx`, son export HTML ou des fichiers `.csv`) ou un autre lien. `-- --fresh --list <fichier> --list <fichier>` reconstruit le fichier à partir de listes de fichiers PKLZ (arborescences de dossiers de la base de données ou un chemin par ligne, la plus récente en premier), qui doivent inclure le contenu des archives d'où viennent certains fichiers, comme les lots Reverbnation. `--report <fichier>` écrit aussi d'où vient chaque crédit. Il se termine avec le code de sortie 3 quand la feuille ne peut pas être téléchargée.

- **`npm run credits:report -- --database <dossier>`** → liste les crédits que recevrait chaque fichier PKLZ d'un dossier, et comment chacun a été trouvé. `--tree <fichier>` prend plutôt les noms dans une liste, et `--logs <dossier>` parcourt les fichiers de résultats précédents.

Le lien de la feuille est `CREDITS_SHEET` en haut de `utils/credits.js`. La feuille est seulement lue, donc elle doit rester partagée avec "Tous les utilisateurs disposant du lien" en lecture. Les règles sur les noms sont dans `utils/creditsRules.js`: `PEOPLE` contient le nom que les crédits affichent pour chaque pseudo, `FAMILIES` les packs dont on connaît l'auteur (y ajouter un pack quand quelqu'un dit qu'il est à lui), `SHEET_MAKERS` les noms de la feuille dont tous les fichiers PKLZ sont faits par les mêmes personnes, peu importe qui a réservé leurs lignes, `NAMING_STYLES` les styles de noms de fichiers qu'une seule personne utilise, `NAMED_MAKERS` les façons de nommer les fichiers PKLZ qui disent qui les a faits, `PATH_MAKERS` les chemins de chansons enregistrés qui disent qui a fait un fichier PKLZ, `OWN_FOLDERS` les dossiers dont tous les fichiers PKLZ sont faits par une seule personne, et `FOLDER_FAMILIES` les dossiers qui contiennent les fichiers PKLZ d'une seule personne, qui ne donnent jamais que *peut-être.*

## Crédits de développement

Développé par **Nel** avec la contribution de **Numerophobe,** **AzureBlast,** **Mystic65,** **EierkuchenHD** et **some random account.**

Traduction en français par **jacktorrance_overlook.**
