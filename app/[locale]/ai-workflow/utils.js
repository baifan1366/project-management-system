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

// 添加执行API请求的函数
export async function executeApiRequest(apiUrl, method, body, headers = {}) {
  try {
    
    // 设置默认头信息
    const requestHeaders = {
      'Content-Type': 'application/json',
      ...headers
    };
    
    // 设置请求选项
    const requestOptions = {
      method: method,
      headers: requestHeaders
    };
    
    // 如果不是GET请求且有请求体，则添加请求体
    if (method !== 'GET' && body) {
      requestOptions.body = JSON.stringify(body);
    }
    
    // 发送请求
    const response = await fetch(apiUrl, requestOptions);
    
    // 获取响应
    const responseData = await response.json().catch(() => ({}));
    const status = response.status;
    const statusText = response.statusText;
    
    return {
      success: response.ok,
      status,
      statusText,
      data: responseData,
      headers: Object.fromEntries(response.headers.entries())
    };
  } catch (error) {
    console.error('API request failed:', error);
    return {
      success: false,
      status: 500,
      statusText: 'Internal Server Error',
      error: error.message,
      data: null
    };
  }
}

// Function to create a basic DOCX template programmatically
export async function createDocxTemplate() {
  try {
    const fs = require('fs');
    const path = require('path');
    const PizZip = require('pizzip');
    
    // Create a basic Word document template with content controls for dynamic content
    const docxContent = `
      <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" 
                 xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
                 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
                 xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">
        <w:body>
          <w:p>
            <w:pPr>
              <w:pStyle w:val="Title"/>
              <w:jc w:val="center"/>
            </w:pPr>
            <w:r>
              <w:t>{title}</w:t>
            </w:r>
          </w:p>
          <w:p>
            <w:pPr>
              <w:jc w:val="right"/>
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:color w:val="808080"/>
                <w:sz w:val="20"/>
              </w:rPr>
              <w:t>Generated on: {current_date}</w:t>
            </w:r>
          </w:p>
          
          <w:p>
            <w:pPr>
              <w:pBdr>
                <w:bottom w:val="single" w:sz="8" w:space="4" w:color="DDDDDD"/>
              </w:pBdr>
            </w:pPr>
            <w:r></w:r>
          </w:p>
          
          {#sections}
          <w:p>
            <w:pPr>
              <w:pStyle w:val="Heading1"/>
            </w:pPr>
            <w:r>
              <w:t>{heading}</w:t>
            </w:r>
          </w:p>
          
          <w:p>
            <w:r>
              <w:t>{content}</w:t>
            </w:r>
          </w:p>
          
          {#bullets}
          <w:p>
            <w:pPr>
              <w:pStyle w:val="ListParagraph"/>
              <w:numPr>
                <w:ilvl w:val="0"/>
                <w:numId w:val="1"/>
              </w:numPr>
            </w:pPr>
            <w:r>
              <w:t>{.}</w:t>
            </w:r>
          </w:p>
          {/bullets}
          
          {#subsections}
          <w:p>
            <w:pPr>
              <w:pStyle w:val="Heading2"/>
            </w:pPr>
            <w:r>
              <w:t>{heading}</w:t>
            </w:r>
          </w:p>
          
          <w:p>
            <w:r>
              <w:t>{content}</w:t>
            </w:r>
          </w:p>
          
          {#bullets}
          <w:p>
            <w:pPr>
              <w:pStyle w:val="ListParagraph"/>
              <w:numPr>
                <w:ilvl w:val="0"/>
                <w:numId w:val="1"/>
              </w:numPr>
            </w:pPr>
            <w:r>
              <w:t>{.}</w:t>
            </w:r>
          </w:p>
          {/bullets}
          {/subsections}
          {/sections}
          
          <w:sectPr>
            <w:pgSz w:w="12240" w:h="15840"/>
            <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
          </w:sectPr>
        </w:body>
      </w:document>
    `;
    
    // Define content types
    const contentTypes = `
      <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
        <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
        <Default Extension="xml" ContentType="application/xml"/>
        <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
        <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
        <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
      </Types>
    `;
    
    // Define relationships
    const documentRels = `
      <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
        <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>
      </Relationships>
    `;
    
    // Define root relationships
    const rootRels = `
      <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
      </Relationships>
    `;
    
    // Define styles
    const styles = `
      <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:style w:type="paragraph" w:styleId="Title">
          <w:name w:val="Title"/>
          <w:pPr>
            <w:spacing w:before="240" w:after="120"/>
            <w:jc w:val="center"/>
          </w:pPr>
          <w:rPr>
            <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
            <w:b/>
            <w:sz w:val="36"/>
            <w:color w:val="2E74B5"/>
          </w:rPr>
        </w:style>
        <w:style w:type="paragraph" w:styleId="Heading1">
          <w:name w:val="Heading 1"/>
          <w:pPr>
            <w:spacing w:before="240" w:after="120"/>
          </w:pPr>
          <w:rPr>
            <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
            <w:b/>
            <w:sz w:val="28"/>
            <w:color w:val="2E74B5"/>
          </w:rPr>
        </w:style>
        <w:style w:type="paragraph" w:styleId="Heading2">
          <w:name w:val="Heading 2"/>
          <w:pPr>
            <w:spacing w:before="240" w:after="120"/>
          </w:pPr>
          <w:rPr>
            <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
            <w:b/>
            <w:sz w:val="24"/>
            <w:color w:val="2E74B5"/>
          </w:rPr>
        </w:style>
        <w:style w:type="paragraph" w:styleId="ListParagraph">
          <w:name w:val="List Paragraph"/>
          <w:pPr>
            <w:spacing w:before="120" w:after="120"/>
          </w:pPr>
          <w:rPr>
            <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
          </w:rPr>
        </w:style>
      </w:styles>
    `;
    
    // Define numbering for bullet lists
    const numbering = `
      <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:abstractNum w:abstractNumId="0">
          <w:nsid w:val="5ABA1C64"/>
          <w:multiLevelType w:val="hybridMultilevel"/>
          <w:lvl w:ilvl="0">
            <w:start w:val="1"/>
            <w:numFmt w:val="bullet"/>
            <w:lvlText w:val="•"/>
            <w:lvlJc w:val="left"/>
            <w:pPr>
              <w:ind w:left="720" w:hanging="360"/>
            </w:pPr>
            <w:rPr>
              <w:rFonts w:ascii="Symbol" w:hAnsi="Symbol" w:hint="default"/>
            </w:rPr>
          </w:lvl>
        </w:abstractNum>
        <w:num w:numId="1">
          <w:abstractNumId w:val="0"/>
        </w:num>
      </w:numbering>
    `;
    
    // Create the zip file with all required parts
    const zip = new PizZip();
    
    // Add content types
    zip.file("[Content_Types].xml", contentTypes.trim());
    
    // Add relationships
    zip.file("_rels/.rels", rootRels.trim());
    zip.file("word/_rels/document.xml.rels", documentRels.trim());
    
    // Add document
    zip.file("word/document.xml", docxContent.trim());
    
    // Add styles
    zip.file("word/styles.xml", styles.trim());
    
    // Add numbering
    zip.file("word/numbering.xml", numbering.trim());
    
    // Generate the docx file
    const templatePath = path.resolve(process.cwd(), 'app/api/ai/workflow-agent/templates/document_template.docx');
    const content = zip.generate({ type: 'nodebuffer' });
    
    fs.writeFileSync(templatePath, content);
    return templatePath;
  } catch (error) {
    console.error('Error creating document template:', error);
    throw error;
  }
}
