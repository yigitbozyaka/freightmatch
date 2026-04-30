import { Response, NextFunction } from 'express';
import { AuthRequest, ErrorCode } from '../types';
import { userRepository } from '../repositories/user.repository';
import fs from 'fs';
import path from 'path';

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

      try {
        const { user, oldPhotoUrl } = await userRepository.updateProfilePhotoUrl(userId, role, profilePhotoUrl);

        if (!user) {
          // Cleanup orphaned file
          fs.unlink(req.file.path, () => {});
          res.status(404).json({
            error: ErrorCode.NOT_FOUND,
            message: 'User not found',
            timestamp: new Date().toISOString(),
          });
          return;
        }

        // Cleanup old photo if it exists and is a local file
        if (oldPhotoUrl && oldPhotoUrl.startsWith('/uploads/')) {
          const oldFilename = path.basename(oldPhotoUrl);
          const oldPath = path.join(__dirname, '..', '..', 'uploads', oldFilename);
          fs.unlink(oldPath, () => {});
        }

        res.status(200).json({ profilePhotoUrl });
      } catch (err: any) {
        // Cleanup orphaned file on repository error (e.g. profile not created)
        fs.unlink(req.file.path, () => {});
        if (err.message === 'Profile must be created before uploading a photo') {
          res.status(400).json({
            error: ErrorCode.VALIDATION_ERROR,
            message: err.message,
            timestamp: new Date().toISOString(),
          });
          return;
        }
        throw err;
      }
    } catch (error) {
      next(error);
    }
  }
}

export const photoController = new PhotoController();
