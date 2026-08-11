/* =====================================================================
   CORE — SEO : l'atelier

   Lit les champs, compose la fiche, tient les aperçus à jour. Toute la
   logique de balisage est dans js/balises.js et ne connaît rien de cette
   page.
   ===================================================================== */

(function () {
  "use strict";

  const $ = s => document.querySelector(s);
  const $$ = s => Array.prototype.slice.call(document.querySelectorAll(s));

  /* ------------------------------------------------------------------
     MISE EN PLACE
     ------------------------------------------------------------------ */

  // Types d'établissement
  const selType = $("#type");
  CoreSEO.TYPES.forEach(t => {
    const o = document.createElement("option");
    o.value = t.valeur;
    o.textContent = t.nom;
    selType.appendChild(o);
  });
  selType.value = "CafeOrCoffeeShop";

  // Éditeur d'horaires : sept lignes, deux services chacune.
  const DEFAUTS = {
    lu: { ferme: true, plages: [{ de: "", a: "" }, { de: "", a: "" }] },
    ma: { ferme: false, plages: [{ de: "11:30", a: "14:30" }, { de: "18:00", a: "21:30" }] },
    me: { ferme: false, plages: [{ de: "11:30", a: "14:30" }, { de: "18:00", a: "21:30" }] },
    je: { ferme: false, plages: [{ de: "11:30", a: "14:30" }, { de: "18:00", a: "21:30" }] },
    ve: { ferme: false, plages: [{ de: "11:30", a: "22:00" }, { de: "", a: "" }] },
    sa: { ferme: false, plages: [{ de: "11:30", a: "22:00" }, { de: "", a: "" }] },
    di: { ferme: false, plages: [{ de: "12:00", a: "21:00" }, { de: "", a: "" }] },
  };

  const conteneur = $("#horaires");
  CoreSEO.JOURS.forEach(jour => {
    const d = DEFAUTS[jour.cle];
    const ligne = document.createElement("div");
    ligne.className = "jour" + (d.ferme ? " jour--ferme" : "");
    ligne.dataset.jour = jour.cle;
    ligne.innerHTML =
      '<span class="jour__nom">' + jour.nom + '</span>' +
      '<label class="jour__ferme">' +
        '<input type="checkbox" data-role="ferme"' + (d.ferme ? " checked" : "") + '> fermé' +
      '</label>' +
      '<span class="jour__plages">' +
        plageHtml(0, d.plages[0]) +
        '<span class="jour__sep">·</span>' +
        plageHtml(1, d.plages[1]) +
      '</span>';
    conteneur.appendChild(ligne);
  });

  function plageHtml(index, plage) {
    const nom = index === 0 ? "midi" : "soir";
    return '<input class="saisie" type="text" data-role="de" data-plage="' + index + '"' +
           ' value="' + (plage.de || "") + '" placeholder="' + (index ? "18:00" : "11:30") + '"' +
           ' aria-label="Ouverture ' + nom + '">' +
           '<span class="jour__sep">→</span>' +
           '<input class="saisie" type="text" data-role="a" data-plage="' + index + '"' +
           ' value="' + (plage.a || "") + '" placeholder="' + (index ? "22:00" : "14:30") + '"' +
           ' aria-label="Fermeture ' + nom + '">';
  }

  /* ------------------------------------------------------------------
     LECTURE DE LA FICHE
     ------------------------------------------------------------------ */

  const val = id => ($("#" + id) ? $("#" + id).value : "");

  function litHoraires() {
    const horaires = {};
    $$(".jour").forEach(ligne => {
      const cle = ligne.dataset.jour;
      const ferme = ligne.querySelector('[data-role="ferme"]').checked;
      const plages = [0, 1].map(i => ({
        de: ligne.querySelector('[data-role="de"][data-plage="' + i + '"]').value.trim(),
        a: ligne.querySelector('[data-role="a"][data-plage="' + i + '"]').value.trim(),
      })).filter(p => p.de || p.a);
      horaires[cle] = { ferme, plages };
      ligne.classList.toggle("jour--ferme", ferme);
    });
    return horaires;
  }

  function litFiche() {
    return {
      nom: val("nom"),
      type: val("type"),
      accroche: val("accroche"),
      description: val("description"),
      rue: val("rue"),
      codePostal: val("codePostal"),
      ville: val("ville"),
      province: val("province"),
      telephone: val("telephone"),
      courriel: val("courriel"),
      site: val("site"),
      bce: val("bce"),
      latitude: val("latitude"),
      longitude: val("longitude"),
      image: val("image"),
      imageAlt: val("imageAlt"),
      gamme: val("gamme"),
      cuisine: val("cuisine"),
      couleur: val("couleur"),
      reservation: val("reservation"),
      reseaux: val("reseaux").split("\n").map(s => s.trim()).filter(Boolean),
      horaires: litHoraires(),
    };
  }

  /* ------------------------------------------------------------------
     MESURE EXACTE

     Le module sait estimer une largeur ; le navigateur sait la mesurer.
     On préfère la mesure quand elle est disponible — c'est la même
     police, la même taille que dans les résultats.
     ------------------------------------------------------------------ */

  const pinceau = (() => {
    try { return document.createElement("canvas").getContext("2d"); }
    catch { return null; }
  })();

  function largeur(texte, police) {
    if (!pinceau) return CoreSEO.largeurPixels(texte);
    pinceau.font = police;
    return Math.round(pinceau.measureText(texte).width);
  }

  const largeurTitre = t => largeur(t, "20px arial, sans-serif");
  const largeurDesc = t => largeur(t, "14px arial, sans-serif");

  function majMesure(barre, texteEl, largeurMesuree, limite) {
    const part = Math.min(100, Math.round(largeurMesuree / limite * 100));
    barre.style.width = part + "%";
    barre.className = "mesure__part" + (largeurMesuree > limite ? " mesure__part--trop" : "");
    texteEl.textContent = largeurMesuree + " / " + limite + " px";
  }

  /* ------------------------------------------------------------------
     APERÇUS
     ------------------------------------------------------------------ */

  function hote(site) {
    try { return new URL(site).hostname.replace(/^www\./, ""); }
    catch { return site.replace(/^https?:\/\//, "").split("/")[0] || "exemple.be"; }
  }

  /** « Mar–Jeu 11:30–14:30, 18:00–21:30 », comme Google le résume. */
  function resumeHoraires(fiche) {
    const groupes = CoreSEO.horairesGroupes(fiche.horaires)
      .filter(g => g.plages.length);
    if (!groupes.length) return "";
    return groupes.map(g => {
      const jours = g.jours.length === 1
        ? g.jours[0].nom.slice(0, 3)
        : g.jours[0].nom.slice(0, 3) + "–" + g.jours[g.jours.length - 1].nom.slice(0, 3);
      const plages = g.plages.map(p => p.de + "–" + p.a).join(", ");
      return jours + " " + plages;
    }).join(" · ");
  }

  function majApercus(fiche) {
    const titre = CoreSEO.baliseTitre(fiche);
    const description = fiche.description.trim();
    const domaine = hote(fiche.site);

    // --- résultat de recherche
    const lTitre = largeurTitre(titre);
    $("#serpTitre").textContent = titre || "—";
    $("#serpTitre").classList.toggle("serp__titre--coupe", lTitre > CoreSEO.LIMITE_TITRE);
    $("#serpDesc").textContent = description || "Sans description, Google composera lui-même un extrait de la page.";
    $("#serpSite").textContent = fiche.nom || domaine;
    $("#serpUrl").textContent = (fiche.site || "https://exemple.be").replace(/\/$/, "");
    $("#serpRond").textContent = (fiche.nom || "?").trim().charAt(0).toUpperCase() || "?";

    const resume = resumeHoraires(fiche);
    const horairesEl = $("#serpHoraires");
    horairesEl.hidden = !resume;
    if (resume) horairesEl.textContent = "Horaires : " + resume;

    majMesure($("#mesureTitre"), $("#mesureTitreTexte"), lTitre, CoreSEO.LIMITE_TITRE);
    majMesure($("#mesureDesc"), $("#mesureDescTexte"), largeurDesc(description), CoreSEO.LIMITE_DESCRIPTION);

    // --- carte de partage
    $("#partageHote").textContent = domaine.toUpperCase();
    $("#partageTitre").textContent = titre || "—";
    $("#partageDesc").textContent = description || "—";

    const zone = $("#partageImage");
    if (fiche.image) {
      // On ne remplace l'espace réservé que si l'image se charge : une
      // adresse fautive doit se voir, pas se traduire par un cadre vide.
      const img = new Image();
      img.onload = () => {
        zone.textContent = "";
        img.alt = fiche.imageAlt || fiche.nom;
        zone.appendChild(img);
      };
      img.onerror = () => { zone.textContent = "Cette image ne se charge pas."; };
      img.src = fiche.image;
    } else {
      zone.textContent = "Aucune image de partage";
    }

    // --- téléphone normalisé, montré tel qu'il partira dans le balisage
    const tel = CoreSEO.telephoneE164(fiche.telephone);
    $("#aideTel").textContent = tel ? "Sera balisé " + tel : "Le format international est déduit automatiquement.";
  }

  function majControles(fiche) {
    const liste = $("#controles");
    const trouves = CoreSEO.controles(fiche);
    liste.innerHTML = "";

    if (!trouves.length) {
      const li = document.createElement("li");
      li.className = "controle controle--aucun";
      li.innerHTML = '<span class="controle__pastille"></span><span>La fiche est complète. ' +
        'Vérifiez maintenant que ce qui est balisé correspond bien au contenu visible de la page.</span>';
      liste.appendChild(li);
      return;
    }

    const ordre = { bloquant: 0, important: 1, remarque: 2 };
    trouves.sort((a, b) => ordre[a.gravite] - ordre[b.gravite]).forEach(c => {
      const li = document.createElement("li");
      li.className = "controle controle--" + c.gravite;
      const pastille = document.createElement("span");
      pastille.className = "controle__pastille";
      const texte = document.createElement("span");
      texte.textContent = c.texte;
      li.appendChild(pastille);
      li.appendChild(texte);
      liste.appendChild(li);
    });
  }

  /* ------------------------------------------------------------------
     CHAMPS CONDITIONNELS
     ------------------------------------------------------------------ */

  function majChampsSelonType(fiche) {
    const restauration = CoreSEO.estRestauration(fiche.type);
    $("#champCuisine").hidden = !restauration;
    $("#champReservation").hidden = !restauration;
  }

  /* ------------------------------------------------------------------
     RENDU
     ------------------------------------------------------------------ */

  let dernierBloc = "";

  function redessine() {
    const fiche = litFiche();
    majChampsSelonType(fiche);
    majApercus(fiche);
    majControles(fiche);

    dernierBloc = CoreSEO.metaHtml(fiche);
    $("#sortie").textContent = dernierBloc;
  }

  /* ------------------------------------------------------------------
     COPIE ET TÉLÉCHARGEMENT
     ------------------------------------------------------------------ */

  function signale() {
    const etat = $("#etatCopie");
    etat.hidden = false;
    clearTimeout(signale.minuteur);
    signale.minuteur = setTimeout(() => { etat.hidden = true; }, 2200);
  }

  async function copie(texte) {
    try {
      await navigator.clipboard.writeText(texte);
      signale();
    } catch {
      // Sur une page ouverte en file://, le presse-papiers peut être
      // refusé : on sélectionne alors le bloc pour que Ctrl+C suffise.
      const plage = document.createRange();
      plage.selectNodeContents($("#sortie"));
      const s = window.getSelection();
      s.removeAllRanges();
      s.addRange(plage);
    }
  }

  $("#copier").addEventListener("click", () => copie(dernierBloc));
  $("#copierLd").addEventListener("click", () => {
    copie(JSON.stringify(CoreSEO.donneesStructurees(litFiche()), null, 2));
  });
  $("#telecharger").addEventListener("click", () => {
    const blob = new Blob([dernierBloc], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "balises-" + (hote(val("site")) || "site") + ".html";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  });

  /* ------------------------------------------------------------------
     LIAISONS
     ------------------------------------------------------------------ */

  document.addEventListener("input", e => {
    if (e.target.closest(".page")) redessine();
  });
  document.addEventListener("change", e => {
    if (e.target.closest(".page")) redessine();
  });

  redessine();
})();
