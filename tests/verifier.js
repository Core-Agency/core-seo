/* =====================================================================
   CORE — SEO : harnais de vérification

       node tests/verifier.js

   Ce qui est contrôlé ici : que le JSON-LD produit soit du JSON valide
   et conforme à ce que schema.org attend, que les numéros de téléphone
   soient normalisés, que le HTML produit ne puisse pas être détourné par
   une saisie, et surtout que les contrôles de la fiche se déclenchent
   quand il faut.

   Ce qui NE PEUT PAS être contrôlé ici : qu'un moteur de recherche
   affiche effectivement un résultat enrichi. Cela ne dépend pas de nous.
   ===================================================================== */

"use strict";

const CoreSEO = require("../js/balises.js");

let reussis = 0, echecs = 0;
const details = [];

function verifie(nom, obtenu, attendu) {
  const a = JSON.stringify(attendu), o = JSON.stringify(obtenu);
  if (a === o) { reussis++; return true; }
  echecs++;
  details.push(`  ✗ ${nom}\n      attendu ${a}\n      obtenu  ${o}`);
  return false;
}

function verifieQue(nom, condition) {
  if (condition) { reussis++; return true; }
  echecs++;
  details.push(`  ✗ ${nom}`);
  return false;
}

/* --- Une fiche complète, qui sert de référence ---------------------- */

const FICHE = {
  nom: "Crêperie Vanilla",
  type: "CafeOrCoffeeShop",
  accroche: "crêpes et gaufres à composer",
  description: "La Crêperie Vanilla compose crêpes, gaufres et brioches perdues à la carte, avenue de Philippeville à Marcinelle.",
  site: "https://vanilla-creperie.pages.dev",
  image: "https://vanilla-creperie.pages.dev/img/partage.jpg",
  rue: "Avenue de Philippeville 161",
  codePostal: "6001",
  ville: "Marcinelle",
  province: "Hainaut",
  telephone: "071 00 00 00",
  courriel: "bonjour@exemple.be",
  gamme: "€€",
  cuisine: "Crêperie, Gaufres",
  bce: "0666.541.042",
  reseaux: ["https://www.facebook.com/exemple", "https://www.instagram.com/exemple"],
  horaires: {
    lu: { ferme: true },
    ma: { plages: [{ de: "11:30", a: "14:30" }, { de: "18:00", a: "21:30" }] },
    me: { plages: [{ de: "11:30", a: "14:30" }, { de: "18:00", a: "21:30" }] },
    je: { plages: [{ de: "11:30", a: "14:30" }, { de: "18:00", a: "21:30" }] },
    ve: { plages: [{ de: "11:30", a: "22:00" }] },
    sa: { plages: [{ de: "11:30", a: "22:00" }] },
    di: { plages: [{ de: "12:00", a: "21:00" }] },
  },
};

/* ==================================================================== */

console.log("1. Titre");
verifie("titre composé", CoreSEO.baliseTitre(FICHE),
  "Crêperie Vanilla — crêpes et gaufres à composer | Marcinelle");
// La ville n'est pas ajoutée deux fois si elle est déjà dans l'accroche.
verifie("ville déjà présente", CoreSEO.baliseTitre({ nom: "A", accroche: "à Marcinelle", ville: "Marcinelle" }),
  "A — à Marcinelle");
verifie("sans nom, pas de titre", CoreSEO.baliseTitre({ ville: "Charleroi" }), "");

console.log("2. Largeur en pixels");
verifieQue("les i sont plus étroits que les W",
  CoreSEO.largeurPixels("iiiiiiiiii") < CoreSEO.largeurPixels("WWWWWWWWWW"));
verifieQue("un titre vide mesure zéro", CoreSEO.largeurPixels("") === 0);
verifieQue("un titre très long dépasse la limite",
  CoreSEO.largeurPixels("Restaurant".repeat(10)) > CoreSEO.LIMITE_TITRE);

console.log("3. Téléphone");
verifie("national belge", CoreSEO.telephoneE164("071 00 00 00"), "+3271000000");
verifie("déjà international", CoreSEO.telephoneE164("+32 71 00 00 00"), "+3271000000");
verifie("préfixe 00", CoreSEO.telephoneE164("0032 71 00 00 00"), "+3271000000");
verifie("mobile avec séparateurs", CoreSEO.telephoneE164("0470/12.34.56"), "+32470123456");
verifie("vide", CoreSEO.telephoneE164(""), "");
// Le zéro national ne doit pas se retrouver derrière l'indicatif.
verifieQue("pas de +320", CoreSEO.telephoneE164("071000000").indexOf("+320") === -1);

