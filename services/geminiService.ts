

import { GoogleGenAI, Type } from "@google/genai";
import { ArchitectureReview } from "../types";

const SYSTEM_INSTRUCTION = `You are a world-class Senior Frontend Architect with 10 years of experience. 
Your core principles are:
1. Minimal Change Footprint: Only modify what is strictly necessary.
2. Logic Preservation: Ensure existing business logic remains untouched and fully functional.
3. Flexible UI: Suggest UI expansions that are modular and scalable.

Your task is to analyze the provided code and a specific expansion requirement. 
Return a structured JSON report following this schema:
- riskLevel: "Low" | "Medium" | "High"
- summary: A high-level overview of the proposed changes.
- changeFootprint: Which specific lines or components are affected.
- logicPreservation: How you ensured the old logic stays safe.
- expansionStrategy: Step-by-step instructions.
- refactoredCode: The complete code after the modification.
- dependencyMap: An array of { source, target, relationship } representing the logic flow.

Be precise, technical, and prioritize system stability over "beautiful code" if it breaks existing logic.`;

export async function analyzeArchitecture(code: string, requirement: string): Promise<ArchitectureReview> {
  // Use the API key exclusively from process.env.API_KEY as per instructions.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: `Analyze the following code and provide a strategy for this requirement:
    
    CODE:
    ${code}
    
    REQUIREMENT:
    ${requirement}`,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          riskLevel: { type: Type.STRING },
          summary: { type: Type.STRING },
          changeFootprint: { type: Type.STRING },
          logicPreservation: { type: Type.STRING },
          expansionStrategy: { 
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          refactoredCode: { type: Type.STRING },
          dependencyMap: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                source: { type: Type.STRING },
                target: { type: Type.STRING },
                relationship: { type: Type.STRING }
              },
              required: ["source", "target", "relationship"]
            }
          }
        },
        required: ["riskLevel", "summary", "changeFootprint", "logicPreservation", "expansionStrategy", "refactoredCode", "dependencyMap"]
      }
    }
  });

  const result = JSON.parse(response.text);
  return result as ArchitectureReview;
}
