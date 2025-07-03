import React from 'react';

/**
 * Utility function to convert URLs in text to clickable links
 * Supports http, https, and www URLs
 */
export const convertLinksToHyperlinks = (text: string): React.ReactNode => {
  if (!text) return text;

  // Regular expression to match URLs
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
  
  // Split text by URLs and create array of text and link elements
  const parts = text.split(urlRegex);
  
  return parts.map((part, index) => {
    // Check if this part is a URL
    if (urlRegex.test(part)) {
      // Ensure URL has protocol
      let href = part;
      if (part.startsWith('www.')) {
        href = `https://${part}`;
      }
      
      return (
        <a
          key={index}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline break-all"
          onClick={(e) => e.stopPropagation()} // Prevent parent click events
        >
          {part}
        </a>
      );
    }
    
    // Return regular text
    return part;
  });
};

/**
 * Hook version for easier use in components
 */
export const useLinkedText = (text: string): React.ReactNode => {
  return React.useMemo(() => convertLinksToHyperlinks(text), [text]);
};
