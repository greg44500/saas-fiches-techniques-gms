# M-003 — Extension Prix repère global

**Statut : VALIDÉ pour implémentation**  
**Date :** 2026-10-03  
**Bloc :** Référentiel global valorisable  
**Dépendances :** M-002 Référentiel Produits, M-003 Prix applicable, M-004 Valorisation des Fiches techniques

## 1. Objectif

Permettre à un nouveau Workspace de créer immédiatement des Fiches techniques valorisées à partir du référentiel Produit global, même sans Fournisseur, Article fournisseur, Tarif fournisseur, Tarif négocié, Prix facturé ou Prix indicatif local.

Le SaaS fournit pour cela un **Prix repère global** rattaché à une Référence Produit M-002.

Ce Prix repère est explicitement une estimation de démonstration / onboarding. Il n'est jamais présenté comme un prix fournisseur réel.

## 2. Frontière M-002 / M-003

Le modèle Produit M-002 n'est pas redéfini.

~~~text
CanonicalProduct
→ identité Produit globale

ProductVariant
→ Référence Produit exploitable
→ unité de référence

IndicativePrice M-003
→ information économique historisée
~~~

Le Prix repère global est porté par M-003 et référence un `ProductVariant`.

Aucun champ prix n'est ajouté à `CanonicalProduct` ou `ProductVariant`.

## 3. Portées du Prix indicatif

Le modèle `IndicativePrice` existant est étendu sans créer une nouvelle famille de prix.

Portées effectives :

~~~text
GLOBAL
→ workspace = null
→ dossier = null

WORKSPACE
→ workspace = obligatoire
→ dossier = null

DOSSIER
→ workspace = obligatoire
→ dossier = obligatoire
~~~

Un seul Prix indicatif ACTIVE peut exister par Référence Produit et portée effective.

Une modification archive l'enregistrement actif précédent puis crée un nouvel enregistrement. L'historique reste immuable par remplacement, jamais par écrasement.

## 4. Résolution du Prix applicable

Le backend reste l'unique autorité.

Ordre final :

~~~text
Prix facturé valide selon la politique
→ Tarif négocié valide
→ Tarif fournisseur applicable
→ Prix indicatif Dossier
→ Prix indicatif Workspace
→ Prix repère global
→ aucun prix
~~~

Le Prix repère global est donc toujours le dernier fallback.

Toute source plus précise appartenant au client prime automatiquement.

La source résolue exposée par l'API est :

~~~text
INDICATIVE_GLOBAL
→ Prix repère global
~~~

## 5. Corpus initial

Le corpus initial couvre les Références Produit du bootstrap actif `m002-reference-v6`.

Règles :

- valeurs explicitement fictives / indicatives ;
- valeurs cohérentes avec l'unité de référence de chaque `ProductVariant` ;
- devise V1 = EUR ;
- aucune création de Fournisseur fictif ;
- aucune attribution mensongère à METRO, Transgourmet, Sysco ou un autre fournisseur ;
- source exposée : `Référentiel de démonstration — prix repère global` ;
- dataset versionné et contrôlé ;
- le bootstrap ne remplace jamais un Prix repère global déjà maintenu par un gestionnaire ;
- les Références sans valeur exploitable peuvent rester sans Prix repère plutôt que recevoir une valeur incohérente.

## 6. Maintenance par le gestionnaire métier global

Le gestionnaire disposant de `product:reference:manage` peut :

- consulter le Prix repère de chaque Référence Produit ;
- créer un Prix repère manquant ;
- remplacer un Prix repère existant ;
- retirer le Prix repère actif ;
- renseigner une note / provenance ;
- voir la date de dernière mise à jour.

La maintenance est intégrée à la gouvernance du Référentiel Produits afin d'éviter une surface Fournisseur artificielle.

L'autorisation utilisée reste une autorisation Application Global. Aucun Workspace Owner n'obtient ce droit implicitement.

