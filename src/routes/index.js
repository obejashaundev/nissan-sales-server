// #region Importing libraries installed
const { Router } = require('express')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const fs = require('fs')
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
        if (!(email && password)) {
            throw 'Todos los campos deben estar completos'
        }
        next()
    } catch (err) {
        req.message = err
        responseError(req, res)
    }
}
let dataValidation = (req, res, next) => {
    let { names, firstLastname, secondLastname, phone, email, password, rol } = req.body
    try {
        if (!(names && firstLastname && secondLastname && phone && email && password && rol)) {
            throw 'Todos los campos deben estar completos'
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
            throw "Ya hay un usuario con esta dirección de correo"
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
            throw "Las credenciales introducidas, no son válidas, inténtelo de nuevo"
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
        let result = '¡Bienvenido!'
        if (!isValid) {
            result = 'Las credenciales introducidas, no son válidas, inténtelo de nuevo'
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
            throw 'Solicitud no autorizada'
        }
        
        let token = req.headers.authorization.split(' ')[1]
        if (!token) {
            throw 'Solicitud no autorizada'
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
    res.send('¡Bienvenido, esta es la API de NISSAN SALES APP!')
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
        let user = await User.findById(userId).populate('rol')
        if (!user) {
            throw 'El usuario activo no pudo ser encontrado'
        }
        let rolName = user.rol.name
        if (!(rolName.includes(enumRoles.MASTER) || rolName.includes(enumRoles.ADMINISTRADOR))) {
            throw 'Solicitud no autorizada'
        }
        let data = await Rol.find({ isActive: true, isRemoved: false })
        let message = 'Lista de roles disponibles'
        let response = new JSONResponse({ data, message })
        res.json(response)
    } catch (err) {
        req.message = err
        next()
    }
}, responseError)

router.get('/users', checkToken, async (req, res, next) => {
    try {
        let userId = req.userId
        let user = await User.findById(userId).populate('rol')
        if (!user) {
            throw 'El usuario activo no pudo ser encontrado'
        }
        let rolName = user.rol.name
        if (!(rolName.includes(enumRoles.MASTER) || rolName.includes(enumRoles.ADMINISTRADOR))) {
            throw 'Solicitud no autorizada'
        }
        let data = await User.find({ isActive: true, isRemoved: false }).populate('rol')
        if (!rolName.includes(enumRoles.MASTER)) {
            data = await User.find({ isActive: true, isRemoved: false }).populate({
                path: 'rol',
                match: {
                    name: { $ne: enumRoles.MASTER }
                }
            })
        }
        let message = 'List of users'
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
router.post('/users', dataValidation, signUpVerifyUserExistence, async (req, res, next) => {
    try {
        let { names, firstLastname, secondLastname, phone, photoBase64, email, password, rol } = req.body
        
        let rolDb = await Rol.findOne({ name: rol })
        if (!rolDb) {
            throw 'Es necesario definir un rol para este usuario'
        }
        
        let photoPath = ''
        if (photoBase64) {
            photoBase64 = photoBase64.replace(/^data:image\/png;base64,/, '')
            let imageName = `avatar_${email}.png`
            photoPath = `/avatars/${imageName}`
            fs.writeFileSync(`..${photoPath}`, photoBase64, 'base64')
        }
        
        password = bcrypt.hashSync(password, parseInt(process.env.SALT_ROUNDS))
        let newUser = new User({ rol: rolDb._id, names, firstLastname, secondLastname, phone, photoPath, email, password })
        await newUser.save()
        res.json(new JSONResponse({ status: JSONResponse.success }))
    } catch (err) {
        req.message = err
        next()
    }
}, responseError)

// router.post('/signup', credentialValidation, signUpVerifyUserExistence, async (req, res, next) => {
//     try {
//         let { email, password } = req.body

//         password = bcrypt.hashSync(password, parseInt(process.env.SALT_ROUNDS))
//         let newUser = new User({ email, password })
//         await newUser.save()

//         let token = jwt.sign({ _id: newUser._id }, process.env.JWT_SECRET_KEY, { expiresIn: '1h' })

//         res.json(new JSONResponse({ data: { token } }))
//     } catch (err) {
//         req.message = err
//         next()
//     }
// }, responseError)

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
            throw 'El usuario activo no pudo ser encontrado'
        }
        if (!user.rol.name == "MASTER"){
            throw 'Solicitud no autorizada'
        }
        let { name } = req.body
        if(!name){
            throw 'El campo nombre no ha sido definido'
        }
        let newRol = new Rol({ name })
        await newRol.save()
        let message = 'El nuevo rol se creó satisfactoriamente'
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
router.delete('/users/:id', checkToken, async (req, res, next) => {
    try {
        let userId = req.params.id
        let user = await User.findById(userId).populate('rol')
        if (!user) {
            throw 'El usuario seleccionado no pudo ser encontrado'
        }
        if(user.rol.name.includes(enumRoles.MASTER)){
            throw 'El usuario seleccionado no puede ser eliminado debido a que la aplicación necesita de él'
        }
        let response = new JSONResponse({ data: {}, message: {} });
        await User.deleteOne({ _id: userId })
        res.json(response)
    } catch (err) {
        req.message = err
        next()
    }
}, responseError)
// #endregion

module.exports = router