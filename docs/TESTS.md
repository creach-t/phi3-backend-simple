# 🧪 Collection de tests Hoppscotch

Cette collection contient tous les tests pour valider le bon fonctionnement du backend Phi-3 Simple.

## 📋 Variables d'environnement

Avant de commencer, configurez ces variables dans Hoppscotch :

| Variable | Valeur | Description |
|----------|--------|-------------|
| `BASE_URL` | `http://localhost:3000` | URL de base du serveur |
| `JWT_TOKEN` | *(à définir après login)* | Token d'authentification |
| `DOWNLOAD_ID` | *(généré lors du téléchargement)* | ID du téléchargement en cours |
| `PREPROMPT_ID` | *(récupéré lors de la création)* | ID d'un preprompt créé |

## 🔍 Tests de base

### 1. Santé du serveur ✅
```http
GET {{BASE_URL}}/health
```
**Attendu :** Status 200, réponse avec `status: "healthy"`

### 2. Informations API ✅
```http
GET {{BASE_URL}}/api
```
**Attendu :** Status 200, liste complète des endpoints

---

## 🔐 Tests d'authentification

### 3. Inscription utilisateur ✅
```http
POST {{BASE_URL}}/api/auth/register
Content-Type: application/json

{
  "email": "test@example.com",
  "username": "testuser",
  "password": "password123"
}
```
**Attendu :** Status 201, token JWT + infos utilisateur

### 4. Connexion utilisateur ✅
```http
POST {{BASE_URL}}/api/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123"
}
```
**Attendu :** Status 200, token JWT + infos utilisateur
**Action :** Copier le token dans `JWT_TOKEN`

### 5. Profil utilisateur ✅
```http
GET {{BASE_URL}}/api/auth/me
Authorization: Bearer {{JWT_TOKEN}}
```
**Attendu :** Status 200, infos utilisateur sans mot de passe

### 6. Déconnexion ✅
```http
POST {{BASE_URL}}/api/auth/logout
Authorization: Bearer {{JWT_TOKEN}}
```
**Attendu :** Status 200, message de succès

### 7. Erreur - Email déjà utilisé ❌
```http
POST {{BASE_URL}}/api/auth/register
Content-Type: application/json

{
  "email": "test@example.com",
  "username": "testuser2",
  "password": "password123"
}
```
**Attendu :** Status 409, erreur "User Already Exists"

### 8. Erreur - Mauvais mot de passe ❌
```http
POST {{BASE_URL}}/api/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "wrongpassword"
}
```
**Attendu :** Status 401, erreur "Invalid Credentials"

### 9. Erreur - Token invalide ❌
```http
GET {{BASE_URL}}/api/auth/me
Authorization: Bearer invalid_token_here
```
**Attendu :** Status 401, erreur "Invalid token"

### 10. Erreur - Validation données ❌
```http
POST {{BASE_URL}}/api/auth/register
Content-Type: application/json

{
  "email": "invalid-email",
  "username": "ab",
  "password": "123"
}
```
**Attendu :** Status 400, erreurs de validation détaillées

---

## 💬 Tests de chat

### 11. Statut du modèle ✅
```http
GET {{BASE_URL}}/api/chat/status
```
**Attendu :** Status 200, statut du modèle (probablement pas chargé au début)

### 12. Test connexion llama.cpp ✅
```http
POST {{BASE_URL}}/api/chat/test
```
**Attendu :** Status 200 ou 503 selon la configuration de llama.cpp

### 13. Message simple sans modèle ⚠️
```http
POST {{BASE_URL}}/api/chat
Content-Type: application/json

{
  "message": "Bonjour, comment ça va ?"
}
```
**Attendu :** Probablement erreur car aucun modèle activé

### 14. Chat avec paramètres personnalisés ✅
```http
POST {{BASE_URL}}/api/chat
Content-Type: application/json

{
  "message": "Raconte-moi une histoire courte",
  "modelParams": {
    "temperature": 1.2,
    "maxTokens": 500,
    "topP": 0.9,
    "repeatPenalty": 1.1
  }
}
```
**Attendu :** Status 200 (si modèle activé) ou erreur

### 15. Chat avec historique ✅
```http
POST {{BASE_URL}}/api/chat
Content-Type: application/json

{
  "message": "Et ensuite que s'est-il passé ?",
  "history": [
    {
      "role": "user",
      "content": "Raconte-moi une histoire",
      "timestamp": "2025-06-08T10:00:00Z"
    },
    {
      "role": "assistant", 
      "content": "Il était une fois...",
      "timestamp": "2025-06-08T10:00:05Z"
    }
  ]
}
```
**Attendu :** Status 200, réponse contextuelle