## 7. UX Platform

La liste principale Référentiel Produits ajoute une information économique synthétique sans transformer le tableau en vue fournisseur.

Projection cible :

~~~text
Produit
Catégorie
Prix repère
Actions
~~~

Le détail d'un Produit expose pour chaque Référence Produit :

- unité de référence ;
- Prix repère global courant ;
- note / provenance ;
- date de mise à jour ;
- action Modifier / Ajouter / Retirer selon l'état.

Le gestionnaire ne doit pas saisir manuellement le corpus initial Référence par Référence.

## 8. UX Workspace et M-004

Le Workspace n'administre pas le Prix repère global.

Lorsqu'une Fiche technique est valorisée par ce fallback, l'interface affiche explicitement :

~~~text
Source : Prix repère global
~~~

Le Prix repère global ne doit jamais être confondu avec :

- Prix indicatif Workspace ;
- Prix indicatif Dossier ;
- Tarif fournisseur ;
- Tarif négocié ;
- Prix facturé.

## 9. Conditionnements génériques

Les conditionnements génériques sont compatibles avec cette architecture mais ne sont pas introduits dans ce bloc.

Raison :

~~~text
quantité recette
× prix normalisé par KG / L / UNIT
→ valorisation M-004 possible sans conditionnement d'achat
~~~

Le conditionnement devient nécessaire pour des usages d'approvisionnement, quantité d'achat ou nombre de colis.

L'extension future devra réutiliser les unités M-002 et ne devra créer aucun Fournisseur fictif.

## 10. Migration

La migration doit :

1. rendre `IndicativePrice.workspace` nullable pour la portée globale ;
2. préserver tous les Prix indicatifs Workspace et Dossier existants ;
3. conserver les indexes d'unicité compatibles avec les trois portées ;
4. installer le corpus global initial de façon idempotente ;
5. ne jamais écraser une valeur globale déjà maintenue ;
6. rester compatible replica set / transactions.

Commande opérationnelle après intégration :

~~~bash
npm run migration:m003-indicative-pricing
~~~

Le runner existant :

- vérifie les indexes M-003 ;
- réconcilie les permissions système M-003 existantes ;
- charge le dataset `m003-global-indicative-prices.v1.json` ;
- installe uniquement les Prix repères globaux absents ;
- conserve toute valeur active déjà maintenue par le gestionnaire.

MongoDB ne requiert pas de migration destructive du champ `workspace` : la compatibilité est portée par le schéma Mongoose nullable et l'index composé existant. Les anciens documents Workspace/Dossier restent inchangés.

Le bootstrap suppose que le référentiel M-002 actif et un acteur d'audit Fondateur/Super administrateur existent déjà ; il échoue explicitement sinon.

## 11. Tests obligatoires

Backend :

- création / remplacement / archivage du Prix repère global ;
- isolation des Prix Workspace/Dossier inchangée ;
- normalisation d'unité ;
- priorité du fallback global ;
- absence de fallback global lorsqu'une source plus précise existe ;
- autorisation Application Global ;
- seed idempotent ;
- seed sans écrasement des corrections gestionnaire.

Frontend :

- affichage du Prix repère ;
- ajout / modification / retrait par le gestionnaire ;
- aucune action de maintenance sans `product:reference:manage` ;
- libellé de source explicite.

E2E :

~~~text
nouveau Workspace
→ aucune donnée fournisseur
→ Fiche technique avec Référence Produit globale
→ valorisation possible par Prix repère global

puis Prix indicatif Workspace
→ revalorisation
→ le Prix Workspace prime sur le Prix repère global
~~~

## 12. Hors périmètre

- scraping automatique récurrent des fournisseurs ;
- fournisseur fictif ;
- conditionnements génériques ;
- moteur de prix temps réel ;
- historique graphique ;
- alertes de volatilité ;
- gouvernance Contributions / À contrôler, traitée dans un bloc séparé après celui-ci.
