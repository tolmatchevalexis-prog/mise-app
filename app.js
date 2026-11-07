/*
==================================================
M.I.S.E.
Maîtrise · Initiative · Synergie · Engagement

MOTEUR COMMUN — app.js

Gestion :
- Personnages
- Sauvegardes
- Attributs
- Réserves de PA
- Blessures
- Compétences
- Atouts
- Actions contre un SD
- Oppositions

Les interfaces HTML utiliseront ce moteur.
==================================================
*/

"use strict";

window.MISE = (() => {

  /* ========================================
     CONFIGURATION
     ======================================== */

  const STORAGE_KEY =
    "mise-app-characters-v1";

  const ATTRIBUTS = [
    "physique",
    "mental",
    "social"
  ];

  const RESERVES = {
    physique: "Vigueur",
    mental: "Volonté",
    social: "Influence"
  };

  const NIVEAUX = {
    1: { nom: "Novice", bonus: 1 },
    2: { nom: "Confirmé", bonus: 2 },
    3: { nom: "Expert", bonus: 3 },
    4: { nom: "Maître", bonus: 5 }
  };

  const POSTURES = {
    offensive: "Offensive",
    defensive: "Défensive",
    economique: "Économique"
  };

  const DOMINANCE = {
    offensive: "economique",
    economique: "defensive",
    defensive: "offensive"
  };

  const copier = objet =>
    JSON.parse(JSON.stringify(objet));

  const limiter = (nombre, minimum, maximum) =>
    Math.max(
      minimum,
      Math.min(maximum, nombre)
    );

  const entier = valeur =>
    Number.isInteger(valeur);

  function verifierReserve(reserve) {

    if (!ATTRIBUTS.includes(reserve)) {
      throw new Error("Réserve inconnue.");
    }

  }

  function verifierMise(mise, minimum = 0) {

    if (!entier(mise) || mise < minimum) {
      throw new Error(
        "La mise doit être un nombre entier valide."
      );
    }

  }


  /* ========================================
     SAUVEGARDE LOCALE
     ======================================== */

  function lirePersonnages() {

    try {

      const donnees = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || "[]"
      );

      if (!Array.isArray(donnees)) {
        throw new Error("Données invalides.");
      }

      return donnees;

    } catch {

      throw new Error(
        "Impossible de lire les personnages enregistrés."
      );

    }

  }


  function ecrirePersonnages(personnages) {

    try {

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(personnages)
      );

      return true;

    } catch {

      throw new Error(
        "Impossible d'enregistrer les personnages."
      );

    }

  }


  function tousLesPersonnages() {

    return lirePersonnages().map(
      personnage => preparerPersonnage(personnage)
    );

  }


  function trouverPersonnage(id) {

    const personnage = lirePersonnages().find(
      element => element.id === id
    );

    if (!personnage) {
      throw new Error("Personnage introuvable.");
    }

    return preparerPersonnage(personnage);

  }


  function enregistrerPersonnage(personnage) {

    const fiche = preparerPersonnage(
      copier(personnage)
    );

    if (!fiche.id) {
      fiche.id = crypto.randomUUID();
    }

    if (!fiche.name || !fiche.name.trim()) {
      throw new Error(
        "Le personnage doit posséder un nom."
      );
    }

    fiche.name = fiche.name.trim();

    const personnages = lirePersonnages();

    const position = personnages.findIndex(
      element => element.id === fiche.id
    );

    if (position === -1) {

      personnages.push(fiche);

    } else {

      personnages[position] = fiche;

    }

    ecrirePersonnages(personnages);

    return copier(fiche);

  }


  function modifierPersonnage(id, modification) {

    const personnage = trouverPersonnage(id);

    const resultat = modification(personnage);

    if (resultat === false) {
      return copier(personnage);
    }

    return enregistrerPersonnage(personnage);

  }


  function supprimerPersonnage(id) {

    const personnages = lirePersonnages();

    const restants = personnages.filter(
      personnage => personnage.id !== id
    );

    if (restants.length === personnages.length) {
      throw new Error("Personnage introuvable.");
    }

    ecrirePersonnages(restants);

    /*
      Les portraits sont stockés séparément
      dans IndexedDB.

      Leur suppression reste gérée par index.html
      jusqu'à la migration de ce module.
    */

    return true;

  }


  /* ========================================
     ATTRIBUTS ET RÉSERVES
     ======================================== */

  function maximumDeBase(attribut) {

    return attribut * 3 + 5;

  }


  function maximumPA(personnage, reserve) {

    verifierReserve(reserve);

    const blessures =
      personnage.wounds?.[reserve] || 0;

    return Math.max(
      0,
      maximumDeBase(personnage[reserve]) -
      3 * blessures
    );

  }


  function preparerPersonnage(personnage) {

    const fiche = copier(personnage);

    if (!fiche.wounds) {

      fiche.wounds = {
        physique: 0,
        mental: 0,
        social: 0
      };

    }

    if (!fiche.pa) {
      fiche.pa = {};
    }

    if (!Array.isArray(fiche.skills)) {
      fiche.skills = [];
    }

    if (!Array.isArray(fiche.atouts)) {
      fiche.atouts = [];
    }

    if (typeof fiche.history !== "string") {
      fiche.history = "";
    }

    for (const reserve of ATTRIBUTS) {

      const valeur = Number(fiche[reserve]);

      fiche[reserve] =
        entier(valeur)
          ? limiter(valeur, 1, 4)
          : 1;

      const blessures = Number(
        fiche.wounds[reserve]
      );

      fiche.wounds[reserve] =
        entier(blessures)
          ? Math.max(0, blessures)
          : 0;

      const maximum = maximumPA(
        fiche,
        reserve
      );

      const disponibles = Number(
        fiche.pa[reserve]
      );

      fiche.pa[reserve] =
        fiche.pa[reserve] == null ||
        !entier(disponibles)
          ? maximum
          : limiter(disponibles, 0, maximum);

    }

    return fiche;

  }


  /* ========================================
     DÉPENSES ET RÉCUPÉRATIONS
     ======================================== */

  function depenserPA(personnage, reserve, cout) {

    verifierReserve(reserve);
    verifierMise(cout, 0);

    if (personnage.pa[reserve] < cout) {

      throw new Error(
        "PA insuffisants dans la réserve " +
        RESERVES[reserve] + "."
      );

    }

    personnage.pa[reserve] -= cout;

    return personnage.pa[reserve];

  }


  function recupererPA(personnage, reserve, quantite) {

    verifierReserve(reserve);
    verifierMise(quantite, 0);

    personnage.pa[reserve] = limiter(
      personnage.pa[reserve] + quantite,
      0,
      maximumPA(personnage, reserve)
    );

    return personnage.pa[reserve];

  }


  /* ========================================
     BLESSURES
     ======================================== */

  function blessuresDepuisDegats(degats) {

    verifierMise(degats, 0);

    /*
      Une blessure par tranche complète
      de trois dégâts.

      Les dégâts restants sont ignorés.
    */

    return Math.floor(degats / 3);

  }


  function ajouterBlessures(
    personnage,
    reserve,
    nombre
  ) {

    verifierReserve(reserve);
    verifierMise(nombre, 0);

    personnage.wounds[reserve] += nombre;

    /*
      Chaque blessure retire 3 PA
      au maximum de la réserve.

      Les PA disponibles sont ramenés
      au nouveau maximum si nécessaire.
    */

    personnage.pa[reserve] = Math.min(
      personnage.pa[reserve],
      maximumPA(personnage, reserve)
    );

    return personnage.wounds[reserve];

  }


  function retirerBlessures(
    personnage,
    reserve,
    nombre
  ) {

    verifierReserve(reserve);
    verifierMise(nombre, 0);

    personnage.wounds[reserve] = Math.max(
      0,
      personnage.wounds[reserve] - nombre
    );

    /*
      Guérir une blessure augmente
      le maximum possible.

      Cela ne restaure pas automatiquement
      les PA disponibles.
    */

    return personnage.wounds[reserve];

  }


  /* ========================================
     COMPÉTENCES
     ======================================== */

  function bonusCompetence(
    personnage,
    competenceId
  ) {

    if (!competenceId) {
      return 0;
    }

    const competence = personnage.skills.find(
      element => element.id === competenceId
    );

    if (!competence) {
      throw new Error("Compétence introuvable.");
    }

    const niveau = NIVEAUX[competence.level];

    if (!niveau) {
      throw new Error(
        "Niveau de compétence invalide."
      );
    }

    return niveau.bonus;

  }


  /* ========================================
     ACTION CONTRE UN SD
     ======================================== */

  function calculerAction({
    mise,
    bonus,
    sd,
    ajustement = 0
  }) {

    verifierMise(mise, 0);

    if (!entier(bonus) || bonus < 0) {
      throw new Error("Bonus invalide.");
    }

    if (!entier(sd) || sd < 3 || sd > 7) {
      throw new Error("SD invalide.");
    }

    if (
      !entier(ajustement) ||
      ajustement < -3 ||
      ajustement > 3
    ) {
      throw new Error(
        "Ajustement de circonstance invalide."
      );
    }

    const difficulte = sd + ajustement;

    const score = mise + bonus;

    return {
      score,
      sdInitial: sd,
      sdAjuste: difficulte,
      reussite: score >= difficulte,
      mise
    };

  }


  function resoudreAction({
    personnageId,
    reserve,
    competenceId = null,
    mise,
    sd,
    ajustement = 0
  }) {

    const personnage = trouverPersonnage(
      personnageId
    );

    verifierReserve(reserve);

    const bonus = bonusCompetence(
      personnage,
      competenceId
    );

    const resultat = calculerAction({
      mise,
      bonus,
      sd,
      ajustement
    });

    depenserPA(personnage, reserve, mise);

    enregistrerPersonnage(personnage);

    return {
      ...resultat,
      reserve,
      bonusCompetence: bonus,
      paRestants: personnage.pa[reserve]
    };

  }


  /* ========================================
     POSTURES D'OPPOSITION
     ======================================== */

  function bonusPostures(
    postureA,
    postureB
  ) {

    if (
      !POSTURES[postureA] ||
      !POSTURES[postureB]
    ) {
      throw new Error("Posture inconnue.");
    }

    if (postureA === postureB) {
      return [0, 0];
    }

    if (DOMINANCE[postureA] === postureB) {
      return [2, 0];
    }

    return [0, 2];

  }


  function limiteMiseOpposition(
    personnage,
    reserve
  ) {

    return Math.ceil(
      maximumPA(personnage, reserve) / 2
    );

  }


  /* ========================================
     CALCUL D'UNE OPPOSITION
     ======================================== */

  function calculerOpposition({
    miseJoueur,
    bonusJoueur,
    postureJoueur,
    miseAdverse,
    bonusAdverse,
    postureAdverse
  }) {

    verifierMise(miseJoueur, 1);
    verifierMise(miseAdverse, 1);

    if (
      !entier(bonusJoueur) ||
      !entier(bonusAdverse) ||
      bonusJoueur < 0 ||
      bonusAdverse < 0
    ) {
      throw new Error(
        "Bonus de compétence invalide."
      );
    }

    const [bonusPostureJoueur, bonusPostureAdverse] =
      bonusPostures(
        postureJoueur,
        postureAdverse
      );

    const scoreJoueur =
      miseJoueur +
      bonusJoueur +
      bonusPostureJoueur;

    const scoreAdverse =
      miseAdverse +
      bonusAdverse +
      bonusPostureAdverse;

    const ecart = Math.abs(
      scoreJoueur - scoreAdverse
    );

    const egalite =
      scoreJoueur === scoreAdverse;

    const victoire =
      scoreJoueur > scoreAdverse;

    /*
      En cas d'égalité, le Narrateur
      décide des conséquences.

      Aucun prélèvement automatique.
    */

    if (egalite) {

      return {
        egalite: true,
        victoire: false,
        scoreJoueur,
        scoreAdverse,
        ecart: 0,
        misePayee: 0,
        recuperation: 0,
        degats: 0,
        blessures: 0
      };

    }


    /* Coût de la mise */

    let misePayee = miseJoueur;

    if (
      postureJoueur === "economique" &&
      !victoire
    ) {

      misePayee = Math.ceil(
        miseJoueur / 2
      );

    }


    /* Récupération économique */

    const recuperation =
      postureJoueur === "economique" &&
      victoire
        ? 1
        : 0;


    /* Dégâts subis */

    let degats = victoire ? 0 : ecart;

    if (!victoire) {

      if (postureJoueur === "offensive") {

        degats *= 2;

      }

      if (postureJoueur === "defensive") {

        degats = Math.max(
          0,
          Math.ceil(degats / 2) - 1
        );

      }

    }


    const blessures = blessuresDepuisDegats(
      degats
    );


    return {
      egalite: false,
      victoire,
      scoreJoueur,
      scoreAdverse,
      ecart,
      misePayee,
      recuperation,
      degats,
      blessures
    };

  }


  /* ========================================
     RÉSOLUTION D'UNE OPPOSITION
     ======================================== */

  function resoudreOpposition({
    personnageId,
    reserve,
    competenceId = null,
    miseJoueur,
    postureJoueur,
    miseAdverse,
    bonusAdverse,
    postureAdverse
  }) {

    const personnage = trouverPersonnage(
      personnageId
    );

    verifierReserve(reserve);

    const limite = limiteMiseOpposition(
      personnage,
      reserve
    );

    if (
      !entier(miseJoueur) ||
      miseJoueur < 1 ||
      miseJoueur > limite
    ) {

      throw new Error(
        "La mise dépasse les limites autorisées."
      );

    }

    if (
      miseJoueur > personnage.pa[reserve]
    ) {

      throw new Error(
        "PA insuffisants pour cette opposition."
      );

    }

    const bonusJoueur = bonusCompetence(
      personnage,
      competenceId
    );

    const resultat = calculerOpposition({
      miseJoueur,
      bonusJoueur,
      postureJoueur,
      miseAdverse,
      bonusAdverse,
      postureAdverse
    });


    /*
      Égalité : aucune modification automatique.
    */

    if (resultat.egalite) {

      return {
        ...resultat,
        reserve,
        paRestants: personnage.pa[reserve],
        blessuresTotales:
          personnage.wounds[reserve]
      };

    }


    /*
      1. Débiter la mise.
    */

    depenserPA(
      personnage,
      reserve,
      resultat.misePayee
    );


    /*
      2. Récupération de la posture économique
         en cas de victoire.
    */

    if (resultat.recuperation > 0) {

      recupererPA(
        personnage,
        reserve,
        resultat.recuperation
      );

    }


    /*
      3. Enregistrer les blessures.

      Les dégâts ne sont PAS déduits
      une seconde fois des PA disponibles.

      Ils provoquent des blessures qui
      réduisent le maximum de la réserve.
    */

    if (resultat.blessures > 0) {

      ajouterBlessures(
        personnage,
        reserve,
        resultat.blessures
      );

    }


    /*
      4. Sauvegarder la fiche actualisée.
    */

    enregistrerPersonnage(personnage);


    return {
      ...resultat,
      reserve,
      paRestants: personnage.pa[reserve],
      maximumRestant: maximumPA(
        personnage,
        reserve
      ),
      blessuresTotales:
        personnage.wounds[reserve]
    };

  }


  /* ========================================
     ATOUTS
     ======================================== */

  function activerAtout(
    personnageId,
    atoutId
  ) {

    const personnage = trouverPersonnage(
      personnageId
    );

    const atout = personnage.atouts.find(
      element => element.id === atoutId
    );

    if (!atout) {
      throw new Error("Atout introuvable.");
    }

    const cout = Number(atout.cost);

    verifierReserve(atout.reserve);
    verifierMise(cout, 1);

    depenserPA(
      personnage,
      atout.reserve,
      cout
    );

    enregistrerPersonnage(personnage);

    return {
      nom: atout.name,
      cout,
      reserve: atout.reserve,
      paRestants: personnage.pa[atout.reserve]
    };

  }


  /* ========================================
     INTERFACE PUBLIQUE
     ======================================== */

  return {

    /* Constantes */

    ATTRIBUTS,
    RESERVES,
    NIVEAUX,
    POSTURES,

    /* Personnages */

    tousLesPersonnages,
    trouverPersonnage,
    enregistrerPersonnage,
    modifierPersonnage,
    supprimerPersonnage,
    preparerPersonnage,

    /* Réserves */

    maximumDeBase,
    maximumPA,
    depenserPA,
    recupererPA,

    /* Blessures */

    blessuresDepuisDegats,
    ajouterBlessures,
    retirerBlessures,

    /* Compétences */

    bonusCompetence,

    /* Actions */

    calculerAction,
    resoudreAction,

    /* Oppositions */

    bonusPostures,
    limiteMiseOpposition,
    calculerOpposition,
    resoudreOpposition,

    /* Atouts */

    activerAtout

  };

})();
