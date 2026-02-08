import { AnalysisPipeline } from "@/lib/services/AnalysisPipeline";
import { validateConfig } from "@/lib/config/api.config";

export async function POST(request: Request) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        validateConfig();
        
        const { posts, prompt, mode, options } = await request.json();

        // Helper to send progress updates
        const sendProgress = (message: string, progress: number, data?: any) => {
          const chunk = JSON.stringify({ 
            type: 'progress', 
            message, 
            progress,
            data 
          }) + '\n';
          controller.enqueue(encoder.encode(chunk));
        };

        // Helper to send final result
        const sendResult = (result: any) => {
          const chunk = JSON.stringify({ 
            type: 'complete', 
            result 
          }) + '\n';
          controller.enqueue(encoder.encode(chunk));
        };

        // Helper to send error
        const sendError = (error: string) => {
          const chunk = JSON.stringify({ 
            type: 'error', 
            error 
          }) + '\n';
          controller.enqueue(encoder.encode(chunk));
        };

        sendProgress('Starting analysis...', 0);

        // Validate posts
        sendProgress('Validating posts...', 10);
        if (!posts || posts.length === 0) {
          sendError('No posts to analyze');
          controller.close();
          return;
        }

        sendProgress(`Processing ${posts.length} posts...`, 20);

        const pipeline = new AnalysisPipeline();
        
        const result = await pipeline.executeWithProgress({
          posts,
          prompt,
          mode,
          options
        }, (stage: string, progress: number) => {
          sendProgress(stage, progress);
        });

        sendProgress('Analysis complete!', 100);
        sendResult(result);
        controller.close();

      } catch (error: any) {
        const errorChunk = JSON.stringify({ 
          type: 'error', 
          error: error.message || 'Analysis failed' 
        }) + '\n';
        controller.enqueue(encoder.encode(errorChunk));
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

export const runtime = "nodejs";
export const maxDuration = 60; 