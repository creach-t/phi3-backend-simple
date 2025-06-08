# 🔧 Guide d'installation et de configuration

## Table des matières
- [Prérequis](#prérequis)
- [Installation](#installation)
- [Configuration](#configuration)
- [llama.cpp](#llamacpp)
- [Premier démarrage](#premier-démarrage)
- [Dépannage](#dépannage)

## Prérequis

### Système requis
- **OS** : Linux, macOS, ou Windows (avec WSL recommandé)
- **Node.js** : Version 18.0 ou supérieure
- **RAM** : Minimum 4GB (8GB+ recommandé pour les modèles)
- **Stockage** : 10GB+ libres (pour les modèles)
- **CPU** : Compatible avec llama.cpp (x86_64, ARM64)

### Outils nécessaires
```bash
# Vérifier Node.js
node --version  # Doit être >= 18.0

# Installer les outils de build (si nécessaire)
# Ubuntu/Debian
sudo apt update
sudo apt install build-essential git curl

# macOS
xcode-select --install

# Windows (PowerShell en admin)
# Installer Visual Studio Build Tools ou Visual Studio Community
```

## Installation

### 1. Cloner le repository
```bash
git clone https://github.com/creach-t/phi3-backend-simple.git
cd phi3-backend-simple
```

### 2. Installer les dépendances
```bash
# Avec npm
npm install

# Ou avec yarn
yarn install
```

### 3. Configuration de base
```bash
# Copier le fichier d'environnement
cp .env.example .env

# Éditer la configuration
nano .env  # ou code .env
```

## Configuration

### Variables d'environnement (.env)

#### Serveur
```bash
# Port d'écoute du serveur
PORT=3000

# Environnement (development, production, test)
NODE_ENV=development
```

#### JWT (IMPORTANT pour la sécurité)
```bash
# Secret pour signer les tokens JWT
# ⚠️ CHANGER ABSOLUMENT pour la production
JWT_SECRET=votre-super-secret-jwt-key-tres-securisee

# Durée de validité des tokens en secondes (24h = 86400)
JWT_EXPIRES_IN=86400
```

**Générer une clé sécurisée :**
```bash
# Méthode 1 : OpenSSL
openssl rand -base64 32

# Méthode 2 : Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Méthode 3 : En ligne
# https://generate-secret.vercel.app/32
```

#### Base de données
```bash
# Chemin vers la base SQLite
DB_PATH=./database.sqlite

# Pour production, utiliser un chemin absolu
# DB_PATH=/var/lib/phi3-backend/database.sqlite
```

#### CORS
```bash
# Origine autorisée pour les requêtes cross-origin
CORS_ORIGIN=http://localhost:3001

# Plusieurs origines (séparées par des virgules)
# CORS_ORIGIN=http://localhost:3001,https://myapp.com
```

#### llama.cpp et modèles
```bash
# Chemin vers l'exécutable llama.cpp compilé
LLAMA_CPP_PATH=/path/to/llama.cpp/main

# Paramètres par défaut des modèles
PHI3_MAX_TOKENS=2048
PHI3_TEMPERATURE=0.7
```

#### Rate limiting
```bash
# Fenêtre de temps en millisecondes (15 min = 900000)
RATE_LIMIT_WINDOW_MS=900000

# Nombre max de requêtes par fenêtre
RATE_LIMIT_MAX_REQUESTS=100

# Pour production, réduire à 50-100
# Pour développement, augmenter à 1000
```

### Exemple complet (.env)
```bash
# Serveur
PORT=3000
NODE_ENV=development

# JWT
JWT_SECRET=a1b2c3d4e5f6789abcdef0123456789abcdef0123456789
JWT_EXPIRES_IN=86400

# Base de données
DB_PATH=./database.sqlite

# CORS
CORS_ORIGIN=http://localhost:3001

# llama.cpp
LLAMA_CPP_PATH=/home/user/llama.cpp/main
PHI3_MAX_TOKENS=2048
PHI3_TEMPERATURE=0.7

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## llama.cpp

### Installation de llama.cpp

#### Linux/macOS
```bash
# Cloner le repository
git clone https://github.com/ggerganov/llama.cpp.git
cd llama.cpp

# Compiler avec toutes les optimisations
make clean
make -j$(nproc)

# Pour GPU NVIDIA (optionnel)
make LLAMA_CUBLAS=1

# Pour GPU AMD (optionnel)
make LLAMA_HIPBLAS=1

# Pour Apple Silicon (M1/M2)
make LLAMA_METAL=1

# Vérifier l'installation
./main --help
```

#### Windows (avec MSYS2/MinGW)
```bash
# Installer MSYS2 depuis https://www.msys2.org/
# Dans MSYS2 terminal:
pacman -S mingw-w64-x86_64-gcc mingw-w64-x86_64-make git

# Cloner et compiler
git clone https://github.com/ggerganov/llama.cpp.git
cd llama.cpp
make
```

### Configuration du chemin
```bash
# Trouver le chemin complet de l'exécutable
which llama.cpp  # ou whereis llama.cpp

# Exemple de chemins typiques :
# Linux: /home/user/llama.cpp/main
# macOS: /Users/user/llama.cpp/main
# Windows: C:\msys64\home\user\llama.cpp\main.exe

# Mettre à jour .env
LLAMA_CPP_PATH=/chemin/vers/llama.cpp/main
```

### Test de llama.cpp
```bash
# Tester que llama.cpp fonctionne
/path/to/llama.cpp/main --help

# Doit afficher l'aide de llama.cpp
# Si erreur "Permission denied" :
chmod +x /path/to/llama.cpp/main
```

## Premier démarrage

### 1. Compilation TypeScript
```bash
# Vérifier que TypeScript compile sans erreur
npm run type-check

# Si erreurs, les corriger avant de continuer
```

### 2. Démarrage en mode développement
```bash
# Démarrer avec rechargement automatique
npm run dev

# Vous devriez voir :
# [INFO] Created models directory
# [INFO] Created data directory  
# [INFO] Created default preprompts
# [INFO] Database initialized successfully
# [INFO] Server running on port 3000
# [INFO] 🚀 Phi-3 Backend Simple is ready!
```

### 3. Test de base
```bash
# Tester que le serveur répond
curl http://localhost:3000/health

# Réponse attendue :
# {"status":"healthy","timestamp":"...","uptime":123}
```

### 4. Test de llama.cpp
```bash
# Tester la connexion llama.cpp
curl -X POST http://localhost:3000/api/chat/test

# Si llama.cpp est configuré correctement :
# {"success":true,"data":{"connectionStatus":"OK"},...}

# Si erreur :
# {"success":true,"data":{"connectionStatus":"FAILED"},...}
```

## Dépannage

### Problèmes fréquents

#### 1. "Failed to start server"
```bash
# Vérifier les logs complets
npm run dev 2>&1 | tee server.log

# Causes possibles :
# - Port déjà utilisé
# - Permissions de fichier
# - Variables d'environnement manquantes
```

**Solutions :**
```bash
# Port occupé
lsof -i :3000  # Voir quel processus utilise le port
kill -9 PID   # Tuer le processus

# Ou changer le port
echo "PORT=3001" >> .env

# Permissions
chmod 755 .
chmod 644 .env
```

#### 2. "Database error"
```bash
# Vérifier les permissions
ls -la database.sqlite

# Si problème de permissions
sudo chown $USER:$USER database.sqlite
chmod 644 database.sqlite

# Réinitialiser la base (⚠️ perd les données)
rm database.sqlite
npm run dev  # Recrée automatiquement
```

#### 3. "llama.cpp not found"
```bash
# Vérifier le chemin
ls -la $LLAMA_CPP_PATH

# Tester manuellement
$LLAMA_CPP_PATH --help

# Si erreur "command not found"
which llama.cpp
whereis llama
find /usr -name "*llama*" 2>/dev/null
```

**Solutions :**
```bash
# Recompiler llama.cpp
cd /path/to/llama.cpp
git pull
make clean
make -j$(nproc)

# Mettre à jour le chemin
echo "LLAMA_CPP_PATH=$(pwd)/main" >> .env
```

#### 4. "Module not found"
```bash
# Réinstaller les dépendances
rm -rf node_modules package-lock.json
npm install

# Vérifier la version Node.js
node --version  # Doit être >= 18

# Nettoyer le cache npm
npm cache clean --force
```

#### 5. "Permission denied"
```bash
# Problèmes de permissions Unix
sudo chown -R $USER:$USER .
chmod -R 755 .
chmod 644 .env package*.json

# Pour SQLite
mkdir -p data models
chmod 755 data models
```

### Logs de débogage

#### Activer les logs détaillés
```bash
# Mode debug complet
DEBUG=* npm run dev

# Logs spécifiques
DEBUG=express:* npm run dev      # Express seulement
DEBUG=sqlite:* npm run dev       # SQLite seulement
```

#### Analyser les logs
```bash
# Sauvegarder les logs
npm run dev 2>&1 | tee debug.log

# Filtrer les erreurs
grep -i error debug.log
grep -i warning debug.log
```

### Tests de connectivité

#### Test réseau
```bash
# Vérifier que le port est ouvert
netstat -tlnp | grep :3000
ss -tlnp | grep :3000

# Test depuis une autre machine
curl -i http://IP_SERVER:3000/health
```

#### Test llama.cpp
```bash
# Test minimal avec un prompt court
$LLAMA_CPP_PATH -m /path/to/model.gguf -p "Hello" -n 10

# Si erreur "model not found", télécharger d'abord un modèle
```

### Performance et mémoire

#### Monitoring des ressources
```bash
# Utilisation CPU/RAM
htop
top -p $(pgrep -f "node.*server.ts")

# Espace disque
df -h .
du -sh models/

# Mémoire du processus Node.js
ps aux | grep node
```

#### Optimisation
```bash
# Augmenter la limite de mémoire Node.js
export NODE_OPTIONS="--max-old-space-size=4096"
npm run dev

# Ou dans package.json
"scripts": {
  "dev": "NODE_OPTIONS='--max-old-space-size=4096' ts-node-dev ..."
}
```

### Configuration avancée

#### Variables d'environnement système
```bash
# Ajouter au .bashrc/.zshrc
export LLAMA_CPP_PATH="/usr/local/bin/llama-cpp"
export PHI3_MODELS_PATH="/var/lib/phi3-models"

# Recharger
source ~/.bashrc
```

#### Systemd (Linux production)
```bash
# Créer /etc/systemd/system/phi3-backend.service
[Unit]
Description=Phi-3 Backend Simple
After=network.target

[Service]
Type=simple
User=phi3
WorkingDirectory=/opt/phi3-backend-simple
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target

# Activer
sudo systemctl enable phi3-backend
sudo systemctl start phi3-backend
```

#### Docker (optionnel)
```dockerfile
FROM node:18-alpine

# Installer les dépendances système
RUN apk add --no-cache git build-base curl

# Répertoire de travail
WORKDIR /app

# Copier et installer les dépendances
COPY package*.json ./
RUN npm ci --only=production

# Copier le code source
COPY . .

# Compiler TypeScript
RUN npm run build

# Créer un utilisateur non-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S phi3 -u 1001
USER phi3

# Exposer le port
EXPOSE 3000

# Démarrer l'application
CMD ["npm", "start"]
```

### Support et aide

#### Logs utiles pour le support
```bash
# Informations système
uname -a
node --version
npm --version

# Configuration actuelle
cat .env
ls -la

# Logs d'erreur
tail -50 debug.log
```

#### Où demander de l'aide
1. **Issues GitHub** : https://github.com/creach-t/phi3-backend-simple/issues
2. **Documentation llama.cpp** : https://github.com/ggerganov/llama.cpp
3. **Discord Node.js** : https://discord.gg/nodejs

#### Informations à inclure dans un rapport de bug
- OS et version
- Version Node.js
- Logs d'erreur complets
- Configuration .env (sans les secrets)
- Étapes pour reproduire

---

## ✅ Check-list finale

Avant de passer en production, vérifiez :

- [ ] JWT_SECRET changé et sécurisé
- [ ] Base de données accessible et sauvegardée
- [ ] llama.cpp compilé et testé
- [ ] Modèles téléchargés et activés
- [ ] Ports ouverts dans le firewall
- [ ] Monitoring et logs configurés
- [ ] Sauvegardes automatiques configurées
- [ ] Tests passent avec succès
- [ ] Documentation à jour

🎉 **Votre backend Phi-3 est maintenant prêt !**