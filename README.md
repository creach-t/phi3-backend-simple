# Phi-3 Backend Simple

Backend simplifié pour interface de chat Phi-3 avec authentification JWT et système d'inscription.

## Fonctionnalités

- ✅ **Authentification JWT** complète
- ✅ **Système d'inscription** avec validation
- ✅ **Base de données SQLite** simple
- ✅ **API RESTful** claire et documentée
- ✅ **Validation des données** avec Joi
- ✅ **Sécurité** avec Helmet et rate limiting
- ✅ **CORS** configuré
- ✅ **TypeScript** pour la robustesse

## Installation

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

## Configuration

Éditez le fichier `.env` avec vos paramètres :

```bash
PORT=3000
NODE_ENV=development
JWT_SECRET=votre-super-secret-jwt-key-tres-securisee
JWT_EXPIRES_IN=86400
DB_PATH=./database.sqlite
CORS_ORIGIN=http://localhost:3001
```

## Démarrage

```bash
# Mode développement avec rechargement automatique
npm run dev

# Build et démarrage en production
npm run build
npm start
```

## API Endpoints

### Authentification

- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `GET /api/auth/me` - Profil utilisateur (authentifié)
- `POST /api/auth/logout` - Déconnexion

### Chat

- `POST /api/chat` - Envoyer un message au modèle Phi-3
- `GET /api/chat/status` - Statut du modèle

### Santé

- `GET /api/health` - Vérification de l'état du serveur

## Structure du projet

```
src/
├── controllers/     # Logique métier
├── middleware/      # Middlewares Express
├── models/         # Modèles de données
├── routes/         # Définition des routes
├── services/       # Services (DB, Phi-3)
├── types/          # Types TypeScript
├── utils/          # Utilitaires
├── app.ts          # Configuration Express
└── server.ts       # Point d'entrée
```

## Licence

MIT