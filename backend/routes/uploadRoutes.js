import path from 'path';
import express from 'express';
import multer from 'multer';

const router = express.Router();

const storage = multer.diskStorage({
  destination (req, file, cb) {   // cb is the callback to call within here
    cb(null, 'uploads/');         // null is for error followed by where we want uploads to go
  },
  filename(req, file, cb) {       // function to describe how filenames are to be formated
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(FileReader.originalname)}`)
  }
});

function checkFileType(file, cb) {
  const filetypes = /jpg|jpeg|png/; // regular expression for allowed file types
  // Test file extension and mimetype against regular expression
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);
  // Check file is an allowed file type
  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb('Images only!');
  }
}

const upload = multer({
  storage,
});

router.post('/', upload.single('image'), (req, res) => {
  res.send({
    message: 'Image Uploaded',
    image: `/${req.file.path}`
  });
});

export default router;