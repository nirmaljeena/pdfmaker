const express = require('express');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const router = express.Router();

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

router.post('/', async (req, res) => {
  const { images, fps = 1 } = req.body;

  if (!Array.isArray(images) || images.length === 0) {
    return res.status(400).send('A non-empty array of base64 image data is required');
  }

  const outputDir = path.join(__dirname, '..', '..', 'output');
  const videoFileName = 'output.mp4';
  const videoFilePath = path.join(outputDir, videoFileName);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  const tempDir = path.join(__dirname, '..', '..', 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }

  try {
    const imagePaths = await Promise.all(
      images.map(async (base64Image, index) => {
        const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
        const filePath = path.join(tempDir, `image${index}.png`);
        await writeFile(filePath, base64Data, 'base64');
        return filePath;
      })
    );

    const ffmpegCommand = ffmpeg();

    imagePaths.forEach((image) => ffmpegCommand.input(image));

    ffmpegCommand
      .inputFPS(fps)
      .outputOptions('-c:v libx264', '-pix_fmt yuv420p')
      .save(videoFilePath)
      .on('start', (commandLine) => {
        console.log('FFmpeg command:', commandLine);
      })
      .on('end', async () => {
        console.log('Video content written to file:', videoFileName);

        res.sendFile(videoFilePath, async (err) => {
          if (err) {
            console.error('ERROR:', err);
            if (!res.headersSent) {
              res.status(500).send('Error sending video file');
            }
          } else {
            try {
              await unlink(videoFilePath);
              await Promise.all(imagePaths.map((imagePath) => unlink(imagePath)));
            } catch (cleanupError) {
              console.error('Cleanup ERROR:', cleanupError);
            }
          }
        });
      })
      .on('error', (err) => {
        console.error('FFmpeg ERROR:', err);
        if (!res.headersSent) {
          res.status(500).send('Error creating video');
        }
      });
  } catch (err) {
    console.error('Processing ERROR:', err);
    res.status(500).send('Error processing images');
  }
});

module.exports = router;
