// Utility functions for the mobile app

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): boolean => {
  return password.length >= 6;
};

export const formatDate = (date: string | Date): string => {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const resize = (
  url: string,
  width: number = 800,
  quality: number = 80,
  format: 'webp' | 'jpeg' = 'webp'
): string => {
  if (!url) return url;
  // Supabase will treat additional query strings as transformation directives.
  const delimiter = url.includes('?') ? '&' : '?';
  return `${url}${delimiter}width=${width}&quality=${quality}&format=${format}`;
}; 