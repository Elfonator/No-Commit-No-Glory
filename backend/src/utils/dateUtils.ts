export const normalizeDate = (input: string | Date): Date => {
  const date = new Date(input);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()); // 00:00:00
};