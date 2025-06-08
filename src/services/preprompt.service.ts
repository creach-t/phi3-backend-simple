import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

export interface Preprompt {
  id: string;
  name: string;
  content: string;
  description?: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePrepromptRequest {
  name: string;
  content: string;
  description?: string;
  isDefault?: boolean;
}

export interface UpdatePrepromptRequest {
  name?: string;
  content?: string;
  description?: string;
  isDefault?: boolean;
}

class PrepromptService {
  private static instance: PrepromptService;
  private prepromptsFile: string;
  private preprompts: Map<string, Preprompt> = new Map();

  constructor() {
    this.prepromptsFile = path.join(process.cwd(), 'data', 'preprompts.json');
    this.ensureDataDir();
    this.loadPreprompts();
  }

  static getInstance(): PrepromptService {
    if (!PrepromptService.instance) {
      PrepromptService.instance = new PrepromptService();
    }
    return PrepromptService.instance;
  }

  private ensureDataDir(): void {
    const dataDir = path.dirname(this.prepromptsFile);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      logger.info('Created data directory');
    }
  }

  private loadPreprompts(): void {
    try {
      if (fs.existsSync(this.prepromptsFile)) {
        const data = fs.readFileSync(this.prepromptsFile, 'utf8');
        const prepromptsArray: Preprompt[] = JSON.parse(data);
        
        this.preprompts.clear();
        prepromptsArray.forEach(preprompt => {
          // Convertir les dates string en objets Date
          preprompt.createdAt = new Date(preprompt.createdAt);
          preprompt.updatedAt = new Date(preprompt.updatedAt);
          this.preprompts.set(preprompt.id, preprompt);
        });
        
        logger.info(`Loaded ${this.preprompts.size} preprompts`);
      } else {
        // Créer des preprompts par défaut
        this.createDefaultPreprompts();
      }
    } catch (error) {
      logger.error('Error loading preprompts:', error);
      this.createDefaultPreprompts();
    }
  }

  private savePreprompts(): void {
    try {
      const prepromptsArray = Array.from(this.preprompts.values());
      fs.writeFileSync(this.prepromptsFile, JSON.stringify(prepromptsArray, null, 2));
      logger.debug('Preprompts saved to file');
    } catch (error) {
      logger.error('Error saving preprompts:', error);
      throw new Error('Failed to save preprompts');
    }
  }

  private createDefaultPreprompts(): void {
    const defaultPreprompts: CreatePrepromptRequest[] = [
      {
        name: 'Assistant général',
        content: 'Tu es un assistant IA utile, honnête et inoffensif. Tu réponds de manière claire, concise et respectueuse. Si tu ne connais pas quelque chose, tu l\'admets plutôt que d\'inventer une réponse.',
        description: 'Comportement par défaut pour un assistant général',
        isDefault: true
      },
      {
        name: 'Développeur',
        content: 'Tu es un développeur expert avec une grande expérience en programmation. Tu aides à résoudre des problèmes de code, tu expliques des concepts techniques et tu proposes des solutions optimisées. Tu donnes des exemples de code clairs et bien commentés.',
        description: 'Spécialisé dans l\'aide au développement'
      },
      {
        name: 'Rédacteur',
        content: 'Tu es un rédacteur professionnel avec une excellente maîtrise de la langue française. Tu aides à améliorer les textes, corriger les erreurs, et adapter le style selon le contexte. Tu donnes des conseils clairs pour améliorer la qualité rédactionnelle.',
        description: 'Aide à la rédaction et correction de textes'
      }
    ];

    defaultPreprompts.forEach(preprompt => {
      this.createPreprompt(preprompt);
    });

    logger.info('Created default preprompts');
  }

