export const generateId = (): string => {
  return crypto.randomUUID();
};

export const generateShareId = (): string => {
  return Math.random().toString(36).substr(2, 6);
}; 