### 16. Arrêter génération ✅
```http
POST {{BASE_URL}}/api/chat/stop
```
**Attendu :** Status 200, génération arrêtée

---

## 🤖 Tests de gestion des modèles

### 17. Lister modèles ✅
```http
GET {{BASE_URL}}/api/models
Authorization: Bearer {{JWT_TOKEN}}
```
**Attendu :** Status 200, liste (vide au début)

### 18. Télécharger modèle Phi-3 ✅
```http
POST {{BASE_URL}}/api/models/download
Authorization: Bearer {{JWT_TOKEN}}
Content-Type: application/json

{
  "url": "https://huggingface.co/microsoft/Phi-3-mini-4k-instruct-gguf/resolve/main/Phi-3-mini-4k-instruct-q4.gguf"
}
```
**Attendu :** Status 200, downloadId
**Action :** Copier le downloadId dans `DOWNLOAD_ID`
**Note :** Téléchargement de ~2GB, prendra du temps

### 19. Statut téléchargements ✅
```http
GET {{BASE_URL}}/api/models/downloads
Authorization: Bearer {{JWT_TOKEN}}
```
**Attendu :** Status 200, liste des téléchargements actifs

### 20. Statut téléchargement spécifique ✅
```http
GET {{BASE_URL}}/api/models/downloads/{{DOWNLOAD_ID}}
Authorization: Bearer {{JWT_TOKEN}}
```
**Attendu :** Status 200, progression du téléchargement

### 21. Annuler téléchargement (optionnel) ⚠️
```http
POST {{BASE_URL}}/api/models/downloads/{{DOWNLOAD_ID}}/cancel
Authorization: Bearer {{JWT_TOKEN}}
```
**Attendu :** Status 200, téléchargement annulé

### 22. Activer modèle (après téléchargement) ✅
```http
POST {{BASE_URL}}/api/models/activate
Authorization: Bearer {{JWT_TOKEN}}
Content-Type: application/json

{
  "filename": "Phi-3-mini-4k-instruct-q4.gguf"
}
```
**Attendu :** Status 200, modèle activé

### 23. Nettoyer téléchargements ✅
```http
POST {{BASE_URL}}/api/models/downloads/cleanup
Authorization: Bearer {{JWT_TOKEN}}
```
**Attendu :** Status 200, téléchargements nettoyés

### 24. Erreur - Supprimer modèle actif ❌
```http
DELETE {{BASE_URL}}/api/models/Phi-3-mini-4k-instruct-q4.gguf
Authorization: Bearer {{JWT_TOKEN}}
```
**Attendu :** Status 400, erreur "modèle actuellement utilisé"

### 25. Erreur - URL invalide ❌
```http
POST {{BASE_URL}}/api/models/download
Authorization: Bearer {{JWT_TOKEN}}
Content-Type: application/json

{
  "url": "https://invalid-url.com/model.txt"
}
```
**Attendu :** Status 400, erreur URL invalide

---

## 📝 Tests de preprompts

### 26. Lister preprompts ✅
```http
GET {{BASE_URL}}/api/preprompts
Authorization: Bearer {{JWT_TOKEN}}
```
**Attendu :** Status 200, liste avec 3 preprompts par défaut

### 27. Preprompt par défaut ✅
```http
GET {{BASE_URL}}/api/preprompts/default
Authorization: Bearer {{JWT_TOKEN}}
```
**Attendu :** Status 200, preprompt "Assistant général"

### 28. Créer nouveau preprompt ✅
```http
POST {{BASE_URL}}/api/preprompts
Authorization: Bearer {{JWT_TOKEN}}
Content-Type: application/json

{
  "name": "Assistant Test",
  "content": "Tu es un assistant de test très sympa et utile.",
  "description": "Preprompt créé pour les tests automatisés",
  "isDefault": false
}
```
**Attendu :** Status 201, nouveau preprompt créé
**Action :** Copier l'ID dans `PREPROMPT_ID`

### 29. Récupérer preprompt spécifique ✅
```http
GET {{BASE_URL}}/api/preprompts/{{PREPROMPT_ID}}
Authorization: Bearer {{JWT_TOKEN}}
```
**Attendu :** Status 200, détails du preprompt

