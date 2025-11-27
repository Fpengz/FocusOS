
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Project, TaskStatus, FocusSession, ChatMessage, AgentAnalysisResponse } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Iterative Project Creation Chat.
 * The model acts as a consultant. It asks questions or generates a JSON plan if ready.
 */
export const consultProjectAgent = async (
  history: ChatMessage[],
  newInput: string,
  attachments: { mimeType: string; data: string }[] = []
): Promise<{ text: string; projectDraft?: any }> => {
  const model = "gemini-2.5-flash";
  const currentDate = new Date().toLocaleDateString();

  const systemInstruction = `
    You are an expert Project Planning Agent. Your goal is to help the user define a structured project plan.
    Current Date: ${currentDate}
    
    PROCESS:
    1.  Analyze the user's input and any attached files.
    2.  CONVERSATION: If the user's request is vague (e.g. "I want to learn coding" with no details), ask clarifying questions to narrow down the scope.
    3.  DRAFTING: When you have enough info to create a plan, or if the user explicitly provides a clear topic (e.g. "Plan a 2-week trip to Japan"), generate a DRAFT plan in JSON format wrapped in a markdown code block.
    
    JSON SCHEMA (Hierarchical Structure):
    \`\`\`json
    {
      "title": "Project Title",
      "description": "Executive summary including timeline.",
      "suggestedResources": ["Resource 1", "Resource 2"],
      "subtasks": [
        { 
          "title": "Phase 1: Preparation", 
          "estimatedMinutes": 0, 
          "subtasks": [
             { "title": "Research competitors", "estimatedMinutes": 45 },
             { "title": "Draft outline", "estimatedMinutes": 30 }
          ]
        }
      ]
    }
    \`\`\`

    CRITICAL RULES:
    - ALWAYS wrap the JSON in \`\`\`json ... \`\`\` code blocks.
    - **Hierarchy**: Break projects into 'Phases' or 'Stages' (top level), then 'Tasks' (2nd level).
    - **Granularity**: Leaf tasks should be 15-60 minutes.
  `;

  const parts: any[] = [{ text: systemInstruction }];

  // Add history
  history.forEach(msg => {
    const roleLabel = msg.role === 'user' ? 'User' : 'Model';
    parts.push({ text: `[${roleLabel}]: ${msg.text}` });
  });

  // Add current attachments
  attachments.forEach(att => {
    parts.push({
      inlineData: {
        mimeType: att.mimeType,
        data: att.data
      }
    });
  });

  // Add current input
  parts.push({ text: `[User]: ${newInput}\n[Model]:` });

  const response = await ai.models.generateContent({
    model: model,
    contents: { parts }
  });

  const fullText = response.text || "I didn't catch that.";
  
  // Try to extract JSON with robust regex (handles optional json tag, newlines)
  let projectDraft = undefined;
  const jsonMatch = fullText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  
  if (jsonMatch && jsonMatch[1]) {
    try {
      projectDraft = JSON.parse(jsonMatch[1]);
    } catch (e) {
      console.error("Failed to parse generated JSON plan", e);
    }
  } else {
     // Fallback: try to find start and end of JSON object if no code blocks found
     const start = fullText.indexOf('{');
     const end = fullText.lastIndexOf('}');
     if (start !== -1 && end !== -1 && end > start) {
        try {
            const potentialJson = fullText.substring(start, end + 1);
            projectDraft = JSON.parse(potentialJson);
        } catch (e) { /* ignore */ }
     }
  }

  // Clean the text response to remove the JSON block so we don't show raw JSON to user in chat
  const cleanText = fullText.replace(/```(?:json)?\s*[\s\S]*?\s*```/g, '').trim() || (projectDraft ? "I've drafted a plan based on your request. Check the preview on the right!" : fullText);

  return {
    text: cleanText,
    projectDraft
  };
};

/**
 * Chat with the Agent about a specific project (Post-creation).
 */
