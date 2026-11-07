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
- Association compétence / caractéristique
- Atouts
- Actions contre un SD
- Réussites éclatantes
- Oppositions
- Dégâts infligés et reçus

Les interfaces HTML utilisent ce moteur.
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


  /* ========================================
     VÉRIFICATIONS GÉNÉRALES
     ======================================== */

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

      Leur suppression reste gérée par
      index.html.
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

    /*
      Les compétences anciennes sont
      conservées sans modification.

      Une compétence dépourvue de réserve
      ne pourra pas être utilisée avant
      que son association soit définie.
    */

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
      Guérir augmente le maximum possible.

      Cela ne restaure pas automatiquement
      les PA disponibles.
    */

    return personnage.wounds[reserve];

  }


  /* ========================================
     COMPÉTENCES
     ======================================== */

  function trouverCompetence(
    personnage,
    competenceId
  ) {

    const competence = personnage.skills.find(
      element => element.id === competenceId
    );

    if (!competence) {
      throw new Error("Compétence introuvable.");
    }

    return competence;

  }


  function bonusCompetence(
    personnage,
    competenceId
  ) {

    /*
      Une action sans compétence
      bénéficie d'un bonus de +0.
    */

    if (!competenceId) {
      return 0;
    }

    const competence = trouverCompetence(
      personnage,
      competenceId
    );

    const niveau = NIVEAUX[competence.level];

    if (!niveau) {
      throw new Error(
        "Niveau de compétence invalide."
      );
    }

    return niveau.bonus;

  }


  /* ========================================
     ASSOCIATION COMPÉTENCE / RÉSERVE
     ======================================== */

  function verifierAssociationCompetence(
    personnage,
    competenceId,
    reserve
  ) {

    verifierReserve(reserve);

    /*
      Sans compétence :
      bonus +0 et libre choix de la réserve.
    */

    if (!competenceId) {
      return true;
    }

    const competence = trouverCompetence(
      personnage,
      competenceId
    );

    /*
      Une compétence ancienne peut ne pas
      encore posséder d'association.

      Elle doit être complétée sur la fiche
      avant de pouvoir être utilisée.
    */

    if (
      !ATTRIBUTS.includes(
        competence.reserve
      )
    ) {

      throw new Error(
        "La compétence « " +
        competence.name +
        " » n'a pas de caractéristique associée."
      );

    }

    /*
      Une compétence utilise exclusivement
      la réserve associée à sa caractéristique.

      Physique -> Vigueur
      Mental   -> Volonté
      Social   -> Influence
    */

    if (competence.reserve !== reserve) {

      throw new Error(
        "La compétence « " +
        competence.name +
        " » doit utiliser la réserve " +
        RESERVES[competence.reserve] +
        "."
      );

    }

    return true;

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

    /*
      Résolution selon le livret :

      Score < SD : échec
      Score = SD : réussite simple
      Score > SD : réussite éclatante
    */

    const reussite = score >= difficulte;

    const reussiteEclatante =
      score > difficulte;

    let typeReussite = "echec";

    if (score === difficulte) {
      typeReussite = "simple";
    }

    if (reussiteEclatante) {
      typeReussite = "eclatante";
    }

    return {
      score,
      sdInitial: sd,
      sdAjuste: difficulte,
      reussite,
      reussiteEclatante,
      typeReussite,
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

    /*
      Vérifier l'association AVANT
      le calcul et toute dépense de PA.
    */

    verifierAssociationCompetence(
      personnage,
      competenceId,
      reserve
    );

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
     CALCUL DES DÉGÂTS
     ======================================== */

  function calculerDegats(
    ecart,
    posturePerdant
  ) {

    verifierMise(ecart, 0);

    if (!POSTURES[posturePerdant]) {
      throw new Error("Posture inconnue.");
    }

    /*
      C'est toujours la posture
      du PERDANT qui détermine
      les dégâts qu'il reçoit.

      Offensive :
      dégâts doublés.

      Défensive :
      dégâts divisés par deux,
      arrondis au supérieur,
      puis -1, minimum 0.

      Économique :
      dégâts entiers.
    */

    if (posturePerdant === "offensive") {
      return ecart * 2;
    }

    if (posturePerdant === "defensive") {

      return Math.max(
        0,
        Math.ceil(ecart / 2) - 1
      );

    }

    return ecart;

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

    const [
      bonusPostureJoueur,
      bonusPostureAdverse
    ] = bonusPostures(
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
      ÉGALITÉ

      Chacun paie sa mise entière.
      Aucun dégât.
      Aucune blessure.
      Aucune récupération.
    */

    if (egalite) {

      return {
        egalite: true,
        victoire: false,
        scoreJoueur,
        scoreAdverse,
        ecart: 0,
        misePayee: miseJoueur,
        recuperation: 0,

        degats: 0,
        blessures: 0,

        degatsRecus: 0,
        blessuresRecues: 0,

        degatsInfliges: 0,
        blessuresInfligees: 0
      };

    }

    /*
      COÛT DE LA MISE

      La posture économique réduit
      le coût en cas de défaite.
    */

    let misePayee = miseJoueur;

    if (
      postureJoueur === "economique" &&
      !victoire
    ) {

      misePayee = Math.ceil(
        miseJoueur / 2
      );

    }

    /*
      RÉCUPÉRATION ÉCONOMIQUE

      En cas de victoire :
      +1 PA après paiement.
    */

    const recuperation =
      postureJoueur === "economique" &&
      victoire
        ? 1
        : 0;

    /*
      CALCUL SYMÉTRIQUE DES DÉGÂTS

      Si le joueur gagne :
      dégâts subis par l'adversaire.

      Si le joueur perd :
      dégâts subis par le joueur.
    */

    let degatsRecus = 0;
    let degatsInfliges = 0;

    if (victoire) {

      degatsInfliges = calculerDegats(
        ecart,
        postureAdverse
      );

    } else {

      degatsRecus = calculerDegats(
        ecart,
        postureJoueur
      );

    }

    const blessuresRecues =
      blessuresDepuisDegats(
        degatsRecus
      );

    const blessuresInfligees =
      blessuresDepuisDegats(
        degatsInfliges
      );

    /*
      Compatibilité avec les interfaces
      existantes :

      degats et blessures conservent
      leur sens initial : dégâts
      et blessures reçus par le joueur.
    */

    return {
      egalite: false,
      victoire,

      scoreJoueur,
      scoreAdverse,
      ecart,

      misePayee,
      recuperation,

      degats: degatsRecus,
      blessures: blessuresRecues,

      degatsRecus,
      blessuresRecues,

      degatsInfliges,
      blessuresInfligees
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

    /*
      Vérifier l'association compétence /
      réserve AVANT toute résolution.
    */

    verifierAssociationCompetence(
      personnage,
      competenceId,
      reserve
    );

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
      1. DÉBITER LA MISE

      Même en cas d'égalité,
      la mise entière est payée.

      Le coût est calculé par
      calculerOpposition().
    */

    depenserPA(
      personnage,
      reserve,
      resultat.misePayee
    );

    /*
      2. RÉCUPÉRATION ÉCONOMIQUE

      En cas de victoire uniquement.
    */

    if (resultat.recuperation > 0) {

      recupererPA(
        personnage,
        reserve,
        resultat.recuperation
      );

    }

    /*
      3. ENREGISTRER LES BLESSURES
         REÇUES PAR LE JOUEUR

      Les dégâts ne sont PAS déduits
      une seconde fois des PA.

      Chaque blessure retire 3 PA
      au maximum de la réserve.

      Les blessures infligées à
      l'adversaire sont calculées
      mais ne sont pas enregistrées
      sur une autre fiche.
    */

    if (resultat.blessuresRecues > 0) {

      ajouterBlessures(
        personnage,
        reserve,
        resultat.blessuresRecues
      );

    }

    /*
      4. SAUVEGARDER LA FICHE

      Cette sauvegarde s'effectue
      également en cas d'égalité,
      puisque la mise a été payée.
    */

    enregistrerPersonnage(personnage);

    return {
      ...resultat,

      reserve,

      paRestants:
        personnage.pa[reserve],

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

    trouverCompetence,
    bonusCompetence,
    verifierAssociationCompetence,

    /* Actions */

    calculerAction,
    resoudreAction,

    /* Oppositions */

    bonusPostures,
    limiteMiseOpposition,
    calculerDegats,
    calculerOpposition,
    resoudreOpposition,

    /* Atouts */

    activerAtout

  };

})();
