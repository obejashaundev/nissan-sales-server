// #region Importing libraries installed
const { Router } = require('express')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
// #endregion

// #region Initialize router and data models
const router = Router()
const User = require('../models/User')
// #endregion

// #region Handling functions for middleware of service
function error(status, msg) {
    var err = new Error(msg);
    err.status = status;
    return err;
}
// #endregion

// #region GET paths
router.get('/', (req, res, next) => {
    res.send('Hi, this is the Nissan Sales API')
})
// #endregion

// #region POST paths
//register
router.post('/signup', async (req, res, next) => {
    let { email, password } = req.body
    if (!email) return next(error(400, 'The email property is not defined'))
    if (!password) return next(error(400, 'The password property is not defined'))
    password = bcrypt.hashSync(password, process.env.SALT_ROUNDS)
    let newUser = new User({ email, password })
    await newUser.save()
    let token = jwt.sign({ _id: newUser._id }, process.env.JWT_SECRET_KEY)
    res.json({ token })
})

//login
router.post('/signin', (req, res) => {
    let { email, password } = req.body
    if (!email) return next(error(400, 'The email property is not defined'))
    if (!password) return next(error(400, 'The password property is not defined'))
    let hashedPassword = ''
    let isValid = bcrypt.compareSync(password, hashedPassword)
    let result = isValid ? 'The password is correct' : 'Try again, because the password is incorrect'
    res.send(result)
})
// #endregion

// #region PUT paths
// #endregion

// #region DELETE paths
// #endregion

module.exports = router