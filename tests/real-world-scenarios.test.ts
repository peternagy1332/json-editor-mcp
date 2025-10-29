import { JsonEditorMCPServerTestable } from './JsonEditorMCPServerTestable';
import { createTestFile, readTestFile } from './setup';
import { createObjectWithDuplicateKeys } from './test-helpers';
import { promises as fs } from 'fs';
import path from 'path';

describe('Real-World Scenarios', () => {
  let server: JsonEditorMCPServerTestable;
  const testDir = path.join(__dirname, 'temp');

  beforeEach(async () => {
    server = new JsonEditorMCPServerTestable();
    // Ensure test directory exists
    await fs.mkdir(testDir, { recursive: true });
  });

  describe('Internationalization (i18n) Management', () => {
    it('should handle complex i18n translation merging', async () => {
      // Simulate a real i18n scenario with multiple language files
      const baseTranslations = {
        common: {
          welcome: 'Welcome',
          goodbye: 'Goodbye',
          loading: 'Loading...',
          error: 'An error occurred'
        },
        navigation: {
          home: 'Home',
          about: 'About',
          contact: 'Contact'
        },
        forms: {
          submit: 'Submit',
          cancel: 'Cancel',
          required: 'This field is required'
        }
      };

      const updatedTranslations = {
        common: {
          welcome: 'Bienvenue',
          hello: 'Bonjour',
          loading: 'Chargement...'
        },
        navigation: {
          home: 'Accueil',
          about: 'À propos',
          contact: 'Contact',
          services: 'Services'
        },
        forms: {
          submit: 'Soumettre',
          cancel: 'Annuler',
          required: 'Ce champ est requis',
          optional: 'Optionnel'
        }
      };

      const input = createObjectWithDuplicateKeys([
        ['translations', baseTranslations],
        ['translations', updatedTranslations]
      ]);

      const filePath = await createTestFile('i18n.json', input);
      await server.mergeDuplicateKeys(filePath);
      
      const result = await readTestFile(filePath);

      expect(result.translations.common.welcome).toBe('Bienvenue');
      expect(result.translations.common.hello).toBe('Bonjour'); // New
      expect(result.translations.navigation.services).toBe('Services'); // New
      expect(result.translations.forms.optional).toBe('Optionnel'); // New
    });

    it('should handle nested i18n structures with multiple levels', async () => {
      const complexTranslations = {
        pages: {
          home: {
            title: 'Home Page',
            description: 'Welcome to our website',
            sections: {
              hero: {
                title: 'Welcome',
                subtitle: 'Discover amazing features'
              },
              features: {
                title: 'Features',
                items: {
                  feature1: 'Feature 1',
                  feature2: 'Feature 2'
                }
              }
            }
          },
          about: {
            title: 'About Us',
            description: 'Learn more about our company'
          }
        }
      };

      const updatedTranslations = {
        pages: {
          home: {
            title: 'Página Principal',
            description: 'Bienvenido a nuestro sitio web',
            sections: {
              hero: {
                title: 'Bienvenido',
                subtitle: 'Descubre características increíbles'
              },
              features: {
                title: 'Características',
                items: {
                  feature1: 'Característica 1',
                  feature2: 'Característica 2',
                  feature3: 'Característica 3'
                }
              }
            }
          },
          about: {
            title: 'Acerca de Nosotros',
            description: 'Conoce más sobre nuestra empresa'
          },
          contact: {
            title: 'Contacto',
            description: 'Ponte en contacto con nosotros'
          }
        }
      };

      const input = createObjectWithDuplicateKeys([
        ['translations', complexTranslations],
        ['translations', updatedTranslations]
      ]);

      const filePath = await createTestFile('complex-i18n.json', input);
      await server.mergeDuplicateKeys(filePath);
      
      const result = await readTestFile(filePath);

      expect(result.translations.pages.home.title).toBe('Página Principal');
      expect(result.translations.pages.home.sections.hero.title).toBe('Bienvenido');
      expect(result.translations.pages.home.sections.features.items.feature3).toBe('Característica 3');
      expect(result.translations.pages.contact.title).toBe('Contacto');
    });
  });

  describe('Configuration Management', () => {
    it('should handle application configuration merging', async () => {
      const baseConfig = {
        app: {
          name: 'MyApp',
          version: '1.0.0',
          environment: 'development'
        },
        database: {
          host: 'localhost',
          port: 5432,
          name: 'myapp_dev',
          credentials: {
            username: 'dev_user',
            password: 'dev_password'
          }
        },
        api: {
          baseUrl: 'http://localhost:3000',
          timeout: 5000,
          retries: 3
        },
        features: {
          analytics: false,
          logging: true,
          caching: false
        }
      };

      const productionConfig = {
        app: {
          name: 'MyApp',
          version: '1.0.0',
          environment: 'production'
        },
        database: {
          host: 'prod-db.example.com',
          port: 5432,
          name: 'myapp_prod',
          credentials: {
            username: 'prod_user',
            password: 'prod_password',
            ssl: true
          }
        },
        api: {
          baseUrl: 'https://api.myapp.com',
          timeout: 10000,
          retries: 5,
          rateLimit: 1000
        },
        features: {
          analytics: true,
          logging: true,
          caching: true,
          monitoring: true
        }
      };

      const input = createObjectWithDuplicateKeys([
        ['config', baseConfig],
        ['config', productionConfig]
      ]);

      const filePath = await createTestFile('config.json', input);
      await server.mergeDuplicateKeys(filePath);
      
      const result = await readTestFile(filePath);

      expect(result.config.app.environment).toBe('production');
      expect(result.config.database.host).toBe('prod-db.example.com');
      expect(result.config.database.credentials.ssl).toBe(true);
      expect(result.config.api.rateLimit).toBe(1000);
      expect(result.config.features.monitoring).toBe(true);
    });

    it('should handle environment-specific configuration overrides', async () => {
      const baseConfig = {
        logging: {
          level: 'info',
          format: 'json',
          outputs: ['console']
        },
        database: {
          pool: {
            min: 2,
            max: 10,
            idle: 30000
          }
        }
      };

      const stagingOverrides = {
        logging: {
          level: 'debug',
          outputs: ['console', 'file']
        },
        database: {
          pool: {
            min: 5,
            max: 20
          }
        },
        monitoring: {
          enabled: true,
          interval: 60000
        }
      };

      const input = createObjectWithDuplicateKeys([
        ['config', baseConfig],
        ['config', stagingOverrides]
      ]);

      const filePath = await createTestFile('staging-config.json', input);
      await server.mergeDuplicateKeys(filePath);
      
      const result = await readTestFile(filePath);

      expect(result.config.logging.level).toBe('debug');
      expect(result.config.logging.outputs).toEqual(['console', 'file']);
      expect(result.config.database.pool.min).toBe(5);
      expect(result.config.database.pool.max).toBe(20);
      expect(result.config.monitoring.enabled).toBe(true);
    });
  });

  describe('API Response Merging', () => {
    it('should handle API response data merging', async () => {
      const baseResponse = {
        data: {
          users: [
            { id: 1, name: 'John Doe', email: 'john@example.com' },
            { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
          ],
          pagination: {
            page: 1,
            limit: 10,
            total: 2
          }
        },
        meta: {
          timestamp: '2023-01-01T00:00:00Z',
          version: '1.0'
        }
      };

      const updatedResponse = {
        data: {
          users: [
            { id: 1, name: 'John Doe', email: 'john@example.com', status: 'active' },
            { id: 2, name: 'Jane Smith', email: 'jane@example.com', status: 'inactive' },
            { id: 3, name: 'Bob Johnson', email: 'bob@example.com', status: 'active' }
          ],
          pagination: {
            page: 1,
            limit: 10,
            total: 3
          }
        },
        meta: {
          timestamp: '2023-01-01T12:00:00Z',
          version: '1.1',
          source: 'api'
        }
      };

      const input = createObjectWithDuplicateKeys([
        ['response', baseResponse],
        ['response', updatedResponse]
      ]);

      const filePath = await createTestFile('api-response.json', input);
      await server.mergeDuplicateKeys(filePath);
      
      const result = await readTestFile(filePath);

      expect(result.response.data.users).toHaveLength(3);
      expect(result.response.data.users[0].status).toBe('active');
      expect(result.response.data.users[2].name).toBe('Bob Johnson');
      expect(result.response.data.pagination.total).toBe(3);
      expect(result.response.meta.version).toBe('1.1');
      expect(result.response.meta.source).toBe('api');
    });
  });

  describe('User Preferences and Settings', () => {
    it('should handle user preference merging', async () => {
      const defaultPreferences = {
        theme: 'light',
        language: 'en',
        notifications: {
          email: true,
          push: false,
          sms: false
        },
        privacy: {
          profile: 'public',
          data: 'private'
        },
        display: {
          fontSize: 'medium',
          density: 'comfortable'
        }
      };

      const userPreferences = {
        theme: 'dark',
        language: 'es',
        notifications: {
          email: true,
          push: true,
          sms: false
        },
        privacy: {
          profile: 'private',
          data: 'private',
          location: 'hidden'
        },
        display: {
          fontSize: 'large',
          density: 'compact'
        },
        accessibility: {
          highContrast: true,
          screenReader: false
        }
      };

      const input = createObjectWithDuplicateKeys([
        ['preferences', defaultPreferences],
        ['preferences', userPreferences]
      ]);

      const filePath = await createTestFile('user-preferences.json', input);
      await server.mergeDuplicateKeys(filePath);
      
      const result = await readTestFile(filePath);

      expect(result.preferences.theme).toBe('dark');
      expect(result.preferences.language).toBe('es');
      expect(result.preferences.notifications.push).toBe(true);
      expect(result.preferences.privacy.location).toBe('hidden');
      expect(result.preferences.accessibility.highContrast).toBe(true);
    });
  });

  describe('Feature Flags and A/B Testing', () => {
    it('should handle feature flag configuration merging', async () => {
      const baseFlags = {
        features: {
          newDashboard: false,
          darkMode: true,
          analytics: false,
          betaFeatures: false
        },
        experiments: {
          userOnboarding: 'control',
          pricingPage: 'variant-a'
        }
      };

      const updatedFlags = {
        features: {
          newDashboard: true,
          darkMode: true,
          analytics: true,
          betaFeatures: true,
          socialLogin: false
        },
        experiments: {
          userOnboarding: 'variant-b',
          pricingPage: 'variant-a',
          checkoutFlow: 'variant-c'
        },
        rollout: {
          percentage: 50,
          regions: ['US', 'CA']
        }
      };

      const input = createObjectWithDuplicateKeys([
        ['flags', baseFlags],
        ['flags', updatedFlags]
      ]);

      const filePath = await createTestFile('feature-flags.json', input);
      await server.mergeDuplicateKeys(filePath);
      
      const result = await readTestFile(filePath);

      expect(result.flags.features.newDashboard).toBe(true);
      expect(result.flags.features.socialLogin).toBe(false);
      expect(result.flags.experiments.userOnboarding).toBe('variant-b');
      expect(result.flags.experiments.checkoutFlow).toBe('variant-c');
      expect(result.flags.rollout.percentage).toBe(50);
    });
  });

  describe('Data Migration Scenarios', () => {
    it('should handle data structure migration', async () => {
      const oldDataStructure = {
        user: {
          id: 1,
          name: 'John Doe',
          email: 'john@example.com',
          profile: {
            age: 30,
            city: 'New York'
          }
        },
        settings: {
          theme: 'light',
          notifications: true
        }
      };

      const newDataStructure = {
        user: {
          id: 1,
          personalInfo: {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com'
          },
          profile: {
            age: 30,
            location: {
              city: 'New York',
              country: 'US'
            }
          }
        },
        preferences: {
          appearance: {
            theme: 'light'
          },
          notifications: {
            enabled: true,
            types: ['email', 'push']
          }
        }
      };

      const input = createObjectWithDuplicateKeys([
        ['data', oldDataStructure],
        ['data', newDataStructure]
      ]);

      const filePath = await createTestFile('migration.json', input);
      await server.mergeDuplicateKeys(filePath);
      
      const result = await readTestFile(filePath);

      expect(result.data.user.personalInfo.firstName).toBe('John');
      expect(result.data.user.profile.location.country).toBe('US');
      expect(result.data.preferences.notifications.types).toEqual(['email', 'push']);
    });
  });

  describe('Error Recovery and Fallbacks', () => {
    it('should handle partial data corruption gracefully', async () => {
      const validData = {
        users: [
          { id: 1, name: 'John', email: 'john@example.com' },
          { id: 2, name: 'Jane', email: 'jane@example.com' }
        ],
        settings: {
          theme: 'light',
          language: 'en'
        }
      };

      const corruptedData = {
        users: [
          { id: 1, name: 'John', email: 'john@example.com' },
          { id: 2, name: 'Jane', email: 'jane@example.com' },
          { id: 3, name: 'Bob', email: 'bob@example.com' }
        ],
        settings: {
          theme: 'dark',
          language: 'es',
          fontSize: 'large'
        },
        // This might be corrupted data
        invalidField: null
      };

      const input = createObjectWithDuplicateKeys([
        ['data', validData],
        ['data', corruptedData]
      ]);

      const filePath = await createTestFile('corrupted.json', input);
      await server.mergeDuplicateKeys(filePath);
      
      const result = await readTestFile(filePath);

      expect(result.data.users).toHaveLength(3);
      expect(result.data.settings.theme).toBe('dark');
      expect(result.data.settings.fontSize).toBe('large');
      expect(result.data.invalidField).toBeNull();
    });
  });
});
