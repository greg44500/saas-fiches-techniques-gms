// Les noms doivent être uniques par espace, sans confondre les accents.
// La recherche des noms voisins est distincte de cette clé exacte.
const normalizeRangeName = (name) => name
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('fr-FR');

export { normalizeRangeName };
