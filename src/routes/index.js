// #region Importing libraries installed
const { Router } = require('express')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
// #endregion

// #region Initialize router and data models
const router = Router()
const User = require('../models/User')
const enumRoles = require('../enums/Roles')
const Rol = require('../models/Rol')
const Customer = require('../models/Customer')
const JSONResponse = require('../models/JSONResponse')
// #endregion

// #region Handling functions for middleware of service
let responseError = (req, res) => {
    let statusCode = req.statusCode || 400
    res.status(statusCode).json(new JSONResponse({ status: JSONResponse.error, message: req.message }))
}
let credentialValidation = (req, res, next) => {
    let { email, password } = req.body
    try {
        if (!email) {
            throw 'The email property is not defined'
        }
        if (!password) {
            throw 'The password property is not defined'
        }
        next()
    } catch (err) {
        req.message = err
        responseError(req, res)
    }
}
let signUpVerifyUserExistence = async (req, res, next) => {
    let { email } = req.body
    try {
        let user = await User.findOne({ email })
        if (user) {
            throw "The user it's already exists"
        }
        next()
    } catch (err) {
        req.message = err
        responseError(req, res)
    }
}
let signInVerifyUserExistence = async (req, res, next) => {
    let { email } = req.body
    try {
        let user = await User.findOne({ email })
        if (!user) {
            throw "The entered credentials are invalid"
        }
        req.passwordHash = user.password
        req._id = user._id
        next()
    } catch (err) {
        req.message = err
        responseError(req, res)
    }
}
let checkPassword = (req, res, next) => {
    try {
        let { password } = req.body
        let passwordHash = req.passwordHash
        let isValid = bcrypt.compareSync(password, passwordHash)
        let result = '¡Welcome!'
        if (!isValid) {
            result = 'The entered credentials are invalid'
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
        }
        
        let token = req.headers.authorization.split(' ')[1]
        if (!token) {
            throw 'Unauthorize request'
        }

        try {
            let payload = jwt.verify(token, process.env.JWT_SECRET_KEY)
            req.userId = payload._id
            next()
        } catch (err) {
            throw err.message
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
router.get('/private-tasks', checkToken, async (req, res, next) => {
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
}, responseError)

router.get('/roles', checkToken, async (req, res, next) => {
    try {
        let userId = req.userId
        let user = await User.findById(userId)
        if (!user) {
            throw 'The requesting user could not be found'
        }
        let rol = await Rol.findById(user.rol)
        if (rol.name != "MASTER") {
            throw 'Unauthorize request'
        }
        let data = Rol.find({ isActive: true, isRemoved: false })
        let message = 'List of available roles'
        let response = new JSONResponse({ data, message })
        res.json(response)
    } catch (err) {
        req.message = err
        next()
    }
}, responseError)
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

router.post('/roles', checkToken, async (req, res, next) => {
    try {
        let userId = req.userId
        let user = await User.findById(userId)
        if(!user){
            throw 'The requesting user could not be found'
        }
        if (!user.rol.name == "MASTER"){
            throw 'Unauthorize request'
        }
        let { name } = req.body
        let newRol = new Rol({ name })
        await newRol.save()
        let message = 'The new role was created successfully'
        res.json(new JSONResponse({ message }))
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