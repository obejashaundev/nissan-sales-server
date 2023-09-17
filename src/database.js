const mongoose = require('mongoose')

const url = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@nissansalescluster.hkvbamm.mongodb.net/?retryWrites=true&w=majority&appName=AtlasApp`;

const connectionParams = {
    useNewUrlParser: true,
    useUnifiedTopology: true
}
mongoose.connect(url, connectionParams)
    .then(() => {
        console.log('Connected to database ')
    })
    .catch((err) => {
        console.error(`Error connecting to the database. \n${err}`);
    })