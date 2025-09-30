/**
 * Data Transfer Object (DTO) for a User.
 * - Keep it simple and generic as a template.
 * - Extend or adapt fields depending on your project requirements.
 */
export interface DTOUser {
  id: number;
  userName: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  isActive: boolean;
}