### 30. Modifier preprompt ✅
```http
PUT {{BASE_URL}}/api/preprompts/{{PREPROMPT_ID}}
Authorization: Bearer {{JWT_TOKEN}}
Content-Type: application/json

{
  "name": "Assistant Test Modifié",
  "content": "Tu es un assistant de test très sympa, utile et modifié.",
  "description": "Preprompt modifié lors des tests"
}
```
**Attendu :** Status 200, preprompt modifié

### 31. Définir comme défaut ✅
```http
POST {{BASE_URL}}/api/preprompts/{{PREPROMPT_ID}}/set-default
Authorization: Bearer {{JWT_TOKEN}}
```
**Attendu :** Status 200, preprompt défini comme défaut

### 32. Chat avec preprompt spécifique ✅
```http
POST {{BASE_URL}}/api/chat
Authorization: Bearer {{JWT_TOKEN}}
Content-Type: application/json

{
  "message": "Aide-moi à résoudre un problème de code Python",
  "prepromptId": "{{PREPROMPT_ID}}"
}
```
**Attendu :** Status 200, réponse avec le contexte du preprompt

### 33. Erreur - Preprompt inexistant ❌
```http
GET {{BASE_URL}}/api/preprompts/nonexistent-id
Authorization: Bearer {{JWT_TOKEN}}
```
**Attendu :** Status 404, erreur "Preprompt not found"

### 34. Erreur - Nom déjà utilisé ❌
```http
POST {{BASE_URL}}/api/preprompts
Authorization: Bearer {{JWT_TOKEN}}
Content-Type: application/json

{
  "name": "Assistant général",
  "content": "Contenu test",
  "description": "Test de duplication"
}
```
**Attendu :** Status 400, erreur nom déjà utilisé

---

## 💬 Tests de chat avancés (avec modèle)

### 35. Chat simple avec modèle ✅
```http
POST {{BASE_URL}}/api/chat
Content-Type: application/json

{
  "message": "Salut ! Comment ça va ?"
}
```
**Attendu :** Status 200, réponse du modèle Phi-3

### 36. Chat avec utilisateur authentifié ✅
```http
POST {{BASE_URL}}/api/chat
Authorization: Bearer {{JWT_TOKEN}}
Content-Type: application/json

{
  "message": "Explique-moi les bases de l'intelligence artificielle"
}
```
**Attendu :** Status 200, réponse sauvegardée dans l'historique

### 37. Chat avec tous les paramètres ✅
```http
POST {{BASE_URL}}/api/chat
Authorization: Bearer {{JWT_TOKEN}}
Content-Type: application/json

{
  "message": "Écris un poème sur la technologie",
  "prepromptId": "{{PREPROMPT_ID}}",
  "modelParams": {
    "temperature": 1.1,
    "maxTokens": 300,
    "topP": 0.95,
    "repeatPenalty": 1.2,
    "contextSize": 2048,
    "seed": 42
  },
  "history": [
    {
      "role": "user",
      "content": "J'aime la poésie",
      "timestamp": "2025-06-08T10:00:00Z"
    }
  ]
}
```
**Attendu :** Status 200, poème créatif

---

## 🧹 Tests de nettoyage

### 38. Supprimer preprompt de test ✅
```http
DELETE {{BASE_URL}}/api/preprompts/{{PREPROMPT_ID}}
Authorization: Bearer {{JWT_TOKEN}}
```
**Attendu :** Status 200, preprompt supprimé

### 39. Vérification finale ✅
```http
GET {{BASE_URL}}/api
```
**Attendu :** Status 200, API toujours fonctionnelle

---

## 📊 Résultats attendus

### ✅ Succès complet
- **39/39 tests passent** : Backend parfaitement fonctionnel
- Toutes les fonctionnalités opérationnelles
- Prêt pour la production

### ⚠️ Succès partiel
- **Tests auth (3-10) passent** : Authentification OK
- **Tests preprompts (26-34) passent** : Gestion preprompts OK
- **Tests chat échouent** : Problème avec llama.cpp ou modèles

### ❌ Échecs critiques
- **Tests de base (1-2) échouent** : Serveur non démarré
- **Tests auth échouent** : Problème de base de données
- **Erreurs 500** : Configuration incorrecte

## 🔧 Actions selon les résultats

### Si tests llama.cpp échouent (12, 35-37)
1. Vérifier `LLAMA_CPP_PATH` dans `.env`
2. Tester manuellement : `/path/to/llama.cpp/main --help`
3. Recompiler llama.cpp si nécessaire

### Si téléchargement échoue (18-22)
1. Vérifier la connexion internet
2. Tester curl manuellement
3. Vérifier l'espace disque disponible

