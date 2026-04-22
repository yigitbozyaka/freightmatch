import { Response, NextFunction } from 'express';
import { AuthRequest, ErrorCode } from '../types';
import { userRepository } from '../repositories/user.repository';

export class PhotoController {
  async uploadPhoto(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          error: ErrorCode.VALIDATION_ERROR,
          message: 'No photo file provided',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const userId = req.user!.userId;
      const role = req.user!.role;
      const profilePhotoUrl = `/uploads/${req.file.filename}`;

      const user = await userRepository.updateProfilePhotoUrl(userId, role, profilePhotoUrl);

      if (!user) {
        res.status(404).json({
          error: ErrorCode.NOT_FOUND,
          message: 'User not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(200).json({ profilePhotoUrl });
    } catch (error) {
      next(error);
    }
  }
}

export const photoController = new PhotoController();
