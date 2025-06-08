# 📚 Documentation API - Phi-3 Backend Simple

## Table des matières
- [Vue d'ensemble](#vue-densemble)
- [Installation et configuration](#installation-et-configuration)
- [Authentification](#authentification)
- [Endpoints API](#endpoints-api)
- [Exemples d'utilisation](#exemples-dutilisation)
- [Gestion d'erreurs](#gestion-derreurs)
- [Tests](#tests)

## Vue d'ensemble

Le backend Phi-3 Simple fournit une API RESTful complète pour :
- 🔐 Authentification JWT avec inscription/connexion
- 🤖 Gestion de modèles AI (téléchargement, activation)
- 💬 Chat avec IA via llama.cpp
- 📝 Système de preprompts personnalisables
- 📊 Historique des conversations

### Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   llama.cpp     │
│   (React/Vue)   │◄──►│   (Express)     │◄──►│   (Models)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   SQLite DB     │
                       │   (Users/Chat)  │
                       └─────────────────┘
```

## Installation et configuration

### Prérequis
- Node.js 18+
- npm ou yarn
- llama.cpp compilé
- curl (pour téléchargements)

### Installation rapide
```bash
git clone https://github.com/creach-t/phi3-backend-simple.git
cd phi3-backend-simple
npm install
cp .env.example .env
# Éditer .env avec vos paramètres
npm run dev
```

### Configuration .env
```bash
# Serveur
PORT=3000
NODE_ENV=development

# JWT (IMPORTANT: Changer pour la production)
JWT_SECRET=votre-super-secret-jwt-key-tres-securisee
JWT_EXPIRES_IN=86400

# Base de données
DB_PATH=./database.sqlite

# CORS
CORS_ORIGIN=http://localhost:3001

# llama.cpp (Chemin vers l'exécutable compilé)
LLAMA_CPP_PATH=/path/to/llama.cpp/main
PHI3_MAX_TOKENS=2048
PHI3_TEMPERATURE=0.7

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Authentification

L'API utilise **JWT (JSON Web Tokens)** pour l'authentification.

### Workflow d'authentification
1. **Inscription** : `POST /api/auth/register`
2. **Connexion** : `POST /api/auth/login` → Récupérer le token
3. **Utilisation** : Ajouter `Authorization: Bearer <token>` aux headers
4. **Déconnexion** : `POST /api/auth/logout`

### Token JWT
- **Durée de vie** : 24h par défaut
- **Contenu** : userId, email, username
- **Format** : `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## Endpoints API

### Base URL
```
http://localhost:3000/api
```

---

## 🔐 Authentification

### POST /api/auth/register
Inscription d'un nouvel utilisateur.

**Corps de la requête :**
```json
{
  "email": "user@example.com",
  "username": "username",
  "password": "password123"
}
```

**Réponse (201) :**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "username": "username",
      "createdAt": "2025-06-08T10:00:00.000Z",
      "updatedAt": "2025-06-08T10:00:00.000Z"
    }
  },
  "message": "User registered successfully"
}
```

**Erreurs possibles :**
- `409` : Email déjà utilisé
- `400` : Données invalides

### POST /api/auth/login
Connexion d'un utilisateur existant.

**Corps de la requête :**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Réponse (200) :**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "username": "username",
      "createdAt": "2025-06-08T10:00:00.000Z",
      "updatedAt": "2025-06-08T10:00:00.000Z"
    }
  },
  "message": "Login successful"
}
```

### GET /api/auth/me
Récupère le profil de l'utilisateur connecté.

**Headers requis :**
```
Authorization: Bearer <token>
```

**Réponse (200) :**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "username": "username",
    "createdAt": "2025-06-08T10:00:00.000Z",
    "updatedAt": "2025-06-08T10:00:00.000Z"
  },
  "message": "Profile retrieved successfully"
}
```

---

## 💬 Chat

### POST /api/chat
Envoie un message au modèle IA.

**Authentification :** Optionnelle (pour sauvegarder l'historique)

**Corps de la requête :**
```json
{
  "message": "Bonjour, comment ça va ?",
  "prepromptId": "optional-preprompt-id",
  "history": [
    {
      "role": "user",
      "content": "Message précédent",
      "timestamp": "2025-06-08T10:00:00.000Z"
    }
  ],
  "modelParams": {
    "temperature": 0.7,
    "maxTokens": 2048,
    "topP": 0.9,
    "repeatPenalty": 1.1,
    "contextSize": 4096,
    "seed": -1
  }
}
```

**Réponse (200) :**
```json
{
  "success": true,
  "data": {
    "response": "Bonjour ! Je vais très bien, merci de demander. Comment puis-je vous aider aujourd'hui ?",
    "tokensUsed": 127,
    "processingTime": 2341
  },
  "message": "Response generated successfully"
}
```

### POST /api/chat/stop
Arrête la génération en cours.

**Réponse (200) :**
```json
{
  "success": true,
  "data": {
    "stopped": true
  },
  "message": "Generation stopped successfully"
}
```

### GET /api/chat/status
Récupère le statut du modèle.

**Réponse (200) :**
```json
{
  "success": true,
  "data": {
    "isLoaded": true,
    "modelName": "Phi-3-mini-4k-instruct-q4.gguf",
    "version": "3.0 (via llama.cpp)",
    "lastRequest": "2025-06-08T10:00:00.000Z"
  },
  "message": "Model status retrieved successfully"
}
```

### POST /api/chat/test
Teste la connexion à llama.cpp.

**Réponse (200 ou 503) :**
```json
{
  "success": true,
  "data": {
    "connectionStatus": "OK",
    "isConnected": true,
    "timestamp": "2025-06-08T10:00:00.000Z"
  },
  "message": "Connection test successful"
}
```

---

## 🤖 Gestion des modèles

**Authentification requise pour tous les endpoints.**

### GET /api/models
Liste tous les modèles disponibles.

**Réponse (200) :**
```json
{
  "success": true,
  "data": {
    "models": [
      {
        "name": "Phi-3-mini-4k-instruct-q4",
        "filename": "Phi-3-mini-4k-instruct-q4.gguf",
        "size": 2147483648,
        "path": "/path/to/models/Phi-3-mini-4k-instruct-q4.gguf",
        "isActive": true,
        "downloadDate": "2025-06-08T10:00:00.000Z"
      }
    ],
    "count": 1,
    "totalSize": 2147483648
  },
  "message": "Models listed successfully"
}
```

### POST /api/models/download
Télécharge un modèle depuis Hugging Face.

**Corps de la requête :**
```json
{
  "url": "https://huggingface.co/microsoft/Phi-3-mini-4k-instruct-gguf/resolve/main/Phi-3-mini-4k-instruct-q4.gguf",
  "filename": "optional-custom-name.gguf"
}
```

**Réponse (200) :**
```json
{
  "success": true,
  "data": {
    "downloadId": "1717848000123"
  },
  "message": "Download started successfully"
}
```

### GET /api/models/downloads
Récupère le statut de tous les téléchargements.

**Réponse (200) :**
```json
{
  "success": true,
  "data": {
    "downloads": [
      {
        "id": "1717848000123",
        "url": "https://huggingface.co/...",
        "filename": "Phi-3-mini-4k-instruct-q4.gguf",
        "progress": 75.5,
        "status": "downloading"
      }
    ]
  },
  "message": "Active downloads retrieved"
}
```

### GET /api/models/downloads/:downloadId
Récupère le statut d'un téléchargement spécifique.

### POST /api/models/downloads/:downloadId/cancel
Annule un téléchargement en cours.

### POST /api/models/activate
Active un modèle téléchargé.

**Corps de la requête :**
```json
{
  "filename": "Phi-3-mini-4k-instruct-q4.gguf"
}
```

### DELETE /api/models/:filename
Supprime un modèle (ne peut pas supprimer le modèle actif).

### POST /api/models/downloads/cleanup
Nettoie les téléchargements terminés.

---

## 📝 Preprompts

**Authentification requise pour tous les endpoints.**

### GET /api/preprompts
Liste tous les preprompts.

**Réponse (200) :**
```json
{
  "success": true,
  "data": {
    "preprompts": [
      {
        "id": "1717848000001",
        "name": "Assistant général",
        "content": "Tu es un assistant IA utile, honnête et inoffensif...",
        "description": "Comportement par défaut pour un assistant général",
        "isDefault": true,
        "createdAt": "2025-06-08T10:00:00.000Z",
        "updatedAt": "2025-06-08T10:00:00.000Z"
      }
    ],
    "count": 3
  },
  "message": "Preprompts listed successfully"
}
```

### GET /api/preprompts/default
Récupère le preprompt par défaut.

### GET /api/preprompts/:id
Récupère un preprompt spécifique.

### POST /api/preprompts
Crée un nouveau preprompt.

**Corps de la requête :**
```json
{
  "name": "Assistant créatif",
  "content": "Tu es un assistant créatif qui aide à l'écriture...",
  "description": "Pour l'aide à l'écriture créative",
  "isDefault": false
}
```

### PUT /api/preprompts/:id
Modifie un preprompt existant.

### DELETE /api/preprompts/:id
Supprime un preprompt.

### POST /api/preprompts/:id/set-default
Définit un preprompt comme défaut.

---

## 🩺 Santé et monitoring

### GET /health
Vérifie l'état du serveur.

**Réponse (200) :**
```json
{
  "status": "healthy",
  "timestamp": "2025-06-08T10:00:00.000Z",
  "uptime": 3600
}
```

### GET /api
Informations sur l'API et liste des endpoints.

---

## Exemples d'utilisation

### Workflow complet
```javascript
// 1. Inscription
const registerResponse = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    username: 'user',
    password: 'password123'
  })
});
const { data: { token } } = await registerResponse.json();

// 2. Télécharger un modèle
const downloadResponse = await fetch('/api/models/download', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    url: 'https://huggingface.co/microsoft/Phi-3-mini-4k-instruct-gguf/resolve/main/Phi-3-mini-4k-instruct-q4.gguf'
  })
});

// 3. Activer le modèle (après téléchargement)
await fetch('/api/models/activate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    filename: 'Phi-3-mini-4k-instruct-q4.gguf'
  })
});

// 4. Chatter avec l'IA
const chatResponse = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'Explique-moi les bases de TypeScript',
    modelParams: {
      temperature: 0.7,
      maxTokens: 1000
    }
  })
});
const { data: { response } } = await chatResponse.json();
console.log(response);
```

### Utilisation avec preprompts
```javascript
// Créer un preprompt spécialisé
const prepromptResponse = await fetch('/api/preprompts', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    name: 'Tuteur de programmation',
    content: 'Tu es un tuteur expert en programmation. Tu expliques les concepts de manière simple et donnes des exemples pratiques.',
    description: 'Pour l\'apprentissage de la programmation'
  })
});
const { data: preprompt } = await prepromptResponse.json();

// Utiliser le preprompt dans une conversation
const chatWithPreprompt = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'Comment fonctionnent les promises en JavaScript ?',
    prepromptId: preprompt.id
  })
});
```

## Gestion d'erreurs

### Format des erreurs
```json
{
  "success": false,
  "error": "Error Type",
  "message": "Description détaillée de l'erreur",
  "statusCode": 400
}
```

### Codes d'erreur courants
- **400** : Données invalides, validation échouée
- **401** : Token manquant ou invalide
- **403** : Accès refusé
- **404** : Ressource non trouvée
- **409** : Conflit (ex: email déjà utilisé)
- **429** : Trop de requêtes (rate limiting)
- **500** : Erreur serveur interne

### Exemples d'erreurs
```json
// Validation échouée
{
  "success": false,
  "error": "Validation Error",
  "message": "Email must be a valid email address, Password must be at least 6 characters long"
}

// Token invalide
{
  "success": false,
  "error": "Invalid token",
  "message": "The provided token is invalid or expired"
}

// Rate limiting
{
  "success": false,
  "error": "Too Many Requests",
  "message": "Too many requests from this IP, please try again later."
}
```

## Tests

### Avec Hoppscotch/Postman
Importez la collection de tests disponible dans `/docs/api-tests.json`.

### Tests automatisés
```bash
# Tests de l'API
npm run test

# Tests avec couverture
npm run test:coverage
```

### Variables d'environnement pour tests
```bash
# .env.test
NODE_ENV=test
DB_PATH=./test-database.sqlite
JWT_SECRET=test-secret-key
PORT=3001
```

---

## 🔧 Dépannage

### Problèmes courants

**1. "llama.cpp not found"**
- Vérifiez `LLAMA_CPP_PATH` dans `.env`
- Testez : `/path/to/llama.cpp/main --help`

**2. "Database error"**
- Vérifiez les permissions du dossier
- Supprimez `database.sqlite` pour réinitialiser

**3. "Model not found"**
- Listez les modèles : `GET /api/models`
- Activez un modèle : `POST /api/models/activate`

**4. "Rate limit exceeded"**
- Attendez ou augmentez `RATE_LIMIT_MAX_REQUESTS`

### Logs de débogage
```bash
# Mode debug complet
DEBUG=* npm run dev

# Logs SQLite
NODE_ENV=development DEBUG=sqlite npm run dev
```

---

## 📊 Monitoring et performance

### Métriques disponibles
- Temps de réponse des requêtes
- Utilisation de tokens
- Statut des téléchargements
- Erreurs par endpoint

### Logs structurés
```json
{
  "timestamp": "2025-06-08T10:00:00.000Z",
  "level": "info",
  "message": "Chat request processed",
  "meta": {
    "userId": 1,
    "tokensUsed": 127,
    "processingTime": 2341,
    "modelName": "Phi-3-mini-4k-instruct-q4.gguf"
  }
}
```

---

## 🚀 Déploiement en production

### Configuration recommandée
```bash
# .env.production
NODE_ENV=production
JWT_SECRET=super-secret-key-generated-securely
DB_PATH=/data/phi3-backend.sqlite
LLAMA_CPP_PATH=/usr/local/bin/llama-cpp
RATE_LIMIT_MAX_REQUESTS=50
```

### Docker (optionnel)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Reverse proxy (Nginx)
```nginx
server {
    listen 80;
    server_name api.example.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 📝 Notes de version

### v1.0.0 (2025-06-08)
- ✅ Authentification JWT complète
- ✅ Gestion de modèles avec téléchargement
- ✅ Service llama.cpp intégré
- ✅ Système de preprompts
- ✅ API RESTful documentée
- ✅ Base de données SQLite
- ✅ Sécurité et validation

---

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/amazing-feature`)
3. Commit (`git commit -m 'Add amazing feature'`)
4. Push (`git push origin feature/amazing-feature`)
5. Ouvrir une Pull Request

## 📄 Licence

MIT License - voir le fichier [LICENSE](LICENSE) pour plus de détails.