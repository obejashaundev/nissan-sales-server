// #region Importing libraries installed
const { Router } = require('express')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
// #endregion

// #region Initialize router and data models
const router = Router()
const User = require('../models/User')
const JSONResponse = require('../models/JSONResponse')
// #endregion

// #region Handling functions for middleware of service
let responseError = (req, res) => {
    let statusCode = req.statusCode || 400
    res.status(statusCode).json(new JSONResponse({ status: JSONResponse.error, message: req.message }))
}
let credentialValidation = (req, res, next) => {
    let { email, password } = req.body
    if (!email) {
        req.message = 'The email property is not defined'
        responseError(req, res)
    }
    if (!password) {
        req.message = 'The password property is not defined'
        responseError(req, res)
    }
    next()
}
let signUpVerifyUserExistence = async (req, res, next) => {
    let { email } = req.body
    let user = await User.findOne({ email })
    if (user) {
        req.message = "The user it's already exists"
        responseError(req, res)
    }else{
        next()
    }
}
let signInVerifyUserExistence = async (req, res, next) => {
    let { email } = req.body
    let user = await User.findOne({ email })
    if (!user) {
        req.message = "The entered credentials are invalid"
        responseError(req, res)
    }else{
        req.passwordHash = user.password
        req._id = user._id
        next()
    }
}
let checkPassword = (req, res, next) => {
    try {
        let { password } = req.body
        let passwordHash = req.passwordHash
        let isValid = bcrypt.compareSync(password, passwordHash)
        let result = isValid ? '¡Welcome!' : 'The entered credentials are invalid'
        if (!isValid) {
            throw result
        }
        req.result = result
        next()
    } catch (err) {
        req.message = err
        responseError(req, res)
    }
}
let checkToken = (req, res, next) => {
    try {
        if (!req.headers.authorization) {
            throw 'Unauthorize request'
        } else {
            let token = req.headers.authorization.split(' ')[1]
            if (!token) {
                throw 'Unauthorize request'
            } else {
                try {
                    let payload = jwt.verify(token, process.env.JWT_SECRET_KEY)
                    req.userid = payload._id
                    next()
                } catch (err) {
                    throw err.message
                }
            }
        }
    } catch (err) {
        req.statusCode = 401
        req.message = err
        responseError(req, res)
    }
}
// #endregion

// #region GET paths
router.get('/', (req, res, next) => {
    res.send('Hi, this is the Nissan Sales API')
})
router.get('/tasks', (req, res, next) => {
    res.json(new JSONResponse({ data: [
        {
            _id: 1,
            name: 'Task one',
            description: 'Lorem ipsum'
        },
        {
            _id: 2,
            name: 'Task two',
            description: 'Lorem ipsum'
        },
        {
            _id: 3,
            name: 'Task three',
            description: 'Lorem ipsum'
        }
    ]}))
})
router.get('/private-tasks', checkToken, (req, res, next) => {
    res.json(new JSONResponse({
        data: [
            {
                _id: 1,
                name: 'Task one',
                description: 'Lorem ipsum'
            },
            {
                _id: 2,
                name: 'Task two',
                description: 'Lorem ipsum'
            },
            {
                _id: 3,
                name: 'Task three',
                description: 'Lorem ipsum'
            }
        ]
    }))
})
// #endregion

// #region POST paths
//register
router.post('/signup', credentialValidation, signUpVerifyUserExistence, async (req, res, next) => {
    try {
        let { email, password } = req.body

        password = bcrypt.hashSync(password, parseInt(process.env.SALT_ROUNDS))
        let newUser = new User({ email, password })
        await newUser.save()

        let token = jwt.sign({ _id: newUser._id }, process.env.JWT_SECRET_KEY, { expiresIn: '1h' })

        res.json(new JSONResponse({ data: { token } }))
    } catch (err) {
        req.message = err
        next()
    }
}, responseError)

//login
router.post('/signin', credentialValidation, signInVerifyUserExistence, checkPassword, async (req, res, next) => {
    try {
        let _id = req._id
        let result = req.result
        let token = jwt.sign({ _id }, process.env.JWT_SECRET_KEY, { expiresIn: '1h' })
        res.json(new JSONResponse({ data: { token }, message: result }))
    } catch (err) {
        req.message = err
        next()
    }
}, responseError)
// #endregion

// #region PUT paths
// #endregion

// #region DELETE paths
// #endregion

module.exports = router