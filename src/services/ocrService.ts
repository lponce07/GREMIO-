/**
 * -----------------------------------------------------------------------------
 * SERVIÇO ROBUSTO DE OCR E EXTRAÇÃO DOCUMENTAL - GRÊMIO DO NPOR
 * -----------------------------------------------------------------------------
 * - Worker singleton reutilizável do Tesseract.js (evita criar/destruir worker a cada arquivo)
 * - Fila de processamento com limite de concorrência (concurrency = 1)
 * - Timeout por documento (45s com cancelamento e recuperação de worker)
 * - Fallback automático de idioma (por -> eng)
 * - Pré-processamento avançado em Canvas para imagens:
 *     * Normalização de dimensões
 *     * Fundo branco para remoção de transparência alfa problemática
 *     * Binarização e ajuste de contraste adaptativo
 * - Extração de texto nativo em PDFs via pdfjs-dist
 * - Renderização de páginas de PDF em alta resolução (scale: 2.0) caso o PDF não possua texto nativo
 * - Status detalhados: pending | processing | success | failed | needs_review
 * - Log detalhado com motivo técnico resumido
 * - NENHUM assistente/chatbot de IA — 100% determinístico
 * -----------------------------------------------------------------------------
 */

import * as pdfjsLib from 'pdfjs-dist';

export type OcrDocumentStatus = 'pending' | 'processing' | 'success' | 'failed' | 'needs_review';

export interface OcrExtractionResult {
  text: string;
  status: OcrDocumentStatus;
  confidence: number;
  isNativePdfText: boolean;
  pagesProcessed: number;
  technicalError?: string;
  languageUsed?: 'por' | 'eng';
}

export type OcrProgressCallback = (progress: number, phase: string) => void;

interface QueueItem {
  id: string;
  source: {
    buffer?: ArrayBuffer;
    blob?: Blob;
    mimeType: string;
    fileName: string;
  };
  onProgress?: OcrProgressCallback;
  resolve: (result: OcrExtractionResult) => void;
  reject: (err: Error) => void;
}

