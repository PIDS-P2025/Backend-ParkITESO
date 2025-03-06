const express = require('express');
const mysql = require('mysql2/promise');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const multer = require('multer');
const path = require('path');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const pool = mysql.createPool({
  host: process.env.RDS_HOSTNAME,
  user: process.env.RDS_USERNAME,
  password: process.env.RDS_PASSWORD,
  port: process.env.RDS_PORT,
  database: process.env.RDS_DB_NAME
});

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

async function uploadToS3(file, id) {
  const fileName = `${id}-${file.originalname}`;
  const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read',
  };

  try {
      await s3.send(new PutObjectCommand(params));
      return `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
  } catch (error) {
      console.error('S3 Upload Error:', error);
      throw new Error('Error uploading file to S3');
  }
}

app.get('/api/profile/:id', async (req, res) => {
  const id = req.params.id;
  try {
      const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
      if (rows.length === 0) {
          return res.status(404).json({ message: 'User not found' });
      }
      res.json(rows[0]);
  } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ message: 'Internal server error' });
  }
});

app.put('/api/profile/:id/profile-picture', upload.single('image'), async (req, res) => {
    const { id } = req.params;
    const { bio } = req.body;

    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    try {
        const imageUrl = await uploadToS3(req.file, id);
        
        const [result] = await pool.query(
            'UPDATE users SET biography = COALESCE(?, biography), profile_picture = COALESCE(?, profile_picture) WHERE id = ?',
            [bio || null, imageUrl || null, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ message: 'Profile picture updated' });
    } catch (error) {
        console.error('Error updating profile picture:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.listen(PORT, () => {      
    console.log("Running on http://localhost:" + PORT);
});


module.exports = { uploadToS3 };