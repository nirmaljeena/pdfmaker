const express = require('express');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const router = express.Router();

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

router.post('/', async (req, res) => {
  const { images, fps = 25, audio } = req.body;

  if (!Array.isArray(images) || images.length === 0) {
    return res.status(400).send('A non-empty array of base64 image data is required');
  }

  if (!audio) {
    return res.status(400).send('Audio data is required');
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

  const listFile = path.join(tempDir, 'images.txt');
  const audioFilePath = path.join(tempDir, 'audio.mp3');

  try {
    // Convert base64 images to files
    const imagePaths = await Promise.all(
      images.map(async (base64Image, index) => {
        const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
        const filePath = path.join(tempDir, `image${index}.png`);
        await writeFile(filePath, base64Data, 'base64');
        return filePath;
      })
    );

    // Convert base64 audio to a file
    const audioBase64Data = audio.replace(/^data:audio\/\w+;base64,/, '');
    await writeFile(audioFilePath, audioBase64Data, 'base64');

    // Create the list file for FFmpeg
    const fileContent = imagePaths.map(img => `file '${img}'\nduration ${fps}`).join('\n');
    await writeFile(listFile, fileContent, 'utf8');

    // Create the ffmpeg command
    ffmpeg()
      .input(listFile)                          // Use the list file as input
      .inputOptions(['-f', 'concat', '-safe', '0'])  // Specify input format
      .input(audioFilePath)                    // Add audio input
      .outputOptions([
        '-vf', 'format=yuv420p',              // Ensure compatibility with most players
        '-c:v', 'libx264',                    // Use H.264 video codec
        '-r', fps,                            // Output frame rate
        '-c:a', 'aac',                        // Audio codec
        '-shortest'                           // Stop when either video or audio ends
      ])
      .on('start', (commandLine) => {
        console.log('FFmpeg command:', commandLine);
      })
      .on('error', (err, stdout, stderr) => {
        console.error('Error:', err.message);
        console.error('ffmpeg stderr:', stderr);
        if (!res.headersSent) {
          res.status(500).send('Error creating video');
        }
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
              await unlink(listFile);  // Clean up the list file
              await unlink(audioFilePath);  // Clean up the audio file
            } catch (cleanupError) {
              console.error('Cleanup ERROR:', cleanupError);
            }
          }
        });
      })
      .save(videoFilePath);
  } catch (err) {
    console.error('Processing ERROR:', err);
    res.status(500).send('Error processing images');
  }
});

module.exports = router;
