// loggerUI.js - UI functionality for the logger
import { Logger } from './logger.js';

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Get the download logs button
    const downloadLogsButton = document.getElementById('download-logs');
    
    // Add click event listener to the download logs button
    if (downloadLogsButton) {
        downloadLogsButton.addEventListener('click', function() {
            Logger.downloadLogs();
        });
        
        console.log('Download logs button initialized');
    } else {
        console.error('Download logs button not found in the DOM');
    }
});
