export type Ad = {
  id: number;
  title: string;
  imageUrl: string;
  destinationUrl: string;
  isActive: boolean;
  displayOrder: number;
  targetAccounts: string[];
};