  listPreprompts(): Preprompt[] {
    return Array.from(this.preprompts.values()).sort((a, b) => {
      // Mettre les preprompts par défaut en premier
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  getPreprompt(id: string): Preprompt | null {
    return this.preprompts.get(id) || null;
  }

  getDefaultPreprompt(): Preprompt | null {
    const defaults = Array.from(this.preprompts.values()).filter(p => p.isDefault);
    return defaults.length > 0 ? defaults[0] : null;
  }

  createPreprompt(data: CreatePrepromptRequest): Preprompt {
    // Vérifier si le nom existe déjà
    const existing = Array.from(this.preprompts.values()).find(p => p.name === data.name);
    if (existing) {
      throw new Error(`Un preprompt avec le nom "${data.name}" existe déjà`);
    }

    // Si c'est marqué comme défaut, retirer le défaut des autres
    if (data.isDefault) {
      this.preprompts.forEach(preprompt => {
        if (preprompt.isDefault) {
          preprompt.isDefault = false;
          preprompt.updatedAt = new Date();
        }
      });
    }

    const preprompt: Preprompt = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name: data.name,
      content: data.content,
      description: data.description,
      isDefault: data.isDefault || false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.preprompts.set(preprompt.id, preprompt);
    this.savePreprompts();
    
    logger.info(`Created preprompt: ${preprompt.name}`);
    return preprompt;
  }

  updatePreprompt(id: string, data: UpdatePrepromptRequest): Preprompt {
    const preprompt = this.preprompts.get(id);
    if (!preprompt) {
      throw new Error('Preprompt non trouvé');
    }

    // Vérifier si le nouveau nom existe déjà (sauf pour le preprompt actuel)
    if (data.name && data.name !== preprompt.name) {
      const existing = Array.from(this.preprompts.values()).find(p => p.name === data.name && p.id !== id);
      if (existing) {
        throw new Error(`Un preprompt avec le nom "${data.name}" existe déjà`);
      }
    }

    // Si on marque celui-ci comme défaut, retirer le défaut des autres
    if (data.isDefault && !preprompt.isDefault) {
      this.preprompts.forEach(p => {
        if (p.isDefault && p.id !== id) {
          p.isDefault = false;
          p.updatedAt = new Date();
        }
      });
    }

    // Mettre à jour les champs
    if (data.name !== undefined) preprompt.name = data.name;
    if (data.content !== undefined) preprompt.content = data.content;
    if (data.description !== undefined) preprompt.description = data.description;
    if (data.isDefault !== undefined) preprompt.isDefault = data.isDefault;
    preprompt.updatedAt = new Date();

    this.savePreprompts();
    
    logger.info(`Updated preprompt: ${preprompt.name}`);
    return preprompt;
  }

  deletePreprompt(id: string): boolean {
    const preprompt = this.preprompts.get(id);
    if (!preprompt) {
      throw new Error('Preprompt non trouvé');
    }

    // Empêcher la suppression du preprompt par défaut s'il n'y en a qu'un
    if (preprompt.isDefault) {
      const defaultCount = Array.from(this.preprompts.values()).filter(p => p.isDefault).length;
      if (defaultCount === 1) {
        throw new Error('Impossible de supprimer le seul preprompt par défaut');
      }
    }

    this.preprompts.delete(id);
    this.savePreprompts();
    
    logger.info(`Deleted preprompt: ${preprompt.name}`);
    return true;
  }

  setDefault(id: string): Preprompt {
    const preprompt = this.preprompts.get(id);
    if (!preprompt) {
      throw new Error('Preprompt non trouvé');
    }

    // Retirer le défaut de tous les autres
    this.preprompts.forEach(p => {
      if (p.isDefault && p.id !== id) {
        p.isDefault = false;
        p.updatedAt = new Date();
      }
    });

    // Marquer celui-ci comme défaut
    preprompt.isDefault = true;
    preprompt.updatedAt = new Date();

    this.savePreprompts();
    
    logger.info(`Set default preprompt: ${preprompt.name}`);
    return preprompt;
  }
}

export { PrepromptService };