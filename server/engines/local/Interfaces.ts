export interface IOCRProvider {
  extractText(imagePath: string): Promise<string>;
}

export interface IDocumentLayoutDetector {
  detectLayout(imagePath: string): Promise<any>;
}

export interface IClinicalExtractionEngine {
  extractClinicalEntities(text: string): Promise<any>;
}
