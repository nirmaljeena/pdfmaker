const express = require('express');
const gtts = require('gtts');
const fs = require('fs');
const path = require('path');

const router = express.Router();

router.post('/', (req, res) => {
  const text = req.body.text;

  if (!text) {
    return res.status(400).send('Text is required');
  }

  const gttsInstance = new gtts(text, 'en');
  const fileName = 'output.mp3';
  const outputDir = path.join(__dirname, '..', '..', 'output');
  const filePath = path.join(outputDir, fileName);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  gttsInstance.save(filePath, (err) => {
    if (err) {
      console.error('ERROR:', err);
      return res.status(500).send('Error synthesizing speech');
    }

    console.log('Audio content written to file: ' + fileName);

    fs.readFile(filePath, (err, data) => {
      if (err) {
        console.error('ERROR:', err);
        return res.status(500).send('Error reading the audio file');
      }

      const base64Audio = data.toString('base64');
      console.log(base64Audio)
      res.json({ audio: base64Audio });

      // Optionally, delete the file after sending the response
      fs.unlink(filePath, (err) => {
        if (err) {
          console.error('ERROR:', err);
        }
      });
    });
  });
});

module.exports = router;
