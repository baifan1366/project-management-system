// Safely parse JSON string with enhanced error handling
export function safeParseJSON(jsonString) {
  if (!jsonString || typeof jsonString !== 'string') {
    return { data: null, error: "Invalid input: Not a string" };
  }

  try {
    // Try direct parsing first
    return { data: JSON.parse(jsonString), error: null };
  } catch (error) {
    console.error("JSON parsing error, attempting to fix...");
    
    try {
      // Sanitize the JSON string
      let sanitizedContent = jsonString;
      
      // Extract JSON object if embedded in other text
      const startIdx = sanitizedContent.indexOf('{');
      const endIdx = sanitizedContent.lastIndexOf('}');
      
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        sanitizedContent = sanitizedContent.substring(startIdx, endIdx + 1);
      }
      
      // Replace problematic characters in property values
      sanitizedContent = sanitizedContent
        // Remove control characters which are invalid in JSON strings
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
        // Handle trailing commas in property values with no following property
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']')
        // Fix invalid commas in objects (e.g. { "id": 6,, "name": ... })
        .replace(/,\s*,/g, ',');
      
      // Handle potential issues with property names and values
      // This regex finds property patterns and fixes misplaced commas in values
      sanitizedContent = sanitizedContent.replace(/"([^"]+)"\s*:\s*"([^"]*)(?:,)(?!")([^"]*)"(?=\s*[,}])/g, 
        (match, propName, value1, value2) => {
          // Fix a comma inside a string value by removing it
          return `"${propName}": "${value1}${value2}"`;
        }
      );
      
      // Fix quotes in property names
      sanitizedContent = sanitizedContent.replace(/([{,]\s*)([^"'\s][^:]*?)(\s*:)/g, 
        (match, prefix, propName, suffix) => {
          // Add quotes around unquoted property names
          return `${prefix}"${propName}"${suffix}`;
        }
      );
      
      // Fix missing quotes at the end of string values
      sanitizedContent = sanitizedContent.replace(/"([^"]+)"\s*:\s*"([^"]*)(?!")(?=\s*[,}])/g, 
        (match, propName, value) => {
          return `"${propName}": "${value}"`;
        }
      );
      
      // Check and fix unbalanced JSON structure
      let openBraces = (sanitizedContent.match(/\{/g) || []).length;
      let closeBraces = (sanitizedContent.match(/\}/g) || []).length;
      let openBrackets = (sanitizedContent.match(/\[/g) || []).length;
      let closeBrackets = (sanitizedContent.match(/\]/g) || []).length;
      
      // Add missing closing braces
      while (closeBraces < openBraces) {
        sanitizedContent += '}';
        closeBraces++;
      }
      
      // Add missing closing brackets
      while (closeBrackets < openBrackets) {
        sanitizedContent += ']';
        closeBrackets++;
      }
      
      // Fix missing colons in property assignments
      sanitizedContent = sanitizedContent.replace(/"([^"]+)"\s+(?!")/g, '"$1": ');
      
      // Fix quoted property followed by non-colon
      sanitizedContent = sanitizedContent.replace(/"([^"]+)"(?!\s*:)(?=\s*[,}])/g, '"$1": ""');
      
      // Fix truncated object with properties that lack values
      sanitizedContent = sanitizedContent.replace(/"([^"]+)"\s*:(?!\s*["{\[0-9tfn])/g, '"$1": null');
      
      console.log("Sanitized JSON:", sanitizedContent.substring(0, 100) + "...");
      
      // Try parsing the sanitized JSON
      try {
        const result = JSON.parse(sanitizedContent);
        return { data: result, error: null };
      } catch (innerError) {
        // Last resort: try JSON5 parsing approach (more lenient)
        try {
          // Implement a more forgiving JSON parser
          // First, convert all single quotes to double quotes
          let lenientJson = sanitizedContent.replace(/'/g, '"');
          
          // Allow trailing commas in objects and arrays
          lenientJson = lenientJson
            .replace(/,\s*}/g, '}')
            .replace(/,\s*]/g, ']');
          
          // Try parsing with eval (only as last resort, in controlled context)
          // Note: This is not ideal for security, but we're already in a server context
          // with sanitized input that came from our own AI
          const jsonFn = new Function('return ' + lenientJson);
          const evalResult = jsonFn();
          
          if (evalResult && typeof evalResult === 'object') {
            return { data: evalResult, error: null };
          } else {
            throw new Error("Failed to parse JSON with lenient method");
          }
        } catch (lenientError) {
          return { data: null, error: `Failed to parse sanitized JSON: ${innerError.message}` };
        }
      }
    } catch (cleanError) {
      return { data: null, error: `Original error: ${error.message}, Sanitization error: ${cleanError.message}` };
    }
  }
}


// Tag ID mapping helper function
export function getDefaultTagIdsForField(fieldId) {
  // Assign appropriate tag IDs based on view type
  switch (fieldId) {
    case 1: // Overview
      return [1, 2, 3, 4, 10]; // Name, Assignee, Due Date, Status, Tags
    case 2: // List
      return [1, 2, 3, 4, 10]; // Name, Assignee, Due Date, Status, Tags
    case 3: // Files
      return [1, 2, 5]; // Name, Assignee, Description
    case 4: // Timeline
      return [1, 2, 3, 4, 6, 9]; // Name, Assignee, Due Date, Status, Start Date, Progress
    case 5: // Gantt
      return [1, 2, 3, 4, 6, 8, 9]; // Name, Assignee, Due Date, Status, Start Date, Duration, Progress
    case 6: // Kanban Board
      return [1, 2, 3, 4, 10]; // Name, Assignee, Due Date, Status, Tags
    case 7: // Workflow
      return [1, 2, 3, 4, 7]; // Name, Assignee, Due Date, Status, Parent ID
    case 8: // Calendar
      return [1, 3, 6, 11]; // Name, Due Date, Start Date, Completed On
    case 9: // Notion
      return [1, 2, 5, 12]; // Name, Assignee, Description, Remarks
    case 10: // Agile
      return [1, 2, 3, 4, 9, 10]; // Name, Assignee, Due Date, Status, Progress, Tags
    default:
      return []; // Default empty array
  }
}

// Check if the instruction is an invitation
export function isInvitationInstruction(instruction) {
  const lowerInstruction = instruction.toLowerCase();
  const inviteTerms = ['invite', 'add user', 'add member', 'join team'];
  
  // Check if instruction contains invitation-related terms
  const containsInviteTerm = inviteTerms.some(term => lowerInstruction.includes(term));
  
  // Check if instruction contains an email
  const containsEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g.test(lowerInstruction);
  
  const result = containsInviteTerm && containsEmail;
  console.log(`Checking if instruction is invitation: ${result}`);
  return result;
} 

// Create error response
export function createErrorResponse(status, errorType, message) {
  return new Response(
    JSON.stringify({
      error: errorType,
      message: message
    }),
    {
      status: status,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

// Create success response
export function createSuccessResponse(data) {
  return new Response(
    JSON.stringify(data),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
} 