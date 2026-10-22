/**
 * Libellés de sélection orientés métier, indépendants de la source
 * (Article obtenu par API ou embarqué dans les Références du Dossier).
 */
function getSupplierArticleTitle(article) {
  return article?.supplierDesignation?.trim()
    || article?.productVariant?.name
    || article?.productVariantName
    || 'Article sans désignation';
}

function getSupplierArticleDetails(article) {
  const supplier = article?.supplier?.name
    ?? article?.supplierName
    ?? 'Fournisseur';
  return [supplier, article?.supplierReference]
    .filter(Boolean).join(' · ');
}

function getSupplierArticleChoiceLabel(article) {
  return getSupplierArticleTitle(article)
    + ' · ' + getSupplierArticleDetails(article);
}

function matchSupplierArticle(article, term) {
  const normalized = (value) => String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr-FR');
  const needle = normalized(term.trim());
  return normalized(getSupplierArticleChoiceLabel(article)).includes(needle);
}

export {
  getSupplierArticleChoiceLabel,
  getSupplierArticleDetails,
  getSupplierArticleTitle,
  matchSupplierArticle,
};
