// organigramme-data.js
// ✅ TU MODIFIES ICI QUAND TU VEUX (noms / postes / groupes / membres)

window.ORG = {
  direction: {
    titre: "Direction du CS Consenvoye",
    lignes: [
      ["Chef de Centre", "ADC Vénante Pierre"],
      ["1er Adjoint CDC", "ADJ Laleeuw Franck"],
      ["2ème Adjoint CDC", "ADJ Sénéchal Benjamin"],
    ],
  },

  blocsHaut: [
    {
      titre: "Équipe de Soutien",
      couleur: "orange",
      lignes: [
        ["", "CNE Bienaimé Jean Paul"],
        ["", "ADJ Lecourtier Guy"],
        ["", "SGT Chavrelles Gilles"],
        ["", "SGT Beausire Bernard"],
      ],
    },
    {
      titre: "AMICALE",
      couleur: "bleuclair",
      lignes: [
        ["Présidente", "Trontin Chloé"],
        ["Vice-président", "Vénante Pierre"],
        ["Trésorier", "Baur Benjamin"],
        ["Trésorier adjoint", "Laleeuw Franck"],
        ["Secrétaire", "Vénante Amélie"],
        ["Secrétaire adjoint", "Dur Amélie"],
      ],
    },
  ],

  groupes: [
    {
      titre: "Groupe Technique et Logistique",
      couleur: "jaune",
      sections: [
        {
          titre: "Bâtiment",
          couleur: "vert",
          membres: ["ADC Sénéchal Benjamin", "ADC Kolodziejczak Stéphane"],
        },
        {
          titre: "Équipement / Habillement",
          couleur: "vert",
          membres: ["ADC Sénéchal Benjamin", "CPL Gaffard Robin"],
        },
        {
          titre: "Véhicules / Tickets carburant",
          couleur: "vert",
          membres: ["ADC Sénéchal Benjamin", "CPL Rogie Florian"],
        },
        {
          titre: "Vérification casques",
          couleur: "vert",
          membres: ["SA1 Moreau Florent"],
        },
      ],
    },

    {
      titre: "Groupe Opérationnel",
      couleur: "jaunevif",
      sections: [
        {
          titre: "DECI / Prévision / Inventaires / Parcellaires",
          couleur: "vert",
          membres: ["ADC Vénante Pierre"],
        },
        {
          titre: "Référent VSAV / Inventaire VSAV",
          couleur: "vert",
          membres: ["SCH Wallarin Hélène", "SCH Stellato Vincent"],
        },
        {
          titre: "Référent SSSM",
          couleur: "vert",
          membres: ["INF Dur Amélie", "INF Lepzel Laura"],
        },
      ],
    },

    {
      titre: "Groupe Formation / Sport",
      couleur: "violet",
      sections: [
        {
          titre: "FORACC / ACCPRO / FPS",
          couleur: "vert",
          membres: [
            "ADJ Laleeuw Franck",
            "ADC Joseph Judicael",
            "ADC Kolodziejczak Stéphane",
            "SCH Wallarin Hélène",
          ],
        },
        {
          titre: "SPORT",
          couleur: "vert",
          membres: ["SCH Wallarin Hélène", "CPL Barotte Christopher", "SGT Michel Marianne"],
        },
      ],
    },

    {
      titre: "Groupe Recrutement / Volontariat",
      couleur: "rose",
      sections: [
        {
          titre: "SPV",
          couleur: "vert",
          membres: ["ADC Vénante Pierre", "ADJ Laleeuw Franck", "ADJ Sénéchal Benjamin"],
        },
        {
          titre: "JSP",
          couleur: "vert",
          membres: [
            "SA1 Vénante Amélie",
            "ADJ Laleeuw Franck",
            "ADC Vénante Pierre",
            "SA1 Christal Mallaury",
            "SA2 Bammé Melody",
          ],
        },
      ],
    },
  ],
};

