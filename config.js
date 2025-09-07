// Configuration constants for the trading calculator

// Google Sheets configuration
const GOOGLE_SHEETS_CONFIG = {
  sheetUrl: 'https://docs.google.com/spreadsheets/d/14wIYWZ_QSJN0bFQTeQxD8IYSN4J3UZ9tMcBUO-Cio3w/export?format=csv&gid=0',
  useLocalStorage: true,
  useCache: false, // Disable cache to always fetch fresh config
};

// Fee rates based on Bybit Inverse Perpetual & Futures Contract (as of 2024)
const BYBIT_FEES = {
  taker: 0.055, // 0.055% Open Taker - Close Taker
  openMakerCloseTaker: 0.0375, // 0.0375% Open Maker - Close Taker
  maker: 0.02, // 0.02% Open Maker - Close Maker
};

// Default values for the calculator
const DEFAULT_VALUES = {
  leverage: 4,
  entryPrice: 50000,
  capital: 400, // $400 USD
  positionType: "long",
  feeType: "openMakerCloseTaker",
};

// Risk management settings
const RISK_SETTINGS = {
  maxLossPercentage: 0.03, // 3% of capital excluding fees
  riskRewardRatio: 2, // 1:2 Risk to Reward ratio
};

// Validation limits
const VALIDATION_LIMITS = {
  leverage: {
    min: 1,
    max: 100,
  },
  price: {
    min: 0.000001,
  },
  capital: {
    min: 100,
  },
};

// UI Messages
const MESSAGES = {
  entryPriceError: "Giá vào lệnh phải lớn hơn 0.",
  takeProfitError: "Take Profit phải lớn hơn 0.",
  stopLossError: "Stop Loss phải lớn hơn 0.",
};

// Configuration Manager Class
class ConfigManager {
  constructor() {
    this.currentConfig = null;
    this.lastFetchTime = 0;
  }

  // Get current configuration with fallback
  async getConfig() {
    try {
      // Check if cache is enabled and we have cached config
      if (GOOGLE_SHEETS_CONFIG.useCache && this.currentConfig && this.isCacheValid()) {
        return this.currentConfig;
      }

      // Try to fetch from Google Sheets
      const remoteConfig = await this.fetchFromGoogleSheets();
      if (remoteConfig) {
        this.currentConfig = remoteConfig;
        this.lastFetchTime = Date.now();
        this.saveToLocalStorage(remoteConfig);
        return remoteConfig;
      }

      // Fallback to local storage
      const localConfig = this.getFromLocalStorage();
      if (localConfig) {
        this.currentConfig = localConfig;
        return localConfig;
      }

      // Final fallback to default values
      this.currentConfig = this.getDefaultConfig();
      return this.currentConfig;

    } catch (error) {
      console.warn('Error fetching config, using defaults:', error);
      this.currentConfig = this.getDefaultConfig();
      return this.currentConfig;
    }
  }

  // Fetch configuration from Google Sheets
  async fetchFromGoogleSheets() {
    try {
      if (!GOOGLE_SHEETS_CONFIG.sheetUrl || GOOGLE_SHEETS_CONFIG.sheetUrl.includes('YOUR_SHEET_ID_HERE')) {
        throw new Error('Google Sheets URL not configured');
      }

      const response = await fetch(GOOGLE_SHEETS_CONFIG.sheetUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const csvText = await response.text();
      return this.parseCSVConfig(csvText);
    } catch (error) {
      console.warn('Failed to fetch from Google Sheets:', error);
      return null;
    }
  }

  // Parse CSV configuration
  parseCSVConfig(csvText) {
    const lines = csvText.trim().split('\n');
    const config = {};
    
    for (let i = 1; i < lines.length; i++) { // Skip header row
      const [key, value, type] = lines[i].split(',').map(cell => cell.trim().replace(/"/g, ''));
      
      if (key && value) {
        // Parse value based on type
        let parsedValue;
        switch (type) {
          case 'number':
            parsedValue = parseFloat(value);
            break;
          case 'boolean':
            parsedValue = value.toLowerCase() === 'true';
            break;
          case 'object':
            try {
              parsedValue = JSON.parse(value);
            } catch {
              parsedValue = value;
            }
            break;
          default:
            parsedValue = value;
        }
        
        // Set nested properties
        this.setNestedProperty(config, key, parsedValue);
      }
    }
    
    return this.mergeWithDefaults(config);
  }

  // Set nested property using dot notation
  setNestedProperty(obj, path, value) {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in current)) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
  }

  // Merge fetched config with defaults
  mergeWithDefaults(fetchedConfig) {
    const defaultConfig = this.getDefaultConfig();
    return {
      ...defaultConfig,
      ...fetchedConfig,
      BYBIT_FEES: { ...defaultConfig.BYBIT_FEES, ...fetchedConfig.BYBIT_FEES },
      DEFAULT_VALUES: { ...defaultConfig.DEFAULT_VALUES, ...fetchedConfig.DEFAULT_VALUES },
      RISK_SETTINGS: { ...defaultConfig.RISK_SETTINGS, ...fetchedConfig.RISK_SETTINGS },
      VALIDATION_LIMITS: { 
        ...defaultConfig.VALIDATION_LIMITS, 
        ...fetchedConfig.VALIDATION_LIMITS,
        leverage: { ...defaultConfig.VALIDATION_LIMITS.leverage, ...fetchedConfig.VALIDATION_LIMITS?.leverage },
        price: { ...defaultConfig.VALIDATION_LIMITS.price, ...fetchedConfig.VALIDATION_LIMITS?.price },
        capital: { ...defaultConfig.VALIDATION_LIMITS.capital, ...fetchedConfig.VALIDATION_LIMITS?.capital }
      },
      MESSAGES: { ...defaultConfig.MESSAGES, ...fetchedConfig.MESSAGES }
    };
  }

  // Get default configuration
  getDefaultConfig() {
    return {
      BYBIT_FEES,
      DEFAULT_VALUES,
      RISK_SETTINGS,
      VALIDATION_LIMITS,
      MESSAGES
    };
  }

  // Check if cache is still valid
  isCacheValid() {
    // If cache is disabled, always return false to force fresh fetch
    if (!GOOGLE_SHEETS_CONFIG.useCache) {
      return false;
    }
    return (Date.now() - this.lastFetchTime) < (GOOGLE_SHEETS_CONFIG.cacheDuration || 5 * 60 * 1000);
  }

  // Save to local storage
  saveToLocalStorage(config) {
    if (GOOGLE_SHEETS_CONFIG.useLocalStorage) {
      try {
        localStorage.setItem('tradingCalculatorConfig', JSON.stringify({
          config,
          timestamp: Date.now()
        }));
      } catch (error) {
        console.warn('Failed to save to localStorage:', error);
      }
    }
  }

  // Get from local storage
  getFromLocalStorage() {
    if (!GOOGLE_SHEETS_CONFIG.useLocalStorage) return null;
    
    try {
      const stored = localStorage.getItem('tradingCalculatorConfig');
      if (stored) {
        const { config, timestamp } = JSON.parse(stored);
        // Check if local storage data is not too old (24 hours)
        if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
          return config;
        }
      }
    } catch (error) {
      console.warn('Failed to get from localStorage:', error);
    }
    
    return null;
  }

  // Save configuration (for future implementation with Google Sheets API)
  async saveConfig(config) {
    try {
      // For now, just save to localStorage
      this.currentConfig = config;
      this.saveToLocalStorage(config);
      
      // TODO: Implement Google Sheets API write functionality
      console.log('Config saved locally. Google Sheets write functionality to be implemented.');
      
      return true;
    } catch (error) {
      console.error('Failed to save config:', error);
      return false;
    }
  }

  // Reset to defaults
  resetToDefaults() {
    this.currentConfig = this.getDefaultConfig();
    if (GOOGLE_SHEETS_CONFIG.useLocalStorage) {
      localStorage.removeItem('tradingCalculatorConfig');
    }
    return this.currentConfig;
  }
}

// Global config manager instance
const configManager = new ConfigManager();

// Export configurations for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    BYBIT_FEES,
    DEFAULT_VALUES,
    RISK_SETTINGS,
    VALIDATION_LIMITS,
    MESSAGES,
    GOOGLE_SHEETS_CONFIG,
    ConfigManager,
    configManager,
  };
}
