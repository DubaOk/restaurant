const fs = require('fs');
const path = require('path');
const multer = require('multer');

const uploadsRoot = path.join(process.cwd(), 'uploads');
const restaurantsDir = path.join(uploadsRoot, 'restaurants');
const avatarsDir = path.join(uploadsRoot, 'avatars');
const menuDir = path.join(uploadsRoot, 'menu');

[restaurantsDir, avatarsDir, menuDir].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const makeStorage = (dir) =>
  multer.diskStorage({
    destination: (req, file, cb) => cb(null, dir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase();
      const safeExt = ext || '.jpg';
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
    },
  });

const imageFilter = (req, file, cb) => {
  if (file.mimetype?.startsWith('image/')) {
    cb(null, true);
    return;
  }
  cb(new Error('Можно загружать только изображения'));
};

const uploadRestaurantImages = multer({
  storage: makeStorage(restaurantsDir),
  fileFilter: imageFilter,
  limits: { files: 10, fileSize: 5 * 1024 * 1024 },
});

const uploadUserAvatar = multer({
  storage: makeStorage(avatarsDir),
  fileFilter: imageFilter,
  limits: { files: 1, fileSize: 3 * 1024 * 1024 },
});

const uploadMenuImage = multer({
  storage: makeStorage(menuDir),
  fileFilter: imageFilter,
  limits: { files: 1, fileSize: 5 * 1024 * 1024 },
});

module.exports = { uploadRestaurantImages, uploadUserAvatar, uploadMenuImage };
