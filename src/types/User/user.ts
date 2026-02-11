/**
 * Data Transfer Object (DTO) for a User.
 * - Keep it simple and generic as a template.
 * - Extend or adapt fields depending on your project requirements.
 */
export interface DTOUser {
  userID: string;
  username: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  isActive: boolean;
}
