import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // 1. Save file to a temp directory so the CLI can access it via path
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    const tempDir = os.tmpdir();
    const tempPath = path.join(tempDir, `upload-${Date.now()}-${file.name}`);
    await fs.writeFile(tempPath, buffer);

    // 2. Construct the Gemini CLI command
    // We prompt the agent to be strict about the output format (JSON)
    const prompt = `
      Analyze the financial file at "${tempPath}".
      Identify if it is a credit card statement or bank statement.
      Extract all transactions and return them ONLY as a valid JSON array.
      Format: [{"date": "YYYY-MM-DD", "description": "text", "category": "text", "amount": number, "type": "income" | "expense"}]
      Do not include any other text or markdown in your response.
    `;

    // 3. Execute the CLI
    // We use the --prompt or -p flag for non-interactive mode and --yolo for auto-approval.
    // Note: In a real environment, you'd ensure 'gemini' is in the system PATH
    const { stdout, stderr } = await execAsync(`gemini --prompt "${prompt.replace(/"/g, '\\"')}" --yolo`);

    if (stderr && !stdout) {
      throw new Error(stderr);
    }

    // 4. Clean up temp file
    await fs.unlink(tempPath);

    // 5. Parse the agent's response
    // Often agents return JSON inside markdown blocks, so we strip them if present
    const jsonMatch = stdout.match(/\[[\s\S]*\]/);
    const transactions = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    return NextResponse.json({ 
      success: true, 
      transactions,
      source: file.name 
    });

  } catch (error: any) {
    console.error('Analysis Error:', error);
    return NextResponse.json({ error: 'Failed to analyze statement: ' + error.message }, { status: 500 });
  }
}
