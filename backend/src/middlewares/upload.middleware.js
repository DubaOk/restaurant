const fs = require('fs');
const path = require('path');
const multer = require('multer');

const uploadsRoot = path.join(process.cwd(), 'uploads');
const restaurantsDir = path.join(uploadsRoot, 'restaurants');

if (!fs.existsSync(restaurantsDir)) {
  fs.mkdirSync(restaurantsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, restaurantsDir),
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
  storage,
  fileFilter: imageFilter,
  limits: { files: 10, fileSize: 5 * 1024 * 1024 },
});

module.exports = { uploadRestaurantImages };
