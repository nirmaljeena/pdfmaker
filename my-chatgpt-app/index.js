const express = require('express');
const bodyParser = require('body-parser');
const convertRoute = require('./routes/convert');
const createVideoRoute = require('./routes/createVideo');
const app = express();
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(bodyParser.json());
app.use('/convert', convertRoute);
app.use('/create-video', createVideoRoute);
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
