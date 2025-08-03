/**
 * Text formatting and processing utilities for TimeFlow application
 */

/**
 * Truncates text to a specified length and adds ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) {
    return text;
  }
  
  // Try to break at word boundary
  const truncated = text.substring(0, maxLength);
  const lastSpaceIndex = truncated.lastIndexOf(' ');
  
  if (lastSpaceIndex > maxLength * 0.8) {
    return truncated.substring(0, lastSpaceIndex) + '...';
  }
  
  return truncated + '...';
}

/**
 * Counts the number of lines in a text string
 */
export function countLines(text: string): number {
  if (!text) return 0;
  return text.split('\n').length;
}

/**
 * Estimates reading time for a given text
 */
export function estimateReadingTime(text: string, wordsPerMinute: number = 200): number {
  if (!text) return 0;
  
  const words = text.trim().split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
}

/**
 * Formats text for preview display (first paragraph or truncated)
 */
export function getTextPreview(text: string, maxLength: number = 150): string {
  if (!text) return '';
  
  // Get first paragraph
  const firstParagraph = text.split(/\n\s*\n/)[0];
  
  // If first paragraph is short enough, return it
  if (firstParagraph.length <= maxLength) {
    return firstParagraph;
  }
  
  // Otherwise truncate
  return truncateText(firstParagraph, maxLength);
}

/**
 * Checks if text contains multiple paragraphs
 */
export function hasMultipleParagraphs(text: string): boolean {
  if (!text) return false;
  return text.split(/\n\s*\n/).filter(p => p.trim()).length > 1;
}

/**
 * Normalizes line breaks in text (converts different line break styles to \n)
 */
export function normalizeLineBreaks(text: string): string {
  if (!text) return '';
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/**
 * Removes excessive whitespace while preserving intentional formatting
 */
export function cleanWhitespace(text: string): string {
  if (!text) return '';
  
  return text
    // Normalize line breaks
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove trailing spaces from lines
    .replace(/[ \t]+$/gm, '')
    // Limit consecutive empty lines to maximum of 2
    .replace(/\n{3,}/g, '\n\n')
    // Trim start and end
    .trim();
}

/**
 * Formats text for display in cards with smart truncation
 */
export function formatForCard(text: string, maxLines: number = 3): {
  preview: string;
  isTruncated: boolean;
  fullText: string;
} {
  if (!text) {
    return {
      preview: '',
      isTruncated: false,
      fullText: ''
    };
  }

  const cleaned = cleanWhitespace(text);
  const lines = cleaned.split('\n');
  
  if (lines.length <= maxLines) {
    return {
      preview: cleaned,
      isTruncated: false,
      fullText: cleaned
    };
  }

  const preview = lines.slice(0, maxLines).join('\n');
  return {
    preview,
    isTruncated: true,
    fullText: cleaned
  };
}

/**
 * Validates and formats user input for descriptions
 */
export function validateAndFormatDescription(input: string): {
  isValid: boolean;
  formatted: string;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!input || input.trim() === '') {
    return {
      isValid: true,
      formatted: '',
      errors: []
    };
  }

  const cleaned = cleanWhitespace(input);
  
  // Check for reasonable length limits
  if (cleaned.length > 5000) {
    errors.push('Descrição muito longa (máximo 5000 caracteres)');
  }
  
  // Check for excessive line breaks
  if (cleaned.split('\n').length > 50) {
    errors.push('Muitas quebras de linha (máximo 50 linhas)');
  }

  return {
    isValid: errors.length === 0,
    formatted: cleaned,
    errors
  };
}

/**
 * Extracts keywords from text for search/filtering
 */
export function extractKeywords(text: string, minLength: number = 3): string[] {
  if (!text) return [];
  
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length >= minLength)
    .filter((word, index, array) => array.indexOf(word) === index) // Remove duplicates
    .slice(0, 20); // Limit to 20 keywords
}

/**
 * Highlights search terms in text
 */
export function highlightSearchTerms(text: string, searchTerms: string[]): string {
  if (!text || !searchTerms.length) return text;
  
  let highlighted = text;
  
  searchTerms.forEach(term => {
    if (term.length >= 2) {
      const regex = new RegExp(`(${term})`, 'gi');
      highlighted = highlighted.replace(regex, '<mark>$1</mark>');
    }
  });
  
  return highlighted;
}
