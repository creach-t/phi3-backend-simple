# Phi-3 Backend Simple

Backend simplifié pour interface de chat Phi-3 avec authentification JWT, gestion de modèles et système d'inscription complet.

## ✨ Fonctionnalités

- ✅ **Authentification JWT complète** avec inscription/connexion
- ✅ **Gestion de modèles** (téléchargement, activation, suppression)
- ✅ **Service llama.cpp** intégré avec génération de réponses
- ✅ **Système de preprompts** avec gestion CRUD
- ✅ **Base de données SQLite** simple et efficace
- ✅ **API RESTful** claire et documentée
- ✅ **Validation des données** avec Joi
- ✅ **Sécurité** avec Helmet et rate limiting
- ✅ **CORS** configuré
- ✅ **TypeScript** pour la robustesse

## 🚀 Installation

```bash
# Cloner le repository
git clone https://github.com/creach-t/phi3-backend-simple.git
cd phi3-backend-simple

# Installer les dépendances
npm install

# Copier le fichier d'environnement
cp .env.example .env

# Éditer le fichier .env avec vos paramètres
nano .env
```

## ⚙️ Configuration

Éditez le fichier `.env` avec vos paramètres :

```bash
# Serveur
PORT=3000
NODE_ENV=development

# JWT
JWT_SECRET=votre-super-secret-jwt-key-tres-securisee
JWT_EXPIRES_IN=86400

# Base de données
DB_PATH=./database.sqlite

# CORS
CORS_ORIGIN=http://localhost:3001

# llama.cpp et Phi-3
LLAMA_CPP_PATH=/path/to/llama.cpp/main
PHI3_MAX_TOKENS=2048
PHI3_TEMPERATURE=0.7
```

## 📋 Prérequis

1. **Node.js** 18+ et npm
2. **llama.cpp** compilé sur votre système
3. **curl** pour le téléchargement de modèles

### Installation de llama.cpp

```bash
# Cloner et compiler llama.cpp
git clone https://github.com/ggerganov/llama.cpp.git
cd llama.cpp
make

# Mettre à jour le chemin dans .env
LLAMA_CPP_PATH=/path/to/llama.cpp/main
```

## 🎯 Démarrage

```bash
# Mode développement avec rechargement automatique
npm run dev

# Build et démarrage en production
npm run build
npm start
```

## 🔗 API Endpoints

### 🔐 Authentification
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `GET /api/auth/me` - Profil utilisateur (authentifié)
- `POST /api/auth/logout` - Déconnexion

### 💬 Chat
- `POST /api/chat` - Envoyer un message au modèle
- `POST /api/chat/stop` - Arrêter la génération en cours
- `GET /api/chat/status` - Statut du modèle
- `POST /api/chat/test` - Test de connexion llama.cpp

### 🤖 Gestion des modèles
- `GET /api/models` - Lister tous les modèles
- `POST /api/models/download` - Télécharger un modèle depuis Hugging Face
- `POST /api/models/activate` - Activer un modèle
- `DELETE /api/models/:filename` - Supprimer un modèle
- `GET /api/models/downloads` - Statut des téléchargements
- `POST /api/models/downloads/:id/cancel` - Annuler un téléchargement

### 📝 Preprompts
- `GET /api/preprompts` - Lister tous les preprompts
- `GET /api/preprompts/default` - Obtenir le preprompt par défaut
- `GET /api/preprompts/:id` - Obtenir un preprompt spécifique
- `POST /api/preprompts` - Créer un nouveau preprompt
- `PUT /api/preprompts/:id` - Modifier un preprompt
- `DELETE /api/preprompts/:id` - Supprimer un preprompt
- `POST /api/preprompts/:id/set-default` - Définir comme défaut

### 🩺 Santé
- `GET /health` - Vérification de l'état du serveur
- `GET /api/` - Informations sur l'API

## 📁 Structure du projet

```
src/
├── controllers/         # Logique métier
│   ├── auth.controller.ts
│   ├── chat.controller.ts
│   ├── model.controller.ts
│   └── preprompt.controller.ts
├── middleware/         # Middlewares Express
│   ├── auth.middleware.ts
│   └── error.middleware.ts
├── routes/            # Définition des routes
│   ├── auth.routes.ts
│   ├── chat.routes.ts
│   ├── model.routes.ts
│   ├── preprompt.routes.ts
│   └── index.ts
├── services/          # Services métier
│   ├── database.service.ts
│   ├── llama.service.ts
│   ├── model.service.ts
│   ├── phi3.service.ts
│   └── preprompt.service.ts
├── types/             # Types TypeScript
│   ├── auth.types.ts
│   ├── chat.types.ts
│   └── common.types.ts
├── utils/             # Utilitaires
│   ├── jwt.ts
│   ├── logger.ts
│   └── validation.ts
├── app.ts             # Configuration Express
└── server.ts          # Point d'entrée
```

## 🔧 Utilisation

### 1. Télécharger un modèle

```bash
curl -X POST http://localhost:3000/api/models/download \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "url": "https://huggingface.co/microsoft/Phi-3-mini-4k-instruct-gguf/resolve/main/Phi-3-mini-4k-instruct-q4.gguf"
  }'
```

### 2. Activer un modèle

```bash
curl -X POST http://localhost:3000/api/models/activate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"filename": "Phi-3-mini-4k-instruct-q4.gguf"}'
```

### 3. Envoyer un message

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Salut, comment ça va ?",
    "prepromptId": "preprompt_id_optional",
    "modelParams": {
      "temperature": 0.7,
      "maxTokens": 2048
    }
  }'
```

## 🐛 Dépannage

### Erreur "llama.cpp not found"
- Vérifiez que `LLAMA_CPP_PATH` pointe vers l'exécutable llama.cpp compilé
- Testez manuellement : `/path/to/llama.cpp/main --help`

### Erreur "Model not found"
- Vérifiez qu'un modèle est activé : `GET /api/models`
- Les modèles sont stockés dans le dossier `models/`

### Problèmes de téléchargement
- Vérifiez que `curl` est installé
- Les URLs doivent être des liens directs vers des fichiers .gguf depuis Hugging Face

## 📄 Licence

MIT

---

**Note**: Ce backend est simplifié mais complet. Toutes les fonctionnalités de l'ancien système sont présentes dans une architecture plus claire et maintenable.