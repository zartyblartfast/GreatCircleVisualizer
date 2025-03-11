// logger.js - Logging utility for debugging map projection issues
export class Logger {
    static LOG_LEVELS = {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3,
        NONE: 4
    };

    static currentLogLevel = Logger.LOG_LEVELS.DEBUG;
    static logToFile = true;
    static logFile = 'map_debug.log';
    static enabledModules = {
        'mapComparisonDisplay': true,
        'mapProjection': true,
        'mapUtilities': true,
        'all': true
    };

    static setLogLevel(level) {
        if (Logger.LOG_LEVELS.hasOwnProperty(level)) {
            Logger.currentLogLevel = Logger.LOG_LEVELS[level];
            Logger.log('INFO', 'Logger', `Log level set to ${level}`);
        }
    }

    static enableModule(moduleName, enabled = true) {
        Logger.enabledModules[moduleName] = enabled;
        Logger.log('INFO', 'Logger', `Logging for module ${moduleName} ${enabled ? 'enabled' : 'disabled'}`);
    }

    static enableFileLogging(enabled = true) {
        Logger.logToFile = enabled;
        Logger.log('INFO', 'Logger', `File logging ${enabled ? 'enabled' : 'disabled'}`);
    }

    static setLogFile(filename) {
        Logger.logFile = filename;
        Logger.log('INFO', 'Logger', `Log file set to ${filename}`);
        
        // Clear the log file on initialization
        if (Logger.logToFile) {
            Logger.clearLogFile();
        }
    }

    static clearLogFile() {
        if (typeof window !== 'undefined') {
            if (!window._logBuffer) {
                window._logBuffer = {};
            }
            window._logBuffer[Logger.logFile] = '';
        }
    }

    static log(level, module, message, params = null) {
        // Check if logging is enabled for this module
        if (!Logger.enabledModules[module] && !Logger.enabledModules['all']) {
            return;
        }

        // Check if this log level should be logged
        if (Logger.LOG_LEVELS[level] < Logger.currentLogLevel) {
            return;
        }

        const timestamp = new Date().toISOString();
        let logMessage = `[${timestamp}] [${level}] [${module}] ${message}`;
        
        // Add parameters if provided
        if (params) {
            try {
                const paramsStr = JSON.stringify(params, (key, value) => {
                    // Handle circular references and functions
                    if (typeof value === 'function') {
                        return 'function';
                    }
                    if (typeof value === 'object' && value !== null) {
                        if (key === 'chart' || key === 'localChart') {
                            return '[Chart Object]';
                        }
                    }
                    return value;
                }, 2);
                logMessage += `\nParams: ${paramsStr}`;
            } catch (e) {
                logMessage += `\nParams: [Could not stringify parameters: ${e.message}]`;
            }
        }

        // Log to console
        switch (level) {
            case 'ERROR':
                console.error(logMessage);
                break;
            case 'WARN':
                console.warn(logMessage);
                break;
            default:
                console.log(logMessage);
                break;
        }

        // Log to file if enabled
        if (Logger.logToFile) {
            try {
                Logger.appendToLogFile(logMessage + '\n');
            } catch (e) {
                console.error(`Failed to write to log file: ${e.message}`);
            }
        }
    }

    static appendToLogFile(data) {
        if (typeof window !== 'undefined') {
            // Browser environment - store in memory
            if (!window._logBuffer) {
                window._logBuffer = {};
            }
            if (!window._logBuffer[Logger.logFile]) {
                window._logBuffer[Logger.logFile] = '';
            }
            window._logBuffer[Logger.logFile] += data;
        }
    }

    static debug(module, message, params = null) {
        Logger.log('DEBUG', module, message, params);
    }

    static info(module, message, params = null) {
        Logger.log('INFO', module, message, params);
    }

    static warn(module, message, params = null) {
        Logger.log('WARN', module, message, params);
    }

    static error(module, message, params = null) {
        Logger.log('ERROR', module, message, params);
    }

    static logMethodCall(module, methodName, params = null) {
        // Get the call stack to identify where the method was called from
        let caller = 'unknown';
        try {
            const stack = new Error().stack;
            const callerLine = stack.split('\n')[3]; // Index 3 typically contains the caller info
            caller = callerLine ? callerLine.trim() : 'unknown';
        } catch (e) {
            // Ignore errors in getting stack trace
        }
        
        Logger.debug(module, `Method ${methodName} called from ${caller}`, params);
    }

    static logMethodReturn(module, methodName, returnValue = null) {
        Logger.debug(module, `Method ${methodName} returned`, returnValue);
    }

    static downloadLogs() {
        if (typeof window !== 'undefined' && window._logBuffer) {
            const logContent = window._logBuffer[Logger.logFile] || '';
            const blob = new Blob([logContent], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = Logger.logFile;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            Logger.info('Logger', 'Logs downloaded');
        } else {
            console.error('No logs available for download');
        }
    }
}

// Initialize the logger
Logger.setLogFile('map_debug.log');