### Si authentification échoue (3-10)
1. Vérifier `JWT_SECRET` dans `.env`
2. Réinitialiser la base de données
3. Supprimer `database.sqlite` et redémarrer

### Si preprompts échouent (26-34)
1. Vérifier les permissions du dossier `data/`
2. Supprimer `data/preprompts.json` pour réinitialiser

## 📝 Script de test automatique

Vous pouvez également utiliser ce script bash pour tester rapidement :

```bash
#!/bin/bash
# test-api.sh

BASE_URL="http://localhost:3000"
JWT_TOKEN=""

echo "🧪 Tests automatiques du backend Phi-3"
echo "====================================="

# Test 1: Santé du serveur
echo "1. Test santé du serveur..."
curl -s "${BASE_URL}/health" | jq -r '.status // "FAILED"'

# Test 2: Inscription
echo "2. Test inscription..."
REGISTER_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","username":"testuser","password":"password123"}')

if echo "$REGISTER_RESPONSE" | jq -e '.success' >/dev/null; then
  JWT_TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.data.token')
  echo "✅ Inscription réussie"
else
  echo "❌ Inscription échouée"
  echo "$REGISTER_RESPONSE" | jq -r '.message // .error'
fi

# Test 3: Profil utilisateur
if [ ! -z "$JWT_TOKEN" ]; then
  echo "3. Test profil utilisateur..."
  PROFILE_RESPONSE=$(curl -s "${BASE_URL}/api/auth/me" \
    -H "Authorization: Bearer $JWT_TOKEN")
  
  if echo "$PROFILE_RESPONSE" | jq -e '.success' >/dev/null; then
    echo "✅ Profil récupéré"
  else
    echo "❌ Profil échoué"
  fi
fi

# Test 4: Liste des modèles
if [ ! -z "$JWT_TOKEN" ]; then
  echo "4. Test liste des modèles..."
  MODELS_RESPONSE=$(curl -s "${BASE_URL}/api/models" \
    -H "Authorization: Bearer $JWT_TOKEN")
  
  if echo "$MODELS_RESPONSE" | jq -e '.success' >/dev/null; then
    MODEL_COUNT=$(echo "$MODELS_RESPONSE" | jq -r '.data.count')
    echo "✅ Modèles listés: $MODEL_COUNT modèles"
  else
    echo "❌ Liste modèles échouée"
  fi
fi

# Test 5: Liste des preprompts
if [ ! -z "$JWT_TOKEN" ]; then
  echo "5. Test liste des preprompts..."
  PREPROMPTS_RESPONSE=$(curl -s "${BASE_URL}/api/preprompts" \
    -H "Authorization: Bearer $JWT_TOKEN")
  
  if echo "$PREPROMPTS_RESPONSE" | jq -e '.success' >/dev/null; then
    PREPROMPT_COUNT=$(echo "$PREPROMPTS_RESPONSE" | jq -r '.data.count')
    echo "✅ Preprompts listés: $PREPROMPT_COUNT preprompts"
  else
    echo "❌ Liste preprompts échouée"
  fi
fi

# Test 6: Test connexion llama.cpp
echo "6. Test connexion llama.cpp..."
LLAMA_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/chat/test")
CONNECTION_STATUS=$(echo "$LLAMA_RESPONSE" | jq -r '.data.connectionStatus // "UNKNOWN"')

if [ "$CONNECTION_STATUS" = "OK" ]; then
  echo "✅ llama.cpp connecté"
else
  echo "⚠️  llama.cpp non connecté ($CONNECTION_STATUS)"
fi

echo ""
echo "🏁 Tests terminés!"
echo "Pour des tests complets, utilisez Hoppscotch avec la collection fournie."
```

## 📄 Rapport de test

Après avoir exécuté tous les tests, documentez vos résultats :

### Environnement de test
- **OS :** 
- **Node.js :** 
- **Backend version :** 
- **llama.cpp :** Disponible ✅/❌

### Résultats par catégorie
- **Tests de base (1-2) :** ✅/❌
- **Tests auth (3-10) :** ✅/❌ 
- **Tests chat (11-16) :** ✅/❌
- **Tests modèles (17-25) :** ✅/❌
- **Tests preprompts (26-34) :** ✅/❌
- **Tests avancés (35-37) :** ✅/❌

### Notes
- Temps de réponse moyen : 
- Problèmes rencontrés :
- Configuration spéciale :

### Recommandations
- [ ] Prêt pour la production
- [ ] Nécessite des corrections
- [ ] Configuration llama.cpp requise

---

Cette collection de tests vous assure un backend robuste et fiable ! 🚀