<div align="center">

<img src="img/core-mark-192.png" width="72" height="72" alt="Marque de Core">

# Core — SEO

**Un outil [Core](https://core-agency.be), agence digitale à Charleroi**

**Les balises et les données structurées d'un commerce belge, avec l'aperçu du résultat.**

[![Essayer](https://img.shields.io/badge/Essayer%20maintenant-6355E0?style=for-the-badge&logoColor=white)](https://core-agency.github.io/core-seo/)

![Licence](https://img.shields.io/badge/licence-MIT-1A1A1A?style=for-the-badge&labelColor=1A1A1A)
![Dépendances](https://img.shields.io/badge/dépendances-aucune-1A1A1A?style=for-the-badge&labelColor=1A1A1A)
![Hors ligne](https://img.shields.io/badge/fonctionne%20hors%20ligne-oui-1A1A1A?style=for-the-badge&labelColor=1A1A1A)
![Contrôles](https://img.shields.io/badge/contrôles%20automatisés-47-1A1A1A?style=for-the-badge&labelColor=1A1A1A)

**[core-agency.github.io/core-seo](https://core-agency.github.io/core-seo/)**

</div>

---

## Ce que ça fait

| | |
|---|---|
| **Titre et description** | Mesurés **en pixels**, pas en caractères — c'est ainsi que Google coupe |
| **Aperçu du résultat** | Ce que verra quelqu'un qui cherche votre commerce |
| **Aperçu du partage** | Ce que verra quelqu'un à qui on envoie le lien sur WhatsApp |
| **Horaires à deux services** | Le midi et le soir ne se saisissent pas d'un seul trait |
| **JSON-LD schema.org** | `LocalBusiness` et ses treize déclinaisons, adresse belge, `openingHoursSpecification`, numéro d'entreprise |
| **Ce qui manque** | Une liste ordonnée par gravité, avec ce que chaque oubli coûte |

Rien ne sort de la machine : ni l'adresse de votre commerce, ni votre
téléphone, ni vos horaires.

## Ce que cet outil refuse de faire

**Il ne produit aucune note et aucun avis.** C'est le raccourci le plus
courant de ce genre d'outil : un `aggregateRating` à « 4,8 sur 127 avis »
glissé dans le balisage, et le résultat s'orne d'étoiles que personne n'a
données.

C'est un mensonge envers le client final. C'est aussi contraire aux règles de
Google, qui exige que toute note balisée provienne d'avis réels et **visibles
sur la page**. Le balisage inventé fait au mieux ignorer les données
structurées, au pire sanctionner le site.

Un contrôle automatisé vérifie qu'aucun `aggregateRating`, `ratingValue`,
`reviewCount` ni `Review` ne peut apparaître dans la sortie. Si ce contrôle
tombe un jour, c'est que quelqu'un a ajouté ce qu'il ne fallait pas.

Les avis s'obtiennent : reliez votre fiche Google, et demandez-les.

## Ce qui rend ces balises justes

**Le titre se mesure en pixels.** Google ne coupe pas à 60 caractères mais
vers 600 pixels. « Illimité » et « WWWWWWWWW » font neuf signes et n'occupent
pas la même place. Dans le navigateur, la mesure est faite par le moteur de
rendu avec la police des résultats ; ailleurs, une table de largeurs relevées
sur Arial 20 px prend le relais.

**Le JSON-LD est échappé pour vivre dans un `<script>`.** `JSON.stringify`
n'échappe pas les chevrons : un établissement nommé « Chez `</script>` »
refermerait le bloc, et tout ce qui suit deviendrait du HTML exécutable. Les
chevrons, l'esperluette et les séparateurs U+2028 / U+2029 partent donc en
séquences `\u`, que le parseur JSON relit à l'identique. Un contrôle tente
précisément cette injection.

**Le téléphone est normalisé en E.164.** `071 00 00 00` devient
`+3271000000` — sans doubler le zéro national derrière l'indicatif, qui est
l'erreur classique.

**Les jours qui se ressemblent sont regroupés.** Mardi, mercredi et jeudi aux
mêmes heures forment un seul groupe, pour que le résumé se lise comme on le
dirait à l'oral.

## Vérifié

```
node tests/verifier.js
```

**47 contrôles.** Le titre et son assemblage, la normalisation des téléphones,
la forme du JSON-LD, le regroupement des horaires, le déclenchement de chaque
contrôle de fiche, l'échappement du HTML — et l'absence de toute note
inventée.

## Ce que cet outil ne peut pas savoir

**Il ne fait pas monter un site.** Des données structurées justes permettent au
moteur de comprendre ce qu'il a sous les yeux ; elles ne sont pas un levier de
classement. Ce qui fait monter un commerce, c'est d'être réellement le
commerce que les gens cherchent.

**Il ne garantit aucun résultat enrichi.** Google décide seul d'afficher ou
non les horaires, la note ou le fil d'Ariane. Un balisage valide est une
condition, pas une promesse.

**Il ne vérifie pas que le balisage correspond à la page.** Déclarer des
horaires que la page ne montre pas est la meilleure façon de se faire ignorer.
Une fois en ligne, passez la page au
[validateur de schema.org](https://validator.schema.org/) puis au
[test des résultats enrichis](https://search.google.com/test/rich-results) :
ce sont eux qui font foi.

**Il ne connaît que la Belgique.** Le pays est fixé à `BE`, les téléphones
sont normalisés avec l'indicatif `+32`, et le numéro d'entreprise est balisé
en BCE.

## Utiliser

Téléchargez le dossier et ouvrez `index.html`. Aucune compilation, aucun
gestionnaire de paquets.

La fabrique s'utilise aussi seule :

```js
const CoreSEO = require('./js/balises.js');

const fiche = {
  nom: 'Crêperie Vanilla', type: 'CafeOrCoffeeShop',
  accroche: 'crêpes et gaufres à composer', ville: 'Marcinelle',
  rue: 'Avenue de Philippeville 161', codePostal: '6001',
  telephone: '071 00 00 00', site: 'https://exemple.be',
  horaires: { ma: { plages: [{ de: '11:30', a: '14:30' }] } },
};

CoreSEO.baliseTitre(fiche);        // 'Crêperie Vanilla — crêpes … | Marcinelle'
CoreSEO.metaHtml(fiche);           // le bloc <head> complet
CoreSEO.donneesStructurees(fiche); // l'objet JSON-LD
CoreSEO.controles(fiche);          // [{ gravite, champ, texte }, …]
```

## Structure

```
index.html            l'atelier
css/balises.css       charte Core : violet, lavande, Lexend Deca
js/balises.js         la fabrique — autonome, réutilisable seule
js/atelier.js         l'interface, les aperçus, les mesures exactes
tests/verifier.js     le harnais
fonts/                Lexend Deca et JetBrains Mono, sous licence OFL
```

## Licence

MIT — voir [LICENSE](LICENSE).

---

<div align="center">

Construit par [Core](https://core-agency.be), agence digitale à Charleroi.

</div>
