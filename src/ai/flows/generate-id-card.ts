
'use server';
/**
 * @fileOverview ID card image generation flow.
 *
 * - generateIdCard - A function that generates an ID card image for a student.
 * - GenerateIdCardInput - The input type for the generateIdCard function.
 * - GenerateIdCardOutput - The return type for the generateIdCard function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Student photo functionality is removed from direct input to the AI flow from the client.
// The AI will generate the ID card without a specific pre-provided student photo.
// School logo is also not provided; AI should use a generic placeholder or omit it.
const GenerateIdCardInputSchema = z.object({
  schoolName: z.string().describe('The name of the school.'),
  studentName: z.string().describe('The name of the student.'),
  fatherName: z.string().describe("The student's father's name."),
  className: z.string().describe('The class of the student.'),
  rollNumber: z.string().describe('The roll number of the student.'),
  dateOfBirth: z.string().describe('The date of birth of the student.'),
  address: z.string().describe('The address of the student.'),
  contactNumber: z.string().describe('The contact number of the student.'),
  schoolLogoDataUri: z
    .string()
    .describe(
      "A placeholder for the school logo as a data URI. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  studentPhotoDataUri: z
    .string()
    .describe(
      "A placeholder for the student photo as a data URI. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type GenerateIdCardInput = z.infer<typeof GenerateIdCardInputSchema>;

const GenerateIdCardOutputSchema = z.object({
  idCardImageDataUri: z
    .string()
    .describe(
      'The generated ID card image as a data URI that must include a MIME type and use Base64 encoding. Expected format: data:<mimetype>;base64,<encoded_data>.'
    ),
});
export type GenerateIdCardOutput = z.infer<typeof GenerateIdCardOutputSchema>;

export async function generateIdCard(input: GenerateIdCardInput): Promise<GenerateIdCardOutput> {
  return generateIdCardFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateIdCardPrompt',
  input: {schema: GenerateIdCardInputSchema},
  output: {schema: GenerateIdCardOutputSchema},
  // Updated prompt to reflect no specific student photo or school logo is being provided.
  // The AI should generate a suitable placeholder or design.
  prompt: `Generate a student ID card image for {{studentName}} from {{schoolName}}. Include all details provided.
The ID card should feature a generic, professional placeholder for where a student photo would typically go, and a generic placeholder or simple design element where a school logo might appear.

School Name: {{schoolName}}
Student Name: {{studentName}}
Father's Name: {{fatherName}}
Class: {{className}}
Roll Number: {{rollNumber}}
Date of Birth: {{dateOfBirth}}
Address: {{address}}
Contact Number: {{contactNumber}}

The ID card should follow common school ID card branding conventions, be professional and easily readable. The background color should be light gray (#F0F8FF), primary color should be Blue (#29ABE2) and accent color should be a contrasting orange (#FF8C00).

Ensure the generated image is a high-quality PNG.`,
  config: {
    safetySettings: [
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_LOW_AND_ABOVE' },
    ],
  },
});

const generateIdCardFlow = ai.defineFlow(
  {
    name: 'generateIdCardFlow',
    inputSchema: GenerateIdCardInputSchema,
    outputSchema: GenerateIdCardOutputSchema,
  },
  async input => {
    // Using the definePrompt object directly which now internally uses googleai/gemini-2.0-flash-exp for image generation.
    // The prompt text already instructs Gemini to generate an image and includes placeholders for school logo and student photo.
    // We pass the placeholder data URIs, though the prompt text guides Gemini to use generic placeholders.
    const {media} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-exp', // Explicitly use the image generation model
      prompt: [
        { media: { url: input.schoolLogoDataUri } }, // Placeholder
        { media: { url: input.studentPhotoDataUri } }, // Placeholder
        {
          text: `Generate a student ID card image for ${input.studentName} from ${input.schoolName}. Include all details provided. The background color should be light gray (#F0F8FF), primary color should be Blue (#29ABE2) and accent color should be a contrasting orange (#FF8C00). Include a generic placeholder for the student photo and school logo.`,
        },
      ],
      config: {
        responseModalities: ['TEXT', 'IMAGE'], // Must request IMAGE for generation
      },
    });
    
    if (!media?.url) {
      throw new Error("Image generation failed or did not return a media URL.");
    }

    return {idCardImageDataUri: media.url};
  }
);
