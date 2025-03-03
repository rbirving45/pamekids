// This file would be used in a Node.js server environment
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Path to the JSON file that will store suggestions
const SUGGESTIONS_FILE = path.join(__dirname, '../../data/activity-suggestions.json');

/**
 * Ensures the suggestions file exists, creates it if it doesn't
 */
async function ensureSuggestionsFile() {
  try {
    await fs.access(SUGGESTIONS_FILE);
  } catch (error) {
    // File doesn't exist, create it with an empty array
    await fs.writeFile(SUGGESTIONS_FILE, JSON.stringify([], null, 2));
  }
}

/**
 * Reads all suggestions from the file
 */
async function getSuggestions() {
  await ensureSuggestionsFile();
  const data = await fs.readFile(SUGGESTIONS_FILE, 'utf8');
  return JSON.parse(data);
}

/**
 * Writes suggestions back to the file
 */
async function saveSuggestions(suggestions) {
  await fs.writeFile(SUGGESTIONS_FILE, JSON.stringify(suggestions, null, 2));
}

/**
 * Adds a new suggestion to the file
 */
async function addSuggestion(suggestion) {
  const suggestions = await getSuggestions();
  
  // Create a new suggestion object with additional metadata
  const newSuggestion = {
    id: uuidv4(), // Generate a unique ID
    ...suggestion,
    timestamp: new Date().toISOString(),
    reviewed: false
  };
  
  suggestions.push(newSuggestion);
  await saveSuggestions(suggestions);
  
  return newSuggestion;
}

/**
 * Updates a suggestion's status
 */
async function updateSuggestionStatus(id, isReviewed) {
  const suggestions = await getSuggestions();
  const suggestionIndex = suggestions.findIndex(s => s.id === id);
  
  if (suggestionIndex === -1) {
    throw new Error('Suggestion not found');
  }
  
  suggestions[suggestionIndex].reviewed = isReviewed;
  await saveSuggestions(suggestions);
  
  return suggestions[suggestionIndex];
}

/**
 * Deletes a suggestion
 */
async function deleteSuggestion(id) {
  const suggestions = await getSuggestions();
  const filteredSuggestions = suggestions.filter(s => s.id !== id);
  
  if (filteredSuggestions.length === suggestions.length) {
    throw new Error('Suggestion not found');
  }
  
  await saveSuggestions(filteredSuggestions);
  return true;
}

/**
 * Express.js route handler for suggestion endpoint
 */
function handleSuggestActivity(req, res) {
  // This would be used in an Express.js route
  const suggestion = req.body;
  
  // Validate required fields
  if (!suggestion.name || !suggestion.googleMapsLink) {
    return res.status(400).json({
      success: false,
      message: 'Name and Google Maps link are required'
    });
  }
  
  // Process the suggestion
  addSuggestion(suggestion)
    .then(newSuggestion => {
      res.status(201).json({
        success: true,
        message: 'Suggestion added successfully',
        suggestion: newSuggestion
      });
    })
    .catch(error => {
      console.error('Error adding suggestion:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add suggestion'
      });
    });
}

// If using with Express.js
// Example setup:
/*
const express = require('express');
const app = express();
app.use(express.json());

app.post('/api/suggest-activity', handleSuggestActivity);

// Route to get all suggestions (admin only, would need authentication)
app.get('/api/admin/suggestions', async (req, res) => {
  try {
    const suggestions = await getSuggestions();
    res.json({ success: true, suggestions });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch suggestions' });
  }
});

// Route to update a suggestion's status (admin only)
app.patch('/api/admin/suggestions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewed } = req.body;
    
    if (typeof reviewed !== 'boolean') {
      return res.status(400).json({ success: false, message: 'Reviewed status must be a boolean' });
    }
    
    const updatedSuggestion = await updateSuggestionStatus(id, reviewed);
    res.json({ success: true, suggestion: updatedSuggestion });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Route to delete a suggestion (admin only)
app.delete('/api/admin/suggestions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await deleteSuggestion(id);
    res.json({ success: true, message: 'Suggestion deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
*/

module.exports = {
  getSuggestions,
  addSuggestion,
  updateSuggestionStatus,
  deleteSuggestion,
  handleSuggestActivity
};