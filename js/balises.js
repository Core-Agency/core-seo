/* =====================================================================
   CORE — SEO : la fabrique de balises

   Construit le <title>, la description, les balises de partage et le
   JSON-LD d'un commerce belge. Aucune dépendance, aucun appel réseau.

   CoreSEO.baliseTitre(fiche)      -> chaîne
   CoreSEO.metaHtml(fiche)         -> le bloc <head> complet
   CoreSEO.donneesStructurees(f)   -> l'objet JSON-LD
   CoreSEO.controles(fiche)        -> [{ gravite, champ, texte }]
   CoreSEO.largeurPixels(texte)    -> largeur estimée en pixels

   ⚠️ Cet outil ne produit AUCUNE note ni AUCUN avis. Voir plus bas.
   ===================================================================== */

(function (racine, fabrique) {
  const api = fabrique();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else racine.CoreSEO = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* ------------------------------------------------------------------
     TYPES D'ÉTABLISSEMENT

     schema.org distingue finement. Un mauvais type n'est pas une faute
     grave, mais un type précis ouvre des présentations que
     `LocalBusiness` seul n'obtient pas — les horaires et la gamme de
     prix d'un `Restaurant`, par exemple.
     ------------------------------------------------------------------ */

  const TYPES = [
    { valeur: "Restaurant", nom: "Restaurant", cuisine: true },
    { valeur: "FastFoodRestaurant", nom: "Restauration rapide", cuisine: true },
    { valeur: "CafeOrCoffeeShop", nom: "Café, salon de thé", cuisine: true },
    { valeur: "BarOrPub", nom: "Bar, brasserie", cuisine: true },
    { valeur: "Bakery", nom: "Boulangerie, pâtisserie", cuisine: false },
    { valeur: "IceCreamShop", nom: "Glacier", cuisine: false },
    { valeur: "HealthClub", nom: "Salle de sport", cuisine: false },
    { valeur: "SportsClub", nom: "Club sportif", cuisine: false },
    { valeur: "HairSalon", nom: "Coiffeur", cuisine: false },
    { valeur: "BeautySalon", nom: "Institut de beauté", cuisine: false },
    { valeur: "Store", nom: "Commerce, boutique", cuisine: false },
    { valeur: "ProfessionalService", nom: "Service professionnel", cuisine: false },
    { valeur: "LocalBusiness", nom: "Autre commerce local", cuisine: false },
  ];

  const JOURS = [
    { cle: "lu", nom: "Lundi", schema: "Monday" },
    { cle: "ma", nom: "Mardi", schema: "Tuesday" },
    { cle: "me", nom: "Mercredi", schema: "Wednesday" },
    { cle: "je", nom: "Jeudi", schema: "Thursday" },
    { cle: "ve", nom: "Vendredi", schema: "Friday" },
    { cle: "sa", nom: "Samedi", schema: "Saturday" },
    { cle: "di", nom: "Dimanche", schema: "Sunday" },
  ];

  /* ------------------------------------------------------------------
     LARGEUR EN PIXELS

     Google ne coupe pas les titres à un nombre de caractères mais à une
     largeur : environ 600 px sur ordinateur. « Illimité » et « WWWWWWWWW »
     font neuf signes et n'occupent pas la même place. Le navigateur sait
     mesurer exactement ; ailleurs, on se rabat sur une table de largeurs
     relevées sur Arial 20 px, la police des résultats.
     ------------------------------------------------------------------ */

  const LARGEURS = {
    // Les signes les plus fréquents, relevés sur Arial 20 px.
    " ": 5.6, "!": 5.6, '"': 7.1, "'": 3.8, "(": 6.7, ")": 6.7, ",": 5.6,
    "-": 6.7, ".": 5.6, "/": 5.6, ":": 5.6, ";": 5.6, "?": 11.1, "|": 5.2,
    i: 4.4, j: 4.4, l: 4.4, I: 4.4, f: 5.6, t: 5.6, r: 6.7, "1": 11.1,
    m: 16.7, w: 14.4, M: 16.7, W: 15.6, "—": 20, "’": 3.8, "&": 13.3,
  };
  const LARGEUR_DEFAUT = 11.1;   // la plupart des minuscules et des chiffres
  const LARGEUR_MAJ = 13.3;

  function largeurPixels(texte) {
    let total = 0;
    for (const c of String(texte || "")) {
      if (Object.prototype.hasOwnProperty.call(LARGEURS, c)) total += LARGEURS[c];
      else if (c >= "A" && c <= "Z") total += LARGEUR_MAJ;
      else total += LARGEUR_DEFAUT;
    }
    return Math.round(total);
  }

  // Seuils de coupure observés dans les résultats de recherche.
  const LIMITE_TITRE = 600;
  const LIMITE_DESCRIPTION = 960;

  /* ------------------------------------------------------------------
     OUTILS
     ------------------------------------------------------------------ */

  const propre = v => String(v == null ? "" : v).replace(/\s+/g, " ").trim();

  function echappeHtml(s) {
    return String(s).replace(/[&<>"]/g, c =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }

  /** Numéro belge en E.164 : c'est la forme que schema.org attend. */
  function telephoneE164(brut) {
    const chiffres = String(brut || "").replace(/[^\d+]/g, "");
    if (!chiffres) return "";
    if (chiffres.startsWith("+")) return chiffres;
    if (chiffres.startsWith("00")) return "+" + chiffres.slice(2);
    // Un numéro belge saisi en national commence par 0 : on le remplace
    // par l'indicatif, sans le doubler.
    if (chiffres.startsWith("0")) return "+32" + chiffres.slice(1);
    return "+32" + chiffres;
  }

  const HEURE = /^([01]?\d|2[0-3]):([0-5]\d)$/;
  const heureValide = h => HEURE.test(String(h || "").trim());

  /* ------------------------------------------------------------------
     TITRE ET DESCRIPTION
     ------------------------------------------------------------------ */

  /**
   * « Nom — ce qu'on y fait | Ville ». La ville dans le titre n'est pas
   * décorative : c'est ce qui rattache la page à une recherche locale.
   */
  function baliseTitre(fiche) {
    const nom = propre(fiche.nom);
    const accroche = propre(fiche.accroche);
    const ville = propre(fiche.ville);
    if (!nom) return "";
    let titre = nom;
    if (accroche) titre += " — " + accroche;
    if (ville && !titre.toLowerCase().includes(ville.toLowerCase())) titre += " | " + ville;
    return titre;
  }

  /* ------------------------------------------------------------------
     DONNÉES STRUCTURÉES
     ------------------------------------------------------------------ */

  function horairesSchema(horaires) {
    const sortie = [];
    JOURS.forEach(jour => {
      const j = (horaires || {})[jour.cle];
      if (!j || j.ferme) return;
      (j.plages || []).forEach(plage => {
        if (!heureValide(plage.de) || !heureValide(plage.a)) return;
        sortie.push({
          "@type": "OpeningHoursSpecification",
          dayOfWeek: "https://schema.org/" + jour.schema,
          opens: plage.de,
          closes: plage.a,
        });
      });
    });
    return sortie;
  }

  /**
   * Regroupe les jours qui partagent exactement les mêmes plages, pour
   * que le JSON-LD soit lisible par un humain autant que par un robot.
   */
  function horairesGroupes(horaires) {
    const groupes = [];
    JOURS.forEach(jour => {
      const j = (horaires || {})[jour.cle];
      const plages = (!j || j.ferme) ? [] : (j.plages || [])
        .filter(p => heureValide(p.de) && heureValide(p.a));
      const signature = JSON.stringify(plages);
      const dernier = groupes[groupes.length - 1];
      if (dernier && dernier.signature === signature) dernier.jours.push(jour);
      else groupes.push({ signature, plages, jours: [jour] });
    });
    return groupes;
  }

  function donneesStructurees(fiche) {
    const nom = propre(fiche.nom);
    const objet = {
      "@context": "https://schema.org",
      "@type": fiche.type || "LocalBusiness",
      name: nom,
    };

    const description = propre(fiche.description);
    if (description) objet.description = description;
    if (propre(fiche.site)) {
      objet["@id"] = propre(fiche.site).replace(/\/$/, "") + "/#etablissement";
      objet.url = propre(fiche.site);
    }
    if (propre(fiche.image)) objet.image = propre(fiche.image);

    const tel = telephoneE164(fiche.telephone);
    if (tel) objet.telephone = tel;
    if (propre(fiche.courriel)) objet.email = propre(fiche.courriel);

    if (propre(fiche.rue) || propre(fiche.ville)) {
      objet.address = {
        "@type": "PostalAddress",
        streetAddress: propre(fiche.rue),
        postalCode: propre(fiche.codePostal),
        addressLocality: propre(fiche.ville),
        addressCountry: "BE",
      };
      if (propre(fiche.province)) objet.address.addressRegion = propre(fiche.province);
    }

    if (fiche.latitude && fiche.longitude) {
      objet.geo = {
        "@type": "GeoCoordinates",
        latitude: Number(fiche.latitude),
        longitude: Number(fiche.longitude),
      };
    }

    const horaires = horairesSchema(fiche.horaires);
    if (horaires.length) objet.openingHoursSpecification = horaires;

    if (propre(fiche.gamme)) objet.priceRange = propre(fiche.gamme);
    if (propre(fiche.monnaie)) objet.currenciesAccepted = propre(fiche.monnaie);

    const cuisine = propre(fiche.cuisine);
    if (cuisine && estRestauration(fiche.type)) {
      objet.servesCuisine = cuisine.split(",").map(propre).filter(Boolean);
    }
    if (propre(fiche.menu) && estRestauration(fiche.type)) objet.hasMenu = propre(fiche.menu);
    if (propre(fiche.reservation) && estRestauration(fiche.type)) {
      objet.acceptsReservations = propre(fiche.reservation);
    }

    const reseaux = (fiche.reseaux || []).map(propre).filter(Boolean);
    if (reseaux.length) objet.sameAs = reseaux;

    if (propre(fiche.bce)) {
      // Le numéro d'entreprise belge, en identifiant officiel.
      objet.identifier = {
        "@type": "PropertyValue",
        propertyID: "BCE",
        value: propre(fiche.bce),
      };
    }

    /* ⚠️ AUCUN `aggregateRating` N'EST PRODUIT ICI, ET C'EST VOLONTAIRE.
       Inventer une note et un nombre d'avis est le raccourci le plus
       courant de ce genre d'outil. C'est un mensonge envers le client
       final, et Google exige que toute note affichée provienne d'avis
       réels et visibles sur la page. Une note inventée fait au mieux
       ignorer le balisage, au pire sanctionner le site. Les avis
       s'obtiennent, ils ne se fabriquent pas. */

    return objet;
  }

  const estRestauration = type =>
    ["Restaurant", "FastFoodRestaurant", "CafeOrCoffeeShop", "BarOrPub"].includes(type);

  /* ------------------------------------------------------------------
     LE BLOC <head>
     ------------------------------------------------------------------ */

  /**
   * JSON destiné à vivre DANS un <script>. `JSON.stringify` n'échappe pas
   * les chevrons : un établissement nommé « … </script> … » refermerait
   * le bloc, et tout ce qui suit deviendrait du HTML exécutable. On
   * échappe donc les chevrons et l'esperluette en séquences \u, que le
   * parseur JSON relit à l'identique. U+2028 et U+2029 sont du même
   * voyage : ils passent en JSON mais cassent un littéral JavaScript.
   */
  function jsonPourScript(objet) {
    return JSON.stringify(objet, null, 2).replace(
      /[<>&\u2028\u2029]/g,
      c => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0")
    );
  }

  function metaHtml(fiche) {
    const titre = baliseTitre(fiche);
    const description = propre(fiche.description);
    const site = propre(fiche.site).replace(/\/$/, "");
    const image = propre(fiche.image);
    const nom = propre(fiche.nom);

    const l = [];
    l.push("<!-- Identité de la page -->");
    l.push('<meta charset="utf-8">');
    l.push('<meta name="viewport" content="width=device-width, initial-scale=1">');
    l.push("<title>" + echappeHtml(titre) + "</title>");
    if (description) l.push('<meta name="description" content="' + echappeHtml(description) + '">');
    if (site) l.push('<link rel="canonical" href="' + echappeHtml(site) + '/">');
    l.push('<meta name="theme-color" content="' + echappeHtml(propre(fiche.couleur) || "#FFFFFF") + '">');

    l.push("");
    l.push("<!-- Partage sur les réseaux et les messageries -->");
    l.push('<meta property="og:type" content="website">');
    l.push('<meta property="og:locale" content="fr_BE">');
    l.push('<meta property="og:site_name" content="' + echappeHtml(nom) + '">');
    l.push('<meta property="og:title" content="' + echappeHtml(titre) + '">');
    if (description) l.push('<meta property="og:description" content="' + echappeHtml(description) + '">');
    if (site) l.push('<meta property="og:url" content="' + echappeHtml(site) + '/">');
    if (image) {
      l.push('<meta property="og:image" content="' + echappeHtml(image) + '">');
      l.push('<meta property="og:image:width" content="1200">');
      l.push('<meta property="og:image:height" content="630">');
      l.push('<meta property="og:image:alt" content="' + echappeHtml(propre(fiche.imageAlt) || nom) + '">');
    }
    l.push('<meta name="twitter:card" content="' + (image ? "summary_large_image" : "summary") + '">');

    l.push("");
    l.push("<!-- Données structurées : ce que les moteurs lisent de l'établissement -->");
    l.push('<script type="application/ld+json">');
    l.push(jsonPourScript(donneesStructurees(fiche)));
    l.push("<\/script>");

    return l.join("\n");
  }

  /* ------------------------------------------------------------------
     CONTRÔLES

     Trois gravités : `bloquant` empêche la page d'être comprise,
     `important` lui coûte des visites, `remarque` est perfectible.
     ------------------------------------------------------------------ */

  function controles(fiche) {
    const sortie = [];
    const dit = (gravite, champ, texte) => sortie.push({ gravite, champ, texte });

    const nom = propre(fiche.nom);
    const titre = baliseTitre(fiche);
    const description = propre(fiche.description);

    if (!nom) dit("bloquant", "nom", "Sans nom d'établissement, il n'y a pas de fiche à baliser.");

    if (titre) {
      const largeur = largeurPixels(titre);
      if (largeur > LIMITE_TITRE) {
        dit("important", "titre",
          "Le titre fait environ " + largeur + " px : Google coupe vers " + LIMITE_TITRE +
          " px. La fin — souvent la ville — disparaîtra du résultat.");
      } else if (largeur < 200) {
        dit("remarque", "titre",
          "Le titre est court (" + largeur + " px). Il reste de la place pour dire ce qu'on y fait.");
      }
    }

    if (!description) {
      dit("important", "description",
        "Sans description, Google compose lui-même un extrait à partir de la page. " +
        "Le résultat est rarement celui qu'on aurait choisi.");
    } else {
      const largeur = largeurPixels(description);
      if (largeur > LIMITE_DESCRIPTION) {
        dit("remarque", "description",
          "La description fait environ " + largeur + " px et sera coupée vers " +
          LIMITE_DESCRIPTION + " px. Mettez l'essentiel au début.");
      }
      if (nom && !description.toLowerCase().includes(nom.toLowerCase())) {
        dit("remarque", "description", "Le nom de l'établissement n'apparaît pas dans la description.");
      }
    }

    if (!propre(fiche.ville)) {
      dit("important", "ville",
        "Sans localité, la fiche ne se rattache à aucune recherche locale — " +
        "c'est pourtant l'essentiel du trafic d'un commerce.");
    }
    if (!propre(fiche.rue)) {
      dit("important", "rue", "Une adresse complète est ce qui distingue un commerce d'un site quelconque.");
    }
    if (!propre(fiche.telephone)) {
      dit("important", "telephone", "Le téléphone est le premier bouton qu'un visiteur cherche sur un mobile.");
    }
    if (!propre(fiche.site)) {
      dit("important", "site", "Sans adresse du site, ni le lien canonique ni les balises de partage ne peuvent être écrits.");
    } else if (!/^https:\/\//i.test(propre(fiche.site))) {
      dit("bloquant", "site", "L'adresse doit commencer par https://.");
    }

    if (!propre(fiche.image)) {
      dit("important", "image",
        "Sans image de partage, un lien envoyé sur WhatsApp ou Facebook s'affiche en bloc gris.");
    }

    const horaires = horairesSchema(fiche.horaires);
    if (!horaires.length) {
      dit("important", "horaires",
        "Aucun horaire renseigné. C'est la question la plus posée à un commerce, et celle " +
        "que le moteur affiche directement s'il la connaît.");
    }

    // Une plage qui se termine avant de commencer : la saisie du soir
    // franchissant minuit est le cas courant, et le balisage l'admet.
    JOURS.forEach(jour => {
      const j = (fiche.horaires || {})[jour.cle];
      if (!j || j.ferme) return;
      (j.plages || []).forEach(plage => {
        if (!plage.de && !plage.a) return;
        if (!heureValide(plage.de) || !heureValide(plage.a)) {
          dit("bloquant", "horaires",
            jour.nom + " : heure mal écrite. Le format attendu est 18:30.");
        }
      });
    });

    if (propre(fiche.gamme) && !/^€{1,4}$/.test(propre(fiche.gamme)) && !/\d/.test(propre(fiche.gamme))) {
      dit("remarque", "gamme",
        "La gamme de prix se note « €€ » ou « 15-30 € ». Un texte libre ne sera pas compris.");
    }

    const bce = propre(fiche.bce).replace(/[^\d]/g, "");
    if (propre(fiche.bce) && bce.length !== 10) {
      dit("remarque", "bce", "Un numéro d'entreprise belge compte dix chiffres.");
    }

    return sortie;
  }

  return {
    TYPES, JOURS,
    baliseTitre, metaHtml, donneesStructurees, controles,
    largeurPixels, telephoneE164, horairesSchema, horairesGroupes,
    estRestauration, echappeHtml,
    LIMITE_TITRE, LIMITE_DESCRIPTION,
  };
});