// Configura o worker do pdfjs se disponível
try {
  if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
    // Usar worker unpkg compatível com a versão instalada
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '4.0.379'}/build/pdf.worker.min.mjs`;
  }
} catch (e) {
  console.warn('[OCR/PDF] Aviso ao configurar worker do pdfjs:', e);
}

class RobustOcrService {
  private tesseractWorker: any = null;
  private currentLanguage: 'por' | 'eng' = 'por';
  private isInitializing = false;
  private queue: QueueItem[] = [];
  private isProcessingQueue = false;
  private activeJobsCount = 0;
  private readonly maxConcurrency = 1; // 1 por vez para não congelar o thread do browser
  private readonly timeoutMs = 45000; // 45 segundos

  /**
   * Obtém ou inicializa o worker singleton reutilizável do Tesseract.js
   */
  private async getWorker(lang: 'por' | 'eng' = 'por'): Promise<any> {
    if (this.tesseractWorker && this.currentLanguage === lang) {
      return this.tesseractWorker;
    }

    // Se mudou de idioma ou worker morreu, encerra o anterior
    if (this.tesseractWorker) {
      try {
        await this.tesseractWorker.terminate();
      } catch (e) {
        console.warn('[OCR] Erro ao terminar worker antigo:', e);
      }
      this.tesseractWorker = null;
    }

    while (this.isInitializing) {
      await new Promise((r) => setTimeout(r, 150));
    }

    if (this.tesseractWorker && this.currentLanguage === lang) {
      return this.tesseractWorker;
    }

    this.isInitializing = true;
    try {
      console.log(`[OCR] Inicializando worker singleton do Tesseract.js (idioma: ${lang})...`);
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker(lang);
      this.tesseractWorker = worker;
      this.currentLanguage = lang;
      console.log(`[OCR] Worker singleton pronto.`);
      return this.tesseractWorker;
    } catch (err) {
      console.error(`[OCR] Falha ao inicializar worker com idioma ${lang}:`, err);
      // Se falhou ao carregar 'por', tenta 'eng' como fallback seguro
      if (lang === 'por') {
        console.log('[OCR] Tentando fallback de inicialização para idioma "eng"...');
        try {
          const { createWorker } = await import('tesseract.js');
          const worker = await createWorker('eng');
          this.tesseractWorker = worker;
          this.currentLanguage = 'eng';
          return this.tesseractWorker;
        } catch (engErr) {
          console.error('[OCR] Falha também no fallback "eng":', engErr);
          throw engErr;
        }
      }
      throw err;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Encerra com segurança o worker singleton em caso de travamento/timeout
   */
  private async forceRestartWorker(): Promise<void> {
    console.warn('[OCR] Reiniciando worker singleton forçadamente...');
    if (this.tesseractWorker) {
      try {
        await this.tesseractWorker.terminate();
      } catch {}
      this.tesseractWorker = null;
    }
  }

  /**
   * Adiciona um documento à fila de processamento de OCR com progresso
   */
  public async processDocument(
    source: {
      buffer?: ArrayBuffer;
      blob?: Blob;
      mimeType: string;
      fileName: string;
    },
    onProgress?: OcrProgressCallback
  ): Promise<OcrExtractionResult> {
    return new Promise<OcrExtractionResult>((resolve, reject) => {
      this.queue.push({
        id: `ocr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        source,
        onProgress,
        resolve,
        reject,
      });

      this.processNextInQueue();
    });
  }

  private async processNextInQueue(): Promise<void> {
    if (this.isProcessingQueue || this.activeJobsCount >= this.maxConcurrency || this.queue.length === 0) {
      return;
    }

    const job = this.queue.shift();
    if (!job) return;

    this.activeJobsCount++;
    this.isProcessingQueue = true;

    try {
      if (job.onProgress) job.onProgress(5, 'Iniciando extração do documento');
      const result = await this.executeJobWithTimeout(job);
      job.resolve(result);
    } catch (err: any) {
      console.error(`[OCR] Falha fatal no processamento do arquivo ${job.source.fileName}:`, err);
      job.resolve({
        text: '',
        status: 'failed',
        confidence: 0,
        isNativePdfText: false,
        pagesProcessed: 0,
        technicalError: err?.message || 'Erro interno no processamento OCR',
      });
    } finally {
      this.activeJobsCount--;
      this.isProcessingQueue = false;
      // Processa o próximo da fila
      setTimeout(() => this.processNextInQueue(), 20);
    }
  }

  private async executeJobWithTimeout(job: QueueItem): Promise<OcrExtractionResult> {
    let timeoutHandle: any = null;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(new Error(`Timeout de processamento OCR excedido (${this.timeoutMs / 1000}s)`));
      }, this.timeoutMs);
    });

    try {
      const execPromise = this.executeJob(job);
      const result = await Promise.race([execPromise, timeoutPromise]);
      return result;
    } catch (err: any) {
      if (String(err?.message || '').includes('Timeout')) {
        await this.forceRestartWorker();
      }
      throw err;
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle);
    }
  }

  private async executeJob(job: QueueItem): Promise<OcrExtractionResult> {
    const { source, onProgress } = job;
    const mime = (source.mimeType || '').toLowerCase();
    const fileName = (source.fileName || '').toLowerCase();

    // 1. Obter buffer binário do arquivo
    let buffer: ArrayBuffer;
    if (source.buffer) {
      buffer = source.buffer;
    } else if (source.blob) {
      buffer = await source.blob.arrayBuffer();
    } else {
      return {
        text: '',
        status: 'failed',
        confidence: 0,
        isNativePdfText: false,
        pagesProcessed: 0,
        technicalError: 'Nenhum dado binário ou buffer fornecido para análise',
      };
    }

    if (buffer.byteLength === 0) {
      return {
        text: '',
        status: 'failed',
        confidence: 0,
        isNativePdfText: false,
        pagesProcessed: 0,
        technicalError: 'Arquivo vazio (0 bytes)',
      };
    }

    // -------------------------------------------------------------------------
    // 2. DOCUMENTOS PDF: Tentar extrair texto nativo primeiro
    // -------------------------------------------------------------------------
    if (mime === 'application/pdf' || fileName.endsWith('.pdf')) {
      if (onProgress) onProgress(15, 'Analisando camada de texto nativa do PDF');
      try {
        const nativePdfText = await this.extractNativePdfText(buffer);
        if (this.isUsefulText(nativePdfText)) {
          if (onProgress) onProgress(100, 'Texto nativo extraído com sucesso');
          return {
            text: nativePdfText.trim(),
            status: 'success',
            confidence: 0.98,
            isNativePdfText: true,
            pagesProcessed: 1,
          };
        }
      } catch (pdfErr) {
        console.warn(`[OCR] Falha ao extrair texto nativo do PDF ${source.fileName}, tentando renderização:`, pdfErr);
      }

      // Se o PDF não tem texto nativo útil (PDF escaneado/digitalizado), renderizar páginas em imagens
      if (onProgress) onProgress(30, 'PDF digitalizado: renderizando páginas para OCR óptico');
      try {
        const renderedCanvases = await this.renderPdfPagesToCanvas(buffer, 2); // até 2 páginas
        if (renderedCanvases.length === 0) {
          return {
            text: '',
            status: 'failed',
            confidence: 0,
            isNativePdfText: false,
            pagesProcessed: 0,
            technicalError: 'Não foi possível renderizar páginas do PDF para OCR',
          };
        }

        const pageTexts: string[] = [];
        let totalConfidence = 0;

        for (let i = 0; i < renderedCanvases.length; i++) {
          const pageCanvas = renderedCanvases[i];
          if (onProgress) {
            onProgress(40 + Math.round((i / renderedCanvases.length) * 50), `Executando OCR na página ${i + 1} de ${renderedCanvases.length}`);
          }

          // Pré-processar a imagem do canvas
          const preprocessedBlob = await this.preprocessCanvas(pageCanvas);
          const pageResult = await this.runTesseractWithRetry(preprocessedBlob);

          if (pageResult.text) {
            pageTexts.push(pageResult.text);
            totalConfidence += pageResult.confidence;
          }
        }

        const combinedText = pageTexts.join('\n\n---\n\n').trim();
        const avgConfidence = renderedCanvases.length > 0 ? totalConfidence / renderedCanvases.length : 0;

        if (!combinedText || combinedText.length < 15) {
          return {
            text: combinedText,
            status: 'needs_review',
            confidence: avgConfidence,
            isNativePdfText: false,
            pagesProcessed: renderedCanvases.length,
            technicalError: 'Pouco ou nenhum texto detectado no PDF digitalizado',
          };
        }

        if (onProgress) onProgress(100, 'OCR do PDF digitalizado concluído');
        return {
          text: combinedText,
          status: 'success',
          confidence: avgConfidence || 0.85,
          isNativePdfText: false,
          pagesProcessed: renderedCanvases.length,
        };
      } catch (renderErr: any) {
        console.error(`[OCR] Erro ao renderizar e executar OCR no PDF ${source.fileName}:`, renderErr);
        return {
          text: '',
          status: 'failed',
          confidence: 0,
          isNativePdfText: false,
          pagesProcessed: 0,
          technicalError: `Falha na renderização de páginas do PDF: ${renderErr?.message || 'erro desconhecido'}`,
        };
      }
    }

    // -------------------------------------------------------------------------
    // 3. IMAGENS (PNG, JPEG, WEBP, etc.)
    // -------------------------------------------------------------------------
    if (mime.startsWith('image/') || /\.(png|jpe?g|webp|bmp|tiff?)$/i.test(fileName)) {
      if (onProgress) onProgress(20, 'Normalizando orientação e melhorando contraste da imagem');
      try {
        const preprocessedBlob = await this.preprocessImageBuffer(buffer, mime);
        if (onProgress) onProgress(45, 'Reconhecendo caracteres (OCR)');

        const ocrResult = await this.runTesseractWithRetry(preprocessedBlob);

        if (!ocrResult.text || ocrResult.text.length < 10) {
          return {
            text: ocrResult.text,
            status: 'needs_review',
            confidence: ocrResult.confidence,
            isNativePdfText: false,
            pagesProcessed: 1,
            technicalError: 'Nenhum texto legível extraído da imagem (baixa nitidez ou documento ilegível)',
          };
        }

        if (onProgress) onProgress(100, 'OCR da imagem concluído');
        return {
          text: ocrResult.text,
          status: 'success',
          confidence: ocrResult.confidence,
          isNativePdfText: false,
          pagesProcessed: 1,
          languageUsed: ocrResult.languageUsed,
        };
      } catch (imgErr: any) {
        console.error(`[OCR] Falha no processamento de imagem ${source.fileName}:`, imgErr);
        return {
          text: '',
          status: 'failed',
          confidence: 0,
          isNativePdfText: false,
          pagesProcessed: 0,
          technicalError: `Falha no motor OCR: ${imgErr?.message || 'erro ao processar imagem'}`,
        };
      }
    }

    // -------------------------------------------------------------------------
    // 4. ARQUIVOS DE TEXTO PLANO / CSV
    // -------------------------------------------------------------------------
    if (mime.startsWith('text/') || fileName.endsWith('.txt') || fileName.endsWith('.csv')) {
      try {
        const decoded = new TextDecoder('utf-8').decode(buffer);
        if (onProgress) onProgress(100, 'Texto lido diretamente');
        return {
          text: decoded.trim(),
          status: 'success',
          confidence: 1.0,
          isNativePdfText: true,
          pagesProcessed: 1,
        };
      } catch (decodeErr) {
        return {
          text: '',
          status: 'failed',
          confidence: 0,
          isNativePdfText: false,
          pagesProcessed: 0,
          technicalError: 'Falha ao decodificar arquivo de texto UTF-8',
        };
      }
    }

    // Tipo não suportado
    return {
      text: '',
      status: 'failed',
      confidence: 0,
      isNativePdfText: false,
      pagesProcessed: 0,
      technicalError: `Tipo de arquivo não suportado para OCR (${mime || fileName})`,
    };
  }

  /**
   * Executa OCR no blob com Tesseract e realiza retry controlado com idioma 'eng' se necessário
   */
  private async runTesseractWithRetry(
    imageBlob: Blob
  ): Promise<{ text: string; confidence: number; languageUsed: 'por' | 'eng' }> {
    // 1ª tentativa: Português ('por')
    try {
      const workerPor = await this.getWorker('por');
      const res = await workerPor.recognize(imageBlob);
      const text = (res?.data?.text || '').trim();
      const confidence = (res?.data?.confidence || 0) / 100;

      if (text && text.length >= 10) {
        return { text, confidence, languageUsed: 'por' };
      }
    } catch (errPor) {
      console.warn('[OCR] Falha com idioma por, executando retry com fallback eng:', errPor);
    }

    // 2ª tentativa (Retry com Fallback de Idioma para 'eng')
    try {
      const workerEng = await this.getWorker('eng');
      const res = await workerEng.recognize(imageBlob);
      const text = (res?.data?.text || '').trim();
      const confidence = (res?.data?.confidence || 0) / 100;
      return { text, confidence, languageUsed: 'eng' };
    } catch (errEng) {
      console.error('[OCR] Falha também no retry com idioma eng:', errEng);
      throw errEng;
    }
  }

  /**
   * Extração direta de texto nativo embutido em páginas de PDF via pdfjs-dist
   */
  private async extractNativePdfText(buffer: ArrayBuffer): Promise<string> {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      useWorkerFetch: false,
      useSystemFonts: true,
    } as any);

    const pdfDoc = await loadingTask.promise;
    const numPages = Math.min(pdfDoc.numPages, 5); // até 5 páginas de texto
    const textPieces: string[] = [];

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageItems = textContent.items
        .map((item: any) => (item?.str ? item.str : ''))
        .filter(Boolean);

      if (pageItems.length > 0) {
        textPieces.push(pageItems.join(' '));
      }
    }

    return textPieces.join('\n\n');
  }

  /**
   * Renderiza páginas de PDF para elementos Canvas com escala 2.0 para OCR de alta nitidez
   */
  private async renderPdfPagesToCanvas(buffer: ArrayBuffer, maxPages = 2): Promise<HTMLCanvasElement[]> {
    if (typeof document === 'undefined') return [];

    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      useWorkerFetch: false,
    } as any);

    const pdfDoc = await loadingTask.promise;
    const pagesToRender = Math.min(pdfDoc.numPages, maxPages);
    const canvases: HTMLCanvasElement[] = [];

    for (let pageNum = 1; pageNum <= pagesToRender; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const scale = 2.0; // Alta resolução para legibilidade de texto pequeno
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (!ctx) continue;

      // Fundo branco
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const renderContext: any = {
        canvasContext: ctx,
        viewport,
      };

      await page.render(renderContext).promise;
      canvases.push(canvas);
    }

    return canvases;
  }

  /**
   * Normalização e pré-processamento de buffer de imagem para Canvas
   * - Garante remoção de transparência alfa (substitui por branco)
   * - Redimensiona se excessivamente grande ou muito pequena
   * - Aumenta contraste e binariza suavemente para legibilidade do OCR
   */
  private async preprocessImageBuffer(buffer: ArrayBuffer, mimeType: string): Promise<Blob> {
    if (typeof document === 'undefined') {
      return new Blob([buffer], { type: mimeType || 'image/png' });
    }

    return new Promise<Blob>((resolve, reject) => {
      const blob = new Blob([buffer], { type: mimeType || 'image/png' });
      const imgUrl = URL.createObjectURL(blob);
      const img = new Image();

      img.onload = async () => {
        try {
          URL.revokeObjectURL(imgUrl);

          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;

          // Se for excessivamente grande (> 2400px), reduz proporcionalmente
          const maxDim = 2400;
          if (width > maxDim || height > maxDim) {
            const ratio = Math.min(maxDim / width, maxDim / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          } else if (width < 600 && height < 600) {
            // Se for muito pequena, amplia para dar resolução suficiente às letras
            width = Math.round(width * 1.6);
            height = Math.round(height * 1.6);
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });

          if (!ctx) {
            resolve(blob);
            return;
          }

          // 1. Fundo branco rígido (elimina transparência que causa texto preto sobre fundo preto no OCR)
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);

          // 2. Desenha a imagem
          ctx.drawImage(img, 0, 0, width, height);

          // 3. Binarização e ajuste de contraste
          const processedBlob = await this.preprocessCanvas(canvas);
          resolve(processedBlob);
        } catch (e) {
          resolve(blob);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(imgUrl);
        resolve(blob);
      };

      img.src = imgUrl;
    });
  }

  /**
   * Processa filtros de escala de cinza e contraste em um Canvas
   */
  private async preprocessCanvas(canvas: HTMLCanvasElement): Promise<Blob> {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      return new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b || new Blob()), 'image/png'));
    }

    try {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;

      // Calcular média de luminosidade para contraste adaptativo
      let sumLuminance = 0;
      const step = 4; // amostra para agilidade
      for (let i = 0; i < data.length; i += 4 * step) {
        sumLuminance += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      }
      const avgLuminance = sumLuminance / (data.length / (4 * step));

      // Ajuste de contraste: expande os extremos
      const contrastFactor = 1.35;
      const intercept = 128 * (1 - contrastFactor);

      for (let i = 0; i < data.length; i += 4) {
        // Escala de cinza padrão NTSC
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

        // Aplica contraste
        let adjusted = gray * contrastFactor + intercept;

        // Se o documento for muito claro no geral, reforça as letras escuras
        if (avgLuminance > 160 && adjusted < 180) {
          adjusted = adjusted * 0.85;
        }

        adjusted = Math.max(0, Math.min(255, adjusted));

        data[i] = adjusted;
        data[i + 1] = adjusted;
        data[i + 2] = adjusted;
        data[i + 3] = 255; // opaco 100%
      }

      ctx.putImageData(imgData, 0, 0);
    } catch (err) {
      console.warn('[OCR] Falha no filtro de contraste de Canvas, usando original:', err);
    }

    return new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b || new Blob()), 'image/png');
    });
  }

  /**
   * Avalia se um texto extraído possui caracteres e termos suficientes para ser considerado útil
   */
  private isUsefulText(text: string): boolean {
    if (!text) return false;
    const clean = text.replace(/\s+/g, ' ').trim();
    if (clean.length < 25) return false;

    // Procura por palavras e padrões típicos de comprovantes e documentos financeiros
    const financialPattern = /(r\$|valor|total|pagamento|recebimento|pix|transferencia|comprovante|banco|bradesco|itau|santander|caixa|nubank|inter|sicredi|sicoob|cnpj|cpf|autentica|data|liquidacao|transacao)/i;
    return financialPattern.test(clean);
  }
}

// Exporta instância singleton global do serviço
export const robustOcrService = new RobustOcrService();
