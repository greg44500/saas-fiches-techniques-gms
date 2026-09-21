# M-001 — Autocomplétion d'adresse

**Statut :** VALIDÉ  
**Date de validation :** 2026-09-21  
**Périmètre :** assistance facultative à la saisie de localisation du Dossier

---

## 1. Fournisseur initial

M-001 utilise le service d'autocomplétion de la Géoplateforme / IGN, alimenté notamment par la Base Adresse Nationale.

L'ancienne API Adresse BAN `api-adresse.data.gouv.fr` est dépréciée et ne constitue pas la cible M-001.

Le fournisseur est une dépendance d'ergonomie, jamais une dépendance métier bloquante.

---

## 2. Comportement de saisie

Contrat UX :

```text
moins de 3 caractères significatifs
→ aucun appel

à partir de 3 caractères
→ debounce ~300 ms
→ annulation de la requête précédente
→ type StreetAddress
→ maximum 8 suggestions
```

Une sélection peut renseigner :

```text
address
postalCode
city
```

L'utilisateur reste libre de modifier ensuite les valeurs.

---

## 3. Fallback manuel obligatoire

Les cas suivants ne bloquent jamais le formulaire :

```text
service indisponible
timeout
429 / limitation de débit
aucun résultat
adresse absente du référentiel
erreur réseau
```

Dans tous ces cas :

```text
→ saisie manuelle
→ création / modification toujours possible
```

Le backend ne valide jamais l'existence de l'adresse dans la BAN comme condition de validité métier.

---

## 4. Adapter frontend

Le formulaire métier ne dépend pas directement du payload brut Géoplateforme.

Architecture conceptuelle :

```text
DossierForm
→ useAddressAutocomplete
→ addressAutocompleteProvider
→ Géoplateforme
```

DTO interne attendu :

```text
label
address
postalCode
city
```

Le provider encapsule :

- URL fournisseur ;
- query params ;
- parsing de réponse ;
- gestion de l'annulation ;
- normalisation du résultat.

Un changement futur de fournisseur ne doit pas imposer de réécrire le formulaire Dossier.

---

## 5. Appel frontend direct en V1

L'API publique ne nécessite pas de secret pour ce besoin.

M-001 privilégie donc un appel frontend direct, sous réserve de vérification technique effective du CORS au moment de l'implémentation.

Aucun proxy backend n'est ajouté par anticipation.

Si la réalité technique impose un proxy, seul l'adapter/provider évolue ; le contrat du formulaire reste inchangé.

---

## 6. Données persistées

M-001 conserve uniquement les données métier utiles :

```text
location.address
location.postalCode
location.city
```

Ne sont pas persistés en M-001 :

```text
payload fournisseur complet
score
banID
identifiant Géoplateforme
latitude
longitude
métadonnées fournisseur
```

Ces données ne seront ajoutées que si un futur besoin métier concret les nécessite.

---

## 7. RTK Query

Les suggestions d'adresse sont éphémères et liées à la saisie courante.

Elles ne constituent pas un état serveur durable de l'application.

M-001 utilise donc de préférence :

```text
hook local
+ useState
+ AbortController
```

et non RTK Query.

RTK Query reste réservé aux données serveur persistantes ou partagées de l'application.

---

## 8. UX d'erreur

Une panne de l'autocomplétion ne déclenche pas de toast à chaque requête.

Le formulaire peut afficher un message non bloquant du type :

```text
La recherche d'adresse est momentanément indisponible.
Vous pouvez poursuivre la saisie manuellement.
```

Les champs restent utilisables.

---

## 9. Charge et fair use

L'autocomplétion Géoplateforme est actuellement limitée à 10 requêtes par seconde et par IP.

Le debounce, le seuil de caractères et l'annulation des requêtes réduisent les appels inutiles.

M-001 ne construit aucun mécanisme de contournement de cette limite.

---

## 10. Migrations / seeds

Cette fonctionnalité ne nécessite :

- aucun seed de villes ;
- aucun import local de la BAN ;
- aucune nouvelle base géographique ;
- aucune migration de données existantes.

Le service externe reste une aide à la saisie.

---

## 11. Invariant

```text
autocomplétion
→ confort UX

saisie manuelle
→ toujours fonctionnelle
→ autorité finale de l'utilisateur
```
