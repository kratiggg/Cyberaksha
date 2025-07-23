// Chatbot service for Shield extension using agent.ai API

/**
 * Simple, reliable chatbot service for the Shield extension
 */
const ChatbotService = {
  // API configuration
  config: {
    apiKey: '6j1Xb3gBSqDSS9AbkpIPioLIOf5YTbB8E66ss9YwXBai6fmZrbT3kmlPQX2Bb2NT',
    apiUrl: 'https://api-lr.agent.ai/v1/action/invoke_llm',
    engine: 'gpt4o'
  },
  
  /**
   * Call the Agent.ai API
   * @param {Object} params - The parameters for the API call
   * @returns {Promise<string>} - The response text
   */
  callAPI: async function(params) {
    console.log('Calling Agent.ai API with params:', params);
    
    try {
      const response = await fetch(this.config.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          instructions: params.prompt,
          llm_engine: this.config.engine
        })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('API response:', data);
      
      return data.result || 'Sorry, I could not generate a response.';
    } catch (error) {
      console.error('Error in API call:', error);
      throw error;
    }
  },
  
  /**
   * Get security advice for a website
   */
  getSecurityAdvice: async function(domain, safetyScore, issues = []) {
    const securityLevel = safetyScore >= 80 ? 'high' : (safetyScore >= 60 ? 'medium' : 'low');
    
    const prompt = `You are Shield, a security assistant for web browsing. 
The user is visiting ${domain} which has a safety score of ${safetyScore}/100 (${securityLevel} security level).
${issues.length > 0 ? `The following security issues were detected:\n${issues.map(issue => `- ${issue}`).join('\n')}` : 'No specific security issues were detected.'}

Based on this information, provide a concise (max 3 sentences) security assessment and practical advice to help the user stay safe. Focus on clear, actionable tips rather than technical details. Format your response in a friendly, helpful tone.`;
    
    try {
      return await this.callAPI({ prompt });
    } catch (error) {
      return "I'm analyzing this site's security. If you have any questions about staying safe online, feel free to ask!";
    }
  },
  
  /**
   * Get a response to a user question
   */
  getChatbotResponse: async function(query, domain, safetyScore, issues = []) {
    const prompt = `You are Shield, a security assistant for a browser extension focused on keeping users safe online.
The user is currently on ${domain} which has a safety score of ${safetyScore}/100.
${issues.length > 0 ? `Security issues detected: ${issues.join(', ')}` : 'No specific security issues detected.'}

The user asks: "${query}"

Provide a helpful, accurate, and concise response about online security and privacy. Keep your answer under 3 sentences unless absolutely necessary for clarity. Focus on practical advice the user can immediately apply. Avoid technical jargon unless specifically asked about technical details.`;
    
    try {
      return await this.callAPI({ prompt });
    } catch (error) {
      return "I'm sorry, I couldn't process your request. Please try again later.";
    }
  }
};

// Make the service available globally
window.ChatbotService = ChatbotService; 