export const chatWithProjectAgent = async (
  project: Project, 
  userMessage: string, 
  attachments: { mimeType: string; data: string }[] = []
): Promise<string> => {
  
  const systemContext = `
    You are a project assistant for the project: "${project.title}".
    Description: ${project.description}.
    Current Tasks: ${JSON.stringify(project.subtasks)}.
    
    Help the user by answering questions, suggesting new tasks, or analyzing uploaded files related to this project.
    Keep answers concise and actionable.
  `;

  const parts: any[] = [{ text: systemContext }];

  project.chatHistory.slice(-10).forEach(msg => {
    const roleLabel = msg.role === 'user' ? 'User' : 'Model';
    parts.push({ text: `[${roleLabel}]: ${msg.text}`});
  });

  attachments.forEach(att => {
    parts.push({
      inlineData: {
        mimeType: att.mimeType,
        data: att.data
      }
    });
  });

  parts.push({ text: `[User]: ${userMessage}\n[Model]:` });

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: { parts }
  });

  return response.text || "I couldn't process that.";
};

/**
 * Analytics Agent: Analyzes productivity history on the fly.
 * Uses strictly typed JSON schema for reliable graph generation.
 */
export const analyzeProductivityData = async (history: FocusSession[], question: string): Promise<AgentAnalysisResponse> => {
  const model = "gemini-2.5-flash";
  
  // Simplify history for token efficiency
  const simpleHistory = history.map(h => ({
    date: new Date(h.startTime).toLocaleDateString(),
    time: new Date(h.startTime).toLocaleTimeString(),
    duration: h.actualDurationMinutes,
    completed: h.completed,
    reason: h.interruptionReason || 'None'
  }));

  const prompt = `
    User Data: ${JSON.stringify(simpleHistory)}
    User Question: "${question}"
    
    Analyze the data to answer the question. 
    If the answer can be visualized (e.g., trends, comparisons, breakdowns), provide 'chartData' and a 'chartType'.
    Keep 'text' concise and encouraging.
  `;

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      text: { 
        type: Type.STRING, 
        description: "Concise textual analysis of the data." 
      },
      chartData: {
        type: Type.ARRAY,
        description: "Data points for a chart. Required if the analysis implies a visual trend or comparison.",
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "Label for the X-axis or Legend (e.g., 'Mon', 'Morning', 'Email')" },
            value: { type: Type.NUMBER, description: "Numerical value for the Y-axis or Slice" },
          },
          required: ["name", "value"]
        }
      },
      chartType: { 
        type: Type.STRING, 
        enum: ["bar", "line", "pie"],
        description: "The best type of chart to visualize this data." 
      },
      chartTitle: { 
        type: Type.STRING,
        description: "A short title for the chart."
      }
    },
    required: ["text"]
  };

  const response = await ai.models.generateContent({
    model: model,
    contents: prompt,
    config: { 
        systemInstruction: "You are an expert Productivity Analyst. You extract insights and visualize them.",
        responseMimeType: "application/json",
        responseSchema: responseSchema 
    }
  });

  try {
      // With responseSchema, response.text is guaranteed to be valid JSON matching the schema
      const jsonResponse = JSON.parse(response.text || "{}");
      return {
          text: jsonResponse.text || "I couldn't analyze the data properly.",
          chartData: jsonResponse.chartData,
          chartType: jsonResponse.chartType,
          chartTitle: jsonResponse.chartTitle
      };
  } catch (e) {
      console.error("Error parsing analyst response", e);
      return { text: "Error parsing analysis. Please try again." };
  }
};

/**
 * Motivational tip for the timer.
 */
export const getContextualAssistance = async (taskTitle: string): Promise<string> => {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `The user is currently focusing on this task: "${taskTitle}".
        Provide a very brief (1 sentence) motivational tip or strategic advice.`,
    });
    return response.text || "Stay focused. You've got this.";
}

/**
 * Suggest subtasks to breakdown a task.
 */
export const suggestSubtasks = async (taskTitle: string): Promise<{title: string, estimatedMinutes: number}[]> => {
    const model = "gemini-2.5-flash";
    const prompt = `Break down the following task into 3-5 smaller, actionable subtasks.
    Task: "${taskTitle}"
    
    Return ONLY a JSON array of objects with 'title' and 'estimatedMinutes' (number).
    Example: [{"title": "Draft intro", "estimatedMinutes": 15}, ...]`;

    const responseSchema: Schema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING },
                estimatedMinutes: { type: Type.NUMBER }
            },
            required: ["title", "estimatedMinutes"]
        }
    };

    const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema
        }
    });

    try {
        return JSON.parse(response.text || "[]");
    } catch (e) {
        console.error("Failed to parse suggested subtasks", e);
        return [];
    }
}
