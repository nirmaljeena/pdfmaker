const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');

// Directory containing images
const imagesDir = __dirname;
const images = [
  path.join(imagesDir, 'image1.png'),
  path.join(imagesDir, 'image2.png'),
  path.join(imagesDir, 'image3.png')
  
  // Add more images as needed
];

// Path to save the output video file
const outputFile = path.join(__dirname, 'output.mp4');

// Duration of each image in seconds
const imageDuration = 5; // 2 seconds per image

// Create a temporary list file for FFmpeg
const listFile = path.join(__dirname, 'images.txt');
const fileContent = images.map(img => `file '${img}'\nduration ${imageDuration}`).join('\n');

// Write the list file
fs.writeFileSync(listFile, fileContent, 'utf8');

// Create the ffmpeg command
ffmpeg()
  .input(listFile)             // Use the list file as input
  .inputOptions(['-f', 'concat', '-safe', '0'])  // Specify input format
  .outputOptions([
    '-vf', 'format=yuv420p',   // Ensure compatibility with most players
    '-c:v', 'libx264',         // Use H.264 video codec
    '-r', '25'                 // Output frame rate
  ])
  .on('start', (commandLine) => {
    console.log('FFmpeg command:', commandLine);
  })
  .on('error', (err, stdout, stderr) => {
    console.error('Error:', err.message);
    console.error('ffmpeg stderr:', stderr);
  })
  .on('end', () => {
    console.log('Video created successfully at:', outputFile);
    // Clean up the list file
    fs.unlinkSync(listFile);
  })
  .save(outputFile);
