import { supabase } from '@/lib/supabase';

// Safe JSON parsing function
export function safeParseJSON(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error.message };
  }
}

// Format the workflow result for specific output types
export function formatWorkflowResult(result, outputType) {
  switch (outputType) {
    case 'ppt':
      return formatPPTResult(result);
    case 'document':
      return formatDocumentResult(result);
    case 'api':
      return formatAPIResult(result);
    case 'analysis':
      return formatAnalysisResult(result);
    default:
      return result;
  }
}

// Format PowerPoint presentation data
function formatPPTResult(result) {
  if (!result || !result.slides || !Array.isArray(result.slides)) {
    return result;
  }

  // Format for PowerPoint export
  return {
    title: result.title,
    slides: result.slides.map((slide, index) => ({
      id: `slide-${index + 1}`,
      ...slide,
      // Add any additional formatting needed for the frontend
    })),
    metadata: {
      slideCount: result.slides.length,
      created: new Date().toISOString(),
      format: 'pptx'
    }
  };
}

// Format document generation data
function formatDocumentResult(result) {
  if (!result || !result.sections || !Array.isArray(result.sections)) {
    return result;
  }

  // Format for document export
  return {
    title: result.title,
    sections: result.sections.map((section, sectionIndex) => {
      // Process subsections if they exist
      const processedSubsections = section.subsections && Array.isArray(section.subsections)
        ? section.subsections.map((subsection, subsectionIndex) => ({
            id: `section-${sectionIndex + 1}-subsection-${subsectionIndex + 1}`,
            ...subsection,
            // Format content for display
            content: subsection.content
              ? subsection.content.split('\n').filter(p => p.trim().length > 0)
              : []
          }))
        : [];

      return {
        id: `section-${sectionIndex + 1}`,
        ...section,
        // Format content for display
        content: section.content
          ? section.content.split('\n').filter(p => p.trim().length > 0)
          : [],
        subsections: processedSubsections
      };
    }),
    metadata: {
      sectionCount: result.sections.length,
      created: new Date().toISOString(),
      format: 'docx'
    }
  };
}

// Format API request data
function formatAPIResult(result) {
  if (!result || !result.api_endpoint) {
    return result;
  }

  // Format for API request display or execution
  return {
    ...result,
    formatted: {
      curl: generateCurlCommand(result),
      javascript: generateJavaScriptCode(result),
      python: generatePythonCode(result),
    },
    metadata: {
      created: new Date().toISOString()
    }
  };
}

// Format data analysis result
function formatAnalysisResult(result) {
  if (!result || !result.insights || !Array.isArray(result.insights)) {
    return result;
  }

  // Format for analysis display
  return {
    ...result,
    insights: result.insights.map((insight, index) => ({
      id: `insight-${index + 1}`,
      ...insight,
      // Additional formatting as needed
    })),
    recommendations: result.recommendations && Array.isArray(result.recommendations)
      ? result.recommendations.map((rec, index) => ({
          id: `recommendation-${index + 1}`,
          ...rec,
          // Additional formatting as needed
        }))
      : [],
    metadata: {
      created: new Date().toISOString(),
      insightCount: result.insights.length,
      recommendationCount: result.recommendations ? result.recommendations.length : 0
    }
  };
}

// Helper functions for API formatting
function generateCurlCommand(apiData) {
  const { api_endpoint, method, headers, parameters, body } = apiData;
  
  // Start with the base command
  let curlCommand = `curl -X ${method || 'GET'} `;
  
  // Add headers
  if (headers && typeof headers === 'object') {
    Object.entries(headers).forEach(([key, value]) => {
      curlCommand += `-H "${key}: ${value}" `;
    });
  }
  
  // Add URL parameters if any
  let url = api_endpoint;
  if (parameters && typeof parameters === 'object' && Object.keys(parameters).length > 0) {
    const queryParams = new URLSearchParams();
    Object.entries(parameters).forEach(([key, value]) => {
      queryParams.append(key, value);
    });
    url += `?${queryParams.toString()}`;
  }
  
  // Add the URL
  curlCommand += `"${url}" `;
  
  // Add body if it's not a GET request
  if (method !== 'GET' && body && typeof body === 'object') {
    curlCommand += `-d '${JSON.stringify(body)}'`;
  }
  
  return curlCommand;
}

function generateJavaScriptCode(apiData) {
  const { api_endpoint, method, headers, parameters, body } = apiData;
  
  // Build URL with parameters
  let url = api_endpoint;
  if (parameters && typeof parameters === 'object' && Object.keys(parameters).length > 0) {
    const queryParams = new URLSearchParams();
    Object.entries(parameters).forEach(([key, value]) => {
      queryParams.append(key, value);
    });
    url += `?${queryParams.toString()}`;
  }
  
  let code = `// JavaScript fetch example
const options = {
  method: '${method || 'GET'}',
  headers: ${JSON.stringify(headers || {}, null, 2)}
`;

  if (method !== 'GET' && body) {
    code += `,
  body: JSON.stringify(${JSON.stringify(body, null, 2)})`;
  }

  code += `
};

fetch('${url}', options)
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));`;

  return code;
}

function generatePythonCode(apiData) {
  const { api_endpoint, method, headers, parameters, body } = apiData;
  
  // Build URL with parameters
  let url = api_endpoint;
  if (parameters && typeof parameters === 'object' && Object.keys(parameters).length > 0) {
    const queryParams = [];
    Object.entries(parameters).forEach(([key, value]) => {
      queryParams.push(`${key}=${value}`);
    });
    url += `?${queryParams.join('&')}`;
  }
  
  let code = `# Python requests example
import requests

url = '${url}'
headers = ${JSON.stringify(headers || {}, null, 2).replace(/"/g, "'")}
`;

  if (method !== 'GET' && body) {
    code += `
payload = ${JSON.stringify(body, null, 2).replace(/"/g, "'")}

response = requests.${method.toLowerCase()}(url, headers=headers, json=payload)`;
  } else {
    code += `
response = requests.${(method || 'GET').toLowerCase()}(url, headers=headers)`;
  }

  code += `
print(response.json())`;

  return code;
}
