# Upload temporaire sécurisé configurable

**Statut :** contrat Core générique  
**Baseline :** Core 1.2.0  
**Périmètre :** réception, inspection et consommation d'un fichier technique temporaire par un SaaS dérivé

---

## 1. Objet

Le Core fournit une primitive permettant à un SaaS dérivé de recevoir un fichier multipart dans la quarantaine existante, de l'inspecter avec une politique de types propre au produit, puis de le remettre temporairement à un consommateur applicatif.

Cette primitive ne transforme pas un import technique en fichier utilisateur durable.

---

## 2. Séparation des responsabilités

Le Core reste responsable de :

```text
multipart contrôlé
→ stockage temporaire sur disque / quarantaine
→ limites Multer
→ filtrage préliminaire du MIME déclaré
→ inspection du contenu
→ checksum SHA-256
→ antivirus
→ fail-closed
→ nettoyage sur échec
→ nettoyage après consommation
```

Le SaaS dérivé reste responsable de :

```text
types réellement autorisés pour son cas d'usage
→ inspecteur de contenu spécialisé si nécessaire
→ parsing métier
→ mapping
→ validation métier
→ persistance métier éventuelle
```

Le Core ne connaît aucun produit, catalogue, fournisseur ou règle métier d'import.

---

## 3. Primitive

Factory :

```js
createSecureTemporaryUploadService({
    policy,
})
```

La factory expose :

```text
uploadSingleFile(fieldName)
inspectUploadedFile(parameters)
processTemporaryUpload({ file, consume })
discardTemporaryFile(filePath)
```

L'usage recommandé pour un import technique est :

```js
router.post(
    "/import",
    uploadService.uploadSingleFile("file"),
    async (req, res, next) => {
        try {
            const result =
                await uploadService.processTemporaryUpload({
                    file: req.file,
                    consume: async (inspectedFile) => {
                        return parseAndValidateImport(
                            inspectedFile.filePath,
                        );
                    },
                });

            res.json({
                status: "success",
                data: result,
            });
        } catch (error) {
            next(error);
        }
    },
    uploadService.cleanupTemporaryUploadOnError,
);
```

`processTemporaryUpload()` supprime le temporaire après le callback `consume`, que celui-ci réussisse ou échoue.

`cleanupTemporaryUploadOnError` constitue la barrière complémentaire pour les erreurs HTTP qui pourraient survenir après Multer mais avant l'appel à `processTemporaryUpload()`. La suppression étant idempotente, un double passage de nettoyage est sans danger.

Si le traitement consommateur et le nettoyage échouent tous les deux, les deux causes sont conservées dans un `AggregateError`.

---

## 4. Politique injectable

Une politique contient :

```js
{
    allowedFileTypes: {
        SOME_FORMAT: {
            mimeType: "application/x-some-format",
            // ou mimeTypes: [...]
            extensions: ["ext"],
            canonicalMimeType:
                "application/x-some-format",
            canonicalExtension: "ext",

            // Facultatif :
            contentInspector:
                async ({
                    filePath,
                    originalName,
                    declaredMimeType,
                }) => {
                    // Retourner true uniquement si le
                    // contenu appartient réellement au format.
                    return true;
                },
        },
    },

    maxFileSizeBytes: 5 * 1024 * 1024,
}
```

`mimeTypes` et `extensions` sont normalisés.

Un `contentInspector` n'est pas une validation métier. Il doit uniquement décider si le contenu peut être considéré comme appartenant au format technique annoncé.

---

## 5. Deux modes d'inspection

### 5.1 Détection générique par signature

Sans `contentInspector`, le Core utilise `file-type`.

Le type détecté doit correspondre à une définition autorisée, puis le MIME déclaré et l'extension du nom original doivent être cohérents avec cette définition.

Le MIME client ou l'extension ne constituent jamais seuls une preuve.

### 5.2 Inspecteur spécialisé

Certains formats ne peuvent pas être distingués de manière fiable par `file-type`.

Dans ce cas, le SaaS dérivé fournit un `contentInspector` dans sa politique.

L'inspecteur doit analyser le contenu réel. Une simple vérification du nom ou du MIME déclaré est insuffisante.

Un retour autre que `true` provoque un refus fermé. Une exception technique de l'inspecteur est propagée comme erreur de traitement après nettoyage du temporaire ; elle n'est pas transformée artificiellement en erreur de format.

---

## 6. CSV, XLS et XLSX

La dépendance actuelle du Core est `file-type ^22.0.2`.

La documentation amont précise notamment :

```text
XLSX / OOXML
→ détectable par file-type

XLS historique / MS-CFB
→ non accepté par file-type

CSV
→ non accepté par file-type
```

Conséquence pour un produit qui autorise ces formats :

```text
XLSX
→ peut utiliser la détection générique par signature
→ le parser métier valide ensuite le classeur

CSV
→ doit fournir un contentInspector adapté au texte
→ le parser CSV reste responsable de la structure métier

XLS
→ doit fournir un contentInspector capable de reconnaître
  réellement un classeur XLS dans le conteneur MS-CFB
→ une simple signature OLE/CFB n'est pas suffisante car elle
  est partagée avec d'autres anciens formats Office
```

Référence amont :

`https://www.npmjs.com/package/file-type`

---

## 7. Sécurité

Le pipeline conserve les garanties existantes :

- un seul fichier multipart par requête ;
- taille maximale configurable ;
- limites de champs/parts ;
- nom physique aléatoire ;
- quarantaine séparée du stockage durable ;
- validation du MIME déclaré ;
- inspection du contenu ;
- checksum SHA-256 ;
- scan antivirus ;
- seul le statut antivirus `clean` autorise la consommation ;
- erreur antivirus = fail-closed ;
- suppression du temporaire après erreur d'inspection ;
- suppression du temporaire après erreur du consommateur ;
- purge de maintenance des temporaires abandonnés ;
- confinement des chemins par le service de fichiers temporaires.

---

## 8. Non-persistance

Cette primitive n'appelle pas le service de persistance du module `File`.

Son utilisation n'implique pas :

```text
document File MongoDB
capability file_upload
quota storage_bytes
quota file_uploads_monthly
corbeille utilisateur
stockage définitif
```

Le SaaS dérivé reste libre d'appliquer ses propres permissions ou capabilities métier sur la route qui utilise cette primitive.

---

## 9. Compatibilité du module File durable

Le module File historique conserve sa politique par défaut :

```text
PDF
JPEG
PNG
```

`multerUpload` continue d'être construit avec :

```text
ALLOWED_FILE_MIME_TYPES
UPLOAD_MAX_FILE_SIZE_BYTES
```

et `inspectUploadedFileType` continue d'utiliser `ALLOWED_FILE_TYPES`.

La configuration temporaire d'un SaaS dérivé ne modifie donc pas les formats autorisés par `POST /api/workspaces/:workspaceId/files`.

---

## 10. Fichiers Core concernés

```text
backend/config/multer.config.js
backend/services/fileInspection/temporaryUploadPolicy.service.js
backend/services/fileInspection/fileType.service.js
backend/services/fileInspection/uploadedFileInspection.service.js
backend/services/fileInspection/secureTemporaryUpload.service.js
backend/services/storage/temporaryFile.service.js
backend/middlewares/uploadMiddleware.js
```

Le pipeline réutilise les services existants ; il ne crée pas une seconde implémentation Multer, antivirus, checksum ou quarantaine.

---

## 11. Tests attendus du SaaS dérivé

Le produit doit tester ses politiques réelles :

```text
format autorisé valide
format non autorisé
MIME déclaré incohérent
extension incohérente
contenu falsifié
inspecteur spécialisé qui refuse
parser métier qui échoue
nettoyage après échec
antivirus indisponible
antivirus infecté
taille maximale
```

Pour les formats que le Core ne reconnaît pas génériquement, le produit doit tester son `contentInspector` avec des fixtures réelles et des fichiers de confusion/spoofing pertinents.

---

## 12. Versionnement

Ce contrat est ajouté sur la baseline 1.2.0 sans publication automatique d'une nouvelle release.

Aucun tag ni bump SemVer n'est requis tant qu'une décision de release distincte n'est pas prise.
