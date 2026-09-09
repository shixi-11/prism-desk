# Prism Desk · 棱镜

<img src="src/assets/prism-icon.svg" width="80" height="80" alt="Prism Desk">

[English](README.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [العربية](README.ar.md)

Créé par [Shixi Lin](https://shixilin.com/).

Prism Desk est un espace de travail Windows pour les CLI accessibles par abonnement. Lorsqu’un compte épuise son quota, vous pouvez transférer la tâche à un autre compte sans reconstituer manuellement la conversation et les notes de progression. Le dossier du projet reste le même.

### Versions et téléchargements

**[Dernière version](https://github.com/shixi-11/prism-desk/releases/latest)** · **[Guide d’installation](#install)**

Prism est actuellement distribué sous forme d’**installation à partir des sources pour Windows**. Aucun programme d’installation autonome `.exe` ou `.msi` n’est publié. Les téléchargements « Source code » de GitHub contiennent les fichiers sources ; suivez le guide d’installation pour compiler et lancer l’application de bureau. Chaque version stable dispose d’une seule étiquette de version et d’une seule page contenant les notes de modification complètes en anglais et en chinois simplifié.

### Ce que vous pouvez faire

| Fonctionnalité | En pratique |
| --- | --- |
| Poursuivre la même tâche | Conservez ensemble la demande initiale, la conversation, les notes de progression et les résultats d’outils enregistrés lorsque vous transmettez le travail à un autre compte. |
| Choisir un compte d’exécution | Sélectionnez un profil CLI Codex, Claude ou Grok configuré. Chacun utilise son propre répertoire de connexion. Supprimez les comptes inutilisés depuis le panneau des comptes ; l’historique des tâches et les dossiers de connexion locaux sont conservés. |
| Changer de modèle et de niveau de raisonnement | Ajustez l’un ou l’autre de ces paramètres pendant une tâche. Les modifications s’appliquent à l’exécution suivante et sont enregistrées pour chaque compte au sein de cette tâche. |
| Vérifier le quota | Consultez les pourcentages disponibles, les périodes de quota et les heures de réinitialisation communiqués par le fournisseur. Les crédits de réinitialisation Codex incluent leur date d’expiration respective lorsqu’elle est fournie. |
| Transférer après épuisement du quota | Activez le transfert automatique ou sélectionnez vous-même le compte suivant. Prism attend la fin de l’exécution précédente avant de poursuivre. |
| Utiliser des compétences et des outils locaux | Indiquez à Prism les instructions de l’assistant, un dossier de compétences et les applications installées. Vérifiez les points d’entrée détectés et les opérations prises en charge par les applications. |
| Conserver votre travail localement | Choisissez un dossier permanent de stockage des tâches, ajoutez des notes de progression et exportez un compte rendu de la conversation au format Markdown. |
| Travailler dans votre langue | Choisissez parmi neuf langues d’interface, dont l’arabe avec affichage de droite à gauche, et alternez entre les thèmes désert clair et sombre. |

<a id="install"></a>

### Installation

Ces commandes installent la version stable **v0.1.8**. Consultez la [dernière version publiée](https://github.com/shixi-11/prism-desk/releases/latest) pour connaître son numéro et lire ses notes de modification bilingues.

Vous aurez besoin de Windows, de Git, de Node.js 22.12 ou ultérieur, de npm et des CLI officiels des fournisseurs de votre choix. Connectez-vous séparément à chaque CLI.

```powershell
git clone --branch v0.1.8 https://github.com/shixi-11/prism-desk.git
cd prism-desk
npm install
npm run build
npm run build:desktop
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-host.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start.ps1
```

Le script compile l’hôte de processus Windows qui permet d’arrêter ensemble les sous-processus CLI. Il utilise le compilateur .NET Framework fourni avec Windows.

### Avant votre première tâche

Installez le CLI officiel de chaque fournisseur que vous souhaitez utiliser, puis connectez-vous par son intermédiaire. Une connexion à un site web ou à une application de bureau ne suffit pas à configurer Prism.

- **Codex :** suivez le [guide d’installation du CLI](https://developers.openai.com/codex/cli/) et connectez-vous avec votre compte ChatGPT.
- **Claude :** installez [Claude Code](https://code.claude.com/docs/en/setup), puis [connectez-vous](https://code.claude.com/docs/en/authentication) avec un abonnement Claude pris en charge. Prism vérifie la connexion à l’abonnement et les paramètres d’utilisation supplémentaire avant l’exécution ; l’utilisation supplémentaire doit être désactivée.
- **Grok :** installez le CLI officiel Grok et connectez-vous avec votre compte abonné.

Ouvrez **Comptes → Ajouter un compte**, choisissez Codex, Claude ou Grok et donnez un nom au compte. **Enregistrer et continuer → Obtenir le lien de connexion → Copier le lien de connexion** lance la procédure d’autorisation du CLI officiel. Collez le lien dans la barre d’adresse de votre navigateur. Si Claude affiche un code d’autorisation, collez le code complet dans **Code d’autorisation** et choisissez **Envoyer le code**. Le code est transmis uniquement au CLI officiel en attente, puis effacé du champ de saisie. Après votre autorisation, Prism vérifie la connexion à l’abonnement et rend le compte disponible sans redémarrage. Cette page permet également de vérifier une connexion existante, d’annuler l’autorisation ou de recopier le lien, de renommer les profils et de désactiver ou réactiver les comptes. La désactivation conserve les tâches antérieures et les identifiants de connexion. Les paramètres avancés permettent de sélectionner l’exécutable du CLI officiel ou d’importer un répertoire de connexion indépendant existant ; les répertoires de compte et les identités de plateforme déjà établis ne peuvent pas être modifiés. Si un CLI manque, un lien mène aux instructions d’installation officielles. Les futures plateformes nécessiteront leurs propres adaptateurs de fournisseur et d’exécution.

### Une tâche type

1. Cliquez sur **Nouvelle tâche** et donnez-lui un nom. Le dossier du projet est facultatif ; si vous laissez ce champ vide, un espace de travail distinct et persistant est créé pour la tâche.
2. Sélectionnez un compte d’exécution, un modèle et un effort de raisonnement. Utilisez **Lecture seule** pour une revue ou **Modifier le projet** pour effectuer des modifications.
3. Saisissez votre demande et envoyez-la avec **Ctrl + Enter**. Suivez la conversation et le journal d’exécution à mesure que le travail avance.
4. Ajoutez les décisions importantes ou le travail restant aux notes de progression. Pour changer de compte, sélectionnez le compte suivant et utilisez la commande de transfert ; arrêtez d’abord l’exécution en cours si nécessaire.
5. Renommez une tâche avec son bouton crayon, un double-clic ou **F2**. Appuyez sur **Enter** pour enregistrer ou sur **Esc** pour annuler.
6. Poursuivez dans la même tâche. Exportez son compte rendu si vous avez besoin d’une copie Markdown, ou ouvrez le dossier de stockage des tâches pour retrouver les fichiers locaux.

Le compte suivant reçoit la conversation enregistrée, les notes de progression et les enregistrements des outils. L’état interne du modèle d’un fournisseur n’est pas transféré.

### Messages, paramètres et aperçus

#### Objectifs et plans

La **barre d’objectif** compacte au-dessus de la zone de saisie affiche l’objectif enregistré, l’état de l’exécution et le temps d’exécution cumulé. Modifiez, mettez en pause, reprenez ou supprimez l’objectif depuis cette barre ; déployez-la pour voir l’objectif complet, le plan modifiable et les détails de l’exécution. La mise en pause arrête l’exécution en cours et retient les messages en file d’attente. La suppression attend l’arrêt de l’exécution, retire l’objectif et retient les messages en attente pour vérification ; les enregistrements de conversation et les fichiers de l’espace de travail restent disponibles. Le compteur exclut les pauses, les périodes d’inactivité et le temps pendant lequel l’application est fermée. L’épuisement du quota signalé officiellement est affiché séparément des problèmes de réseau ou de connexion au compte.

Codex peut enregistrer des objectifs à l’aide des outils natifs de Prism lorsque vous lui demandez d’en définir ou d’en modifier un. Les autres points d’entrée peuvent proposer un objectif que vous pouvez adopter dans l’interface. Un texte dans la conversation affirmant qu’un objectif a été enregistré ne modifie jamais, à lui seul, l’objectif réel. **Planifier d’abord** s’exécute avec des autorisations de lecture seule et renvoie une ébauche à examiner. La zone de saisie indique explicitement lorsque les messages servent uniquement à discuter d’un plan en attente ; **Confirmer le plan et exécuter** lance la mise en œuvre avec les autorisations configurées pour la tâche. Les objectifs et les plans persistent d’une session à l’autre et restent dans le dossier de transfert.

#### Modèles et transfert

Les changements de modèle peuvent être appliqués au sein du même compte avec **Changer et continuer**. Une exécution confirmée enregistre le compte, le modèle et le niveau de raisonnement utilisés ; une sélection simplement enregistrée n’est pas présentée comme un changement effectué. **Préférences de relais automatique** ouvre une liste de comptes que vous pouvez réorganiser par glisser-déposer, avec des paramètres de modèle et de niveau de raisonnement pour chaque compte. Les modifications sont enregistrées automatiquement pour la tâche en cours. La liste signale les comptes qui ne peuvent pas satisfaire les exigences d’accès en écriture de la tâche ; le transfert tient également compte de la prise en charge des images.

#### Comptes et fenêtres

Chaque fiche de compte comporte un **Alias** modifiable à l’aide d’un bouton crayon. Cela change le nom affiché, pas l’identité de connexion. Les questions natives de Codex et les messages de question avec liste pris en charge proposent des choix cliquables et une réponse personnalisée. Cliquer sur **×** dans la barre de titre Windows masque Prism dans la zone de notification ; utilisez **Quitter Prism** dans le menu de l’icône de notification pour arrêter le travail en cours et quitter l’application.

#### Organisation des tâches

Faites un clic droit sur une tâche pour la renommer, l’épingler, la marquer comme non lue, l’archiver, la regrouper par projet ou par section, la partager, la copier, créer une tâche dérivée, ouvrir son dossier ou sa conversation, ouvrir une autre fenêtre ou la supprimer. **Archivées et supprimées** dans la barre latérale permet de restaurer les tâches masquées. La suppression d’une tâche conserve son espace de travail et ses fichiers de conversation. Le choix du projet modifie l’emplacement des travaux futurs ; les fichiers existants restent dans leur dossier d’origine. La création d’une tâche dérivée démarre de nouvelles sessions CLI et copie les pièces jointes de la conversation ; l’option d’espace de travail distinct démarre avec un dossier vide. Le partage affiche l’aperçu d’un document Markdown local à copier ou à enregistrer ; il ne crée pas de lien public hébergé. Les modifications des tâches sont synchronisées entre les fenêtres ouvertes.

#### Affichage et quota

La barre supérieure contient les paramètres d’affichage ainsi que les commandes permettant d’afficher ou de masquer le journal d’exécution inférieur et la barre latérale des comptes. Leur état est enregistré localement. Dans Comptes, **Vérifier tous les comptes** interroge chaque profil configuré et affiche le quota disponible, les heures de réinitialisation, les crédits de réinitialisation Codex et leurs dates d’expiration. L’échec d’une requête n’interrompt pas la vérification des autres comptes.

#### Images

Collez des captures d’écran, déposez des images dans la zone de saisie ou utilisez le bouton d’image (jusqu’à cinq images de 10 Mo chacune). Codex reçoit les images locales ; Claude reçoit du contenu image natif lorsque les vérifications de son abonnement réussissent. L’exécution avec des images sur Claude n’a pas encore été vérifiée avec un compte connecté. Grok utilise directement le contenu image lorsque le CLI annonce cette prise en charge ; sinon, son outil natif Read ouvre les images jointes. Cette méthode a été vérifiée avec un compte connecté disposant d’un abonnement.

#### Messages et brouillons

Vous pouvez envoyer d’autres messages pendant l’exécution : ils attendent dans l’ordre et peuvent être annulés. Les paramètres permettent de choisir Enter ou Ctrl/⌘+Enter, ainsi que la mise en file d’attente ou les instructions en direct. Les instructions en direct utilisent le tour actif de Codex ; les autres fournisseurs recourent à la file d’attente. Les envois échoués ou interrompus retiennent les messages suivants pour vérification. Les brouillons sont conservés lorsque vous changez de tâche dans l’application ouverte.

#### Aperçus de fichiers

Ouvrez le panneau d’aperçu ou cliquez sur un lien de fichier pour afficher des images, des PDF, du Markdown, du code et du texte. Les fichiers texte peuvent être modifiés et enregistrés ; les modifications externes sont vérifiées avant l’enregistrement. Les aperçus HTML affichent des pages autonomes ; les projets interactifs peuvent utiliser l’adresse HTTP à laquelle ils s’exécutent. Certains sites web bloquent l’intégration. Le panneau d’activité affiche les résumés de raisonnement, les plans et l’état d’exécution fournis par le CLI lorsqu’ils sont disponibles.

### Mises à jour automatiques

1. **Rechercher des mises à jour** indique « Mise à jour disponible » ou « Vous êtes à jour ». Cette action ne télécharge rien et ne redémarre pas l’application.
2. **Télécharger et préparer** indique « La mise à jour est prête » lorsque la préparation est terminée. Vous pouvez continuer à utiliser la version actuelle.
3. **Mettre à jour et redémarrer** ne redémarre l’application qu’après votre clic. Une fois la nouvelle version démarrée avec succès, « Mise à jour vers vX.X.X effectuée » s’affiche une seule fois. Les lancements ordinaires et les retours à une version antérieure n’affichent pas ce message de réussite.

**Rechercher des mises à jour** dans la barre latérale suit les versions stables publiées sur [GitHub Releases](https://github.com/shixi-11/prism-desk/releases). Cette fonction affiche la version installée, la version disponible et les notes de modification avant tout téléchargement. Choisissez **Plus tard** pour continuer à utiliser votre version actuelle. Les commits ordinaires de la branche principale ne déclenchent pas de notification de mise à jour. La recherche automatique est activée par défaut : Prism vérifie après le démarrage, puis toutes les quatre heures. Un point bleu fixe à côté de Rechercher des mises à jour et une icône de mise à jour dans la barre supérieure indiquent qu’une version est disponible. La recherche ne télécharge rien, n’installe rien et ne redémarre pas l’application. Choisissez **Télécharger et préparer**, puis **Mettre à jour et redémarrer** au moment qui vous convient. Le point reste affiché jusqu’à ce que la révision installée soit à jour. Les brouillons de chaque fenêtre sont enregistrés avant le redémarrage ; les tâches, les messages en file d’attente, les opérations sur les comptes, les boîtes de dialogue de modification et les aperçus bloquent le redémarrage jusqu’à leur achèvement ou leur fermeture.

Les mises à jour conservent la même configuration des comptes, le même stockage des tâches et le même répertoire de données utilisateur. La copie de travail d’origine et l’installation précédente restent disponibles. Un échec de téléchargement ou de compilation laisse la version en cours d’exécution intacte ; si la nouvelle application ne termine pas son démarrage, rouvrir Prism restaure la version précédente. Les modifications locales du code source bloquent les mises à jour, et la préparation nécessite au moins 2 Go d’espace libre. Git doit rester installé ; la compilation de bureau inclut l’environnement d’exécution Node et npm nécessaires aux futures compilations. Les installations antérieures à ce mécanisme de mise à jour nécessitent une récupération manuelle des modifications et une recompilation à l’aide des commandes d’installation ci-dessus, une seule fois.

### Jour et nuit

Passez du thème clair au thème sombre depuis la barre supérieure.

| Jour | Nuit |
| --- | --- |
| ![Illustration du thème de jour](src/assets/desert-day.jpg) | ![Illustration du thème de nuit](src/assets/desert-night.jpg) |

*Illustrations des thèmes utilisées par l’application.*

### Configuration

La plupart des utilisateurs peuvent connecter leurs comptes dans **Comptes → Ajouter un compte**. Le fichier de configuration ci-dessous constitue une alternative avancée. Sauvegardez tout fichier existant avant de copier l’exemple.

```powershell
New-Item -ItemType Directory -Force .local
Copy-Item config.example.json .local/config.json
```

Adaptez `.local/config.json` à votre ordinateur. Vous pouvez également définir `PRISM_CONFIG` sur le chemin absolu d’un fichier de configuration.

Voici une configuration pour un seul compte. Remplacez le répertoire de connexion de l’exemple par le vôtre et choisissez un modèle disponible pour votre compte. Ajouter des entrées à `profiles` ajoute des comptes d’exécution.

```json
{
  "profiles": [
    {
      "id": "codex-personal-1",
      "provider": "Codex",
      "name": "Personal 1",
      "home": "C:/PrismAccounts/codex-personal-1",
      "executable": "codex.exe",
      "model": "gpt-5.6-sol",
      "write": true
    }
  ]
}
```

| Champ | Rôle |
| --- | --- |
| `profiles` | Comptes d’exécution : identifiant, fournisseur, nom affiché, répertoire de connexion, exécutable, modèle et autorisation d’écriture |
| `storageRoot` | Emplacement permanent des enregistrements de tâches |
| `assistant.path` | Répertoire facultatif de l’assistant contenant `SKILL.md` |
| `assistant.instructions` | Instructions facultatives partagées entre les tâches |
| `skillsPath` | Répertoire partagé des compétences |
| `apps` | Noms d’applications associés à des chemins d’exécutables ou de fichiers d’entrée |

Utilisez des chemins absolus pour les ressources locales et un répertoire de connexion distinct pour chaque compte. Conservez des identifiants de profil stables : les tâches existantes les utilisent pour identifier les comptes. La structure des profils par défaut est définie dans [electron/config.cjs](electron/config.cjs).

Les tâches sont stockées dans le répertoire de données utilisateur de l’application, sauf si `storageRoot` est défini. Les identifiants de connexion restent dans le répertoire propre au fournisseur. La configuration locale, les enregistrements de tâches et les journaux sont exclus de Git.

### Autorisations sur les fichiers et les commandes

Choisissez **Lecture seule**, **Modifier le projet** ou **Accès complet** dans la zone de saisie. L’accès complet est disponible pour Codex, Claude et Grok : il autorise l’accès aux fichiers situés hors du projet et approuve automatiquement l’exécution des outils, dans les limites des autorisations du système d’exploitation. Les modifications de ces paramètres effectuées pendant une exécution sont mises en attente pour la suivante. Les nouvelles installations utilisent par défaut Modifier le projet pour les comptes pris en charge. Choisissez **Définir par défaut pour les nouvelles tâches** pour enregistrer une préférence ; les tâches existantes conservent leurs propres autorisations. Les adaptateurs en lecture seule restent en lecture seule.

### Comptes et outils locaux

Les adaptateurs Codex, Claude et Grok prennent en charge les tâches de modification de fichiers. Grok respecte les autorisations sélectionnées pour la tâche : Lecture seule désactive les outils de modification et de shell ; Modifier le projet utilise le profil d’espace de travail du CLI et les confirmations d’opérations ; Accès complet autorise l’exécution des outils. Les profils existants comportant `write: false` restent en lecture seule jusqu’à l’activation explicite de l’écriture. Les modèles disponibles dépendent du CLI installé et du compte sélectionné.

Le panneau de quota affiche les informations renvoyées par le fournisseur. Pour les périodes unifiées Grok valides, les valeurs d’utilisation nulle omises sont interprétées comme dans le client officiel ; les réponses vides, mal formées ou expirées restent indéterminées. Les requêtes Claude sont réessayées une fois après un problème de connexion passager ou une réponse d’utilisation manquante, mais jamais après un échec d’authentification. Les erreurs d’authentification ou de réseau ne déclenchent pas de changement de compte comme si le quota était épuisé. Le transfert automatique nécessite une réponse reconnue d’épuisement du quota et la fin de l’exécution précédente.

Les adresses e-mail des comptes sont masquées par défaut ; utilisez le bouton en forme d’œil pour les afficher ou les masquer. L’historique des vérifications reste sur cet appareil. Après un redémarrage, les enregistrements conservent leur date et leur heure d’origine et sont marqués comme devant être actualisés. Les relevés historiques n’autorisent jamais l’exécution ni l’utilisation de crédits de réinitialisation.

Prism ne bascule pas vers une facturation par clé API et n’achète pas de crédits. L’exécution avec Claude et Grok nécessite la confirmation que la facturation supplémentaire est désactivée. L’utilisation d’un crédit de réinitialisation Codex existant nécessite une confirmation distincte pour le compte sélectionné. Vous pouvez utiliser un crédit de réinitialisation pendant une tâche ; celle-ci continue de s’exécuter. La confirmation et la protection contre les demandes en double restent en place. Un tour déjà terminé ne redémarre pas automatiquement.

Les fichiers de l’assistant et les compétences peuvent être partagés entre les comptes. Les autorisations MCP et les connexions aux applications doivent être configurées pour chaque environnement d’exécution. La détection des applications répertorie les points d’entrée installés ; l’action de vérification contrôle séparément les opérations prises en charge.

Dans **Capacités partagées**, choisissez **Vérifier les capacités partagées → Synchroniser les sources locales** pour comparer les fichiers d’entrée des compétences locales et leurs chemins à la dernière synchronisation. Les compétences système et les dossiers ajoutés sont intégrés à l’index partagé après synchronisation. Dans **Sources et connexions**, utilisez **Connecter les références de compétences** pour chaque plugin à consulter. Le tour suivant de la tâche reçoit l’index des références ; les fichiers d’origine restent à leur emplacement.

La liste des plugins affiche la version reconnue la plus récente de chaque cache local, qui peut contenir des paquets désinstallés. Elle ne confirme ni la dernière version publiée en ligne ni l’autorisation des outils. Mettez les plugins à jour dans leur application d’origine, puis relancez la vérification. Les connexions MCP de Codex doivent être configurées et vérifiées séparément dans la CLI indépendante de chaque compte. Les canaux d’exécution actuels de Claude, Grok et Gemini n’activent pas les MCP externes ; connecter les références de compétences ne modifie pas cette limitation.

### Développement

```powershell
npm test
npm run build
npm run build:desktop
```

Les tests unitaires utilisent des données de test de comptes isolées. Les vérifications facultatives de l’application de bureau et des CLI en conditions réelles sont décrites dans [scripts/README.md](scripts/README.md) ; les vérifications en conditions réelles nécessitent des comptes de test et peuvent consommer le quota de l’abonnement.

Pour signaler un problème, indiquez les versions de l’application et du CLI, les étapes de reproduction et un message d’erreur expurgé des informations sensibles. Retirez les identifiants de connexion, les détails des comptes et le contenu privé des conversations avant de publier.

### Règles de publication pour les contributeurs

Avant toute publication, lisez [AGENTS.md](AGENTS.md) et [RELEASING.md](RELEASING.md). Chaque version du logiciel nécessite un nouveau numéro de version, une seule étiquette immuable et des notes complètes en anglais et en chinois simplifié. Exécutez `npm run release:check` ainsi que les vérifications requises pour la modification. Les modifications portant uniquement sur la documentation ne nécessitent pas de nouvelle version du logiciel.

### Licence

[MIT](LICENSE). Prism Desk est un projet indépendant. Les noms et marques des fournisseurs appartiennent à leurs propriétaires respectifs.