console.log("4. Données structurées");
const ld = CoreSEO.donneesStructurees(FICHE);
verifie("contexte", ld["@context"], "https://schema.org");
verifie("type", ld["@type"], "CafeOrCoffeeShop");
verifie("pays", ld.address.addressCountry, "BE");
verifie("code postal", ld.address.postalCode, "6001");
verifie("téléphone normalisé", ld.telephone, "+3271000000");
verifie("cuisine découpée", ld.servesCuisine, ["Crêperie", "Gaufres"]);
verifie("réseaux", ld.sameAs.length, 2);
verifie("identifiant BCE", ld.identifier.value, "0666.541.042");
// Mardi, mercredi et jeudi ont deux services ; vendredi, samedi et
// dimanche un seul ; lundi est fermé. Soit 6 + 3 = 9 entrées.
verifie("plages d'ouverture", ld.openingHoursSpecification.length, 9);
verifie("jour en URL schema.org", ld.openingHoursSpecification[0].dayOfWeek,
  "https://schema.org/Tuesday");
verifieQue("le lundi fermé n'apparaît pas",
  !ld.openingHoursSpecification.some(h => h.dayOfWeek.endsWith("Monday")));
verifieQue("le JSON-LD est sérialisable", (() => {
  try { JSON.parse(JSON.stringify(ld)); return true; } catch { return false; }
})());

console.log("5. Aucune note inventée");
// C'est une règle de la maison, pas une préférence : une note doit venir
// d'avis réels. Si ce contrôle tombe un jour, c'est que quelqu'un a
// ajouté ce qu'il ne fallait pas.
const texteLd = JSON.stringify(CoreSEO.donneesStructurees(
  Object.assign({}, FICHE, { note: 4.8, avis: 127, aggregateRating: 5 })));
verifieQue("pas d'aggregateRating", texteLd.indexOf("aggregateRating") === -1);
verifieQue("pas de ratingValue", texteLd.indexOf("ratingValue") === -1);
verifieQue("pas de reviewCount", texteLd.indexOf("reviewCount") === -1);
verifieQue("pas de Review", texteLd.indexOf('"Review"') === -1);

console.log("6. Le HTML produit ne se laisse pas détourner");
const piege = CoreSEO.metaHtml(Object.assign({}, FICHE, {
  nom: 'Chez "Guillemet" <script>alert(1)</script>',
  description: "Une description & un esperluette",
}));
verifieQue("pas de balise script injectée par le nom",
  piege.indexOf("<script>alert") === -1);
// Le piège du JSON-LD : un </script> dans une valeur refermerait le bloc.
verifieQue("le chevron du JSON-LD est neutralisé",
  piege.indexOf("\\u003c/script\\u003e") !== -1);
verifieQue("le JSON-LD reste du JSON valide", (() => {
  const brut = piege.slice(piege.indexOf("{"), piege.lastIndexOf("}") + 1);
  try { return JSON.parse(brut)["@type"] === "CafeOrCoffeeShop"; } catch { return false; }
})());
verifieQue("les guillemets sont échappés", piege.indexOf('&quot;Guillemet&quot;') !== -1);
verifieQue("l'esperluette est échappée", piege.indexOf("&amp; un esperluette") !== -1);
// Le seul <script> attendu est celui du JSON-LD.
verifie("un seul bloc script", (piege.match(/<script/g) || []).length, 1);

console.log("7. Contrôles de la fiche");
const parChamp = f => {
  const m = {};
  CoreSEO.controles(f).forEach(c => { m[c.champ] = c.gravite; });
  return m;
};
const complete = parChamp(FICHE);
verifieQue("une fiche complète ne bloque rien",
  !Object.values(complete).includes("bloquant"));

const vide = parChamp({});
verifie("nom manquant", vide.nom, "bloquant");
verifie("ville manquante", vide.ville, "important");
verifie("horaires manquants", vide.horaires, "important");
verifie("image manquante", vide.image, "important");

verifie("site en http", parChamp({ nom: "A", site: "http://exemple.be" }).site, "bloquant");
verifie("heure mal écrite",
  parChamp({ nom: "A", horaires: { lu: { plages: [{ de: "25:00", a: "26:00" }] } } }).horaires,
  "bloquant");
verifieQue("titre trop long signalé",
  CoreSEO.controles({ nom: "Restaurant".repeat(10), ville: "Charleroi" })
    .some(c => c.champ === "titre" && c.gravite === "important"));
verifie("BCE à neuf chiffres", parChamp({ nom: "A", bce: "066654104" }).bce, "remarque");

console.log("8. Regroupement des horaires");
const groupes = CoreSEO.horairesGroupes(FICHE.horaires);
// lundi seul ; mardi-mercredi-jeudi ; vendredi-samedi ; dimanche seul.
verifie("quatre groupes", groupes.length, 4);
verifie("mardi à jeudi groupés", groupes[1].jours.map(j => j.cle), ["ma", "me", "je"]);
verifie("vendredi et samedi groupés", groupes[2].jours.map(j => j.cle), ["ve", "sa"]);
verifie("lundi seul et fermé", groupes[0].plages.length, 0);

/* ==================================================================== */

console.log("");
if (echecs) {
  console.log(details.join("\n"));
  console.log(`\n✗ ${echecs} échec(s), ${reussis} contrôle(s) réussi(s).`);
  process.exit(1);
}
console.log(`✓ ${reussis} contrôles réussis.`);
