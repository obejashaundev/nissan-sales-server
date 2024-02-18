// #region Importing libraries installed
const { Router } = require('express')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const fs = require('fs')
const multer = require('multer');
// #endregion

// #region Initialize router and data models
const router = Router()
const User = require('../models/User')
const enumRoles = require('../enums/Roles')
const Rol = require('../models/Rol')
const Customer = require('../models/Customer')
const Location = require('../models/Location')
const JSONResponse = require('../models/JSONResponse');
const SalesAdvisor = require('../models/SalesAdvisor');
const CarModel = require('../models/CarModel');
const AdvertisingMedium = require('../models/AdvertisingMedium');
// #endregion

// #region Multer configuration
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
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
let checkToken = async (req, res, next) => {
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

let validateActiveUser = async (req, res, next) => {
    try {
        let userId = req.userId
        let user = await User.findById(userId).populate('rol')
        if (!user) {
            throw 'El usuario activo no pudo ser encontrado'
        }
        req.rolName = user.rol.name;
        next()
    } catch (err) {
        req.statusCode = 401
        req.message = err
        responseError(req, res)
    }
}

let permissionForMaster = (req, res, next) => {
    try {
        let rolName = req.rolName;
        if (enumRoles.MASTER.includes(rolName)) {
            throw 'Solicitud no autorizada'
        }
        next()
    } catch (err) {
        req.statusCode = 401
        req.message = err
        responseError(req, res)
    }
}

let permissionForAdmin = (req, res, next) => {
    try {
        let rolName = req.rolName;
        let lsRoles = [enumRoles.MASTER, enumRoles.ADMINISTRADOR]
        if (!lsRoles.includes(rolName)) {
            throw 'Solicitud no autorizada'
        }
        next()
    } catch (err) {
        req.statusCode = 401
        req.message = err
        responseError(req, res)
    }
}
// #endregion

// #region GET paths
router.get('/', (req, res, next) => {
    res.send('¡Bienvenido, esta es la NISSAN SALES API!')
})

router.get('/roles', checkToken, validateActiveUser, permissionForAdmin, async (req, res, next) => {
    try {
        let data = await Rol.find({ isActive: true, isRemoved: false })
        let message = 'Lista de roles disponibles'
        let response = new JSONResponse({ data, message })
        res.json(response)
    } catch (err) {
        req.message = err
        next()
    }
}, responseError)

router.get('/users', checkToken, validateActiveUser, permissionForAdmin, async (req, res, next) => {
    try {
        let data = await User.find({ isActive: true, isRemoved: false }).populate('rol')
        if (!req.rolName.includes(enumRoles.MASTER)) {
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

router.get('/salesAdvisor', checkToken, validateActiveUser, permissionForAdmin, async (req, res, next) => {
    try {
        let data = await SalesAdvisor.find({ isActive: true, isRemoved: false })
        let message = 'List of sales advisors'
        let response = new JSONResponse({ data, message })
        res.json(response)
    } catch (err) {
        req.message = err
        next()
    }
}, responseError)

router.get('/locations', checkToken, validateActiveUser, async (req, res, next) => {
    try {
        let data = await Location.find({ isActive: true, isRemoved: false })
        let message = 'List of locations'
        let response = new JSONResponse({ data, message })
        res.json(response)
    } catch (err) {
        req.message = err
        next()
    }
}, responseError)

router.get('/carModels', checkToken, validateActiveUser, async (req, res, next) => {
    try {
        let data = await CarModel.find({ isActive: true, isRemoved: false })
        let message = 'List of car models'
        let response = new JSONResponse({ data, message })
        res.json(response)
    } catch (err) {
        req.message = err
        next()
    }
}, responseError)

router.get('/customers', checkToken, validateActiveUser, async (req, res, next) => {
    try {
        let data = await Customer.find({ isActive: true, isRemoved: false })
        let message = 'List of customers'
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
        // Send the image binary to the ImgHippo API
        let imgHippoResponse = await axios.post('https://www.imghippo.com/api/v1/upload', {
            key: process.env.IMGHIPPO_API_KEY, // Replace with your actual API key
            file: photoBase64,
            name: email, // Optional: Use the original filename
        });

        photoPath = imgHippoResponse.data.url; // Get the uploaded image URL

        password = bcrypt.hashSync(password, parseInt(process.env.SALT_ROUNDS))
        let newUser = new User({ rol: rolDb._id, names, firstLastname, secondLastname, phone, photoPath, email, password })
        await newUser.save()
        res.json(new JSONResponse({ status: JSONResponse.success }))
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

router.post('/roles', checkToken, validateActiveUser, permissionForMaster, async (req, res, next) => {
    try {
        let { name } = req.body
        if (!name) {
            throw 'El campo <<name>> no ha sido definido'
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

router.post('/salesAdvisor', checkToken, validateActiveUser, permissionForAdmin, upload.single('image'), async (req, res, next) => {
    try {
        let { name, email } = req.body;
        let imageBinary = req.file.buffer; // Get the image binary data

        if (!(name && email && imageBinary)) {
            throw 'Faltaron algunos campos obligatorios';
        }

        // Send the image binary to the ImgHippo API
        let imgHippoResponse = await axios.post('https://www.imghippo.com/api/v1/upload', {
            key: process.env.IMGHIPPO_API_KEY, // Replace with your actual API key
            file: imageBinary,
            name: req.file.originalname, // Optional: Use the original filename
        });

        let imageUrl = imgHippoResponse.data.url; // Get the uploaded image URL

        // Create a new SalesAdvisor record with the image URL
        let newSalesAdvisor = new SalesAdvisor({ name, email, imageUrl });
        await newSalesAdvisor.save();

        let response = new JSONResponse({ message: 'Asesor de ventas registrado exitosamente.' })
        res.json(response);
    } catch (err) {
        req.message = err;
        next();
    }
}, responseError);

router.post('/locations', checkToken, validateActiveUser, permissionForMaster, async (req, res, next) => {
    try {
        let { locations } = req.body.locations
        if (locations) {
            if(Array.isArray(locations)){
                for(let location of locations){
                    if (location.name) {
                        let newLocation = new Location({ name: location.name })
                        await newLocation.save()
                    }
                }
            }else if(typeof locations === 'object'){
                if (locations.name) {
                    let newLocation = new Location({ name: locations.name })
                    await newLocation.save()
                }
            }else{
                throw "Introduce un objeto o una lista de objetos de tipo { name: String }"
            }
            let response = new JSONResponse({ message: 'Localidades almacenadas correctamente.' })
            res.json(response)
        }
    } catch (err) {
        req.message = err
        next()
    }
}, responseError)

router.post('/carModels', checkToken, validateActiveUser, permissionForAdmin, async (req, res, next) => {
    try {
        let { carModels } = req.body.carModels
        if (carModels) {
            if (Array.isArray(carModels)) {
                for (let carModel of carModels) {
                    if (carModel.name) {
                        let _carModel = new CarModel({ name: carModel.name })
                        await _carModel.save()
                    }
                }
            } else if (typeof carModels === 'object') {
                if (carModels.name) {
                    let _carModel = new CarModel({ name: carModels.name })
                    await _carModel.save()
                }
            } else {
                throw "Introduce un objeto o una lista de objetos de tipo { name: String }"
            }
            let response = new JSONResponse({ message: 'Modelos de carros almacenados correctamente.' })
            res.json(response)
        }
    } catch (err) {
        req.message = err
        next()
    }
}, responseError)

router.post('/customers', checkToken, validateActiveUser, async (req, res, next) => {
    try {
        let { customer } = req.body.customer
        if (customer) {
            let _customer = new Customer({ 
                name: customer.name,
                location: customer.location,
                carModel: customer.carModel,
                advertisingMedium: customer.advertisingMedium
            })
            await _customer.save()
            let response = new JSONResponse({ message: 'El cliente se guardó satisfactoriamente.' })
            res.json(response)
        } else {
            throw "Los datos enviados son inválidos."
        }
    } catch (err) {
        req.message = err
        next()
    }
}, responseError)

router.post('/advertisingMediums', checkToken, validateActiveUser, permissionForAdmin, async (req, res, next) => {
    try {
        let { customer } = req.body.customer
        if (customer) {
            let _customer = new Customer({
                name: customer.name,
                location: customer.location,
                carModel: customer.carModel,
                advertisingMedium: customer.advertisingMedium
            })
            await _customer.save()
            let response = new JSONResponse({ message: 'El cliente se guardó satisfactoriamente.' })
            res.json(response)
        } else {
            throw "Los datos enviados son inválidos."
        }
    } catch (err) {
        req.message = err
        next()
    }
}, responseError)

// #endregion

// #region PUT paths
// #endregion

// #region DELETE paths
router.delete('/users/:id/:isForced', checkToken, validateActiveUser, permissionForAdmin, async (req, res, next) => {
    try {
        let userId = req.params.id
        let isForced = req.params.isForced
        let entity = await User.findById(userId).populate('rol')
        if (!entity) {
            throw 'El usuario seleccionado no pudo ser encontrado'
        }
        if (entity.rol.name.includes(enumRoles.MASTER)) {
            throw 'El usuario seleccionado no puede ser eliminado debido a que la aplicación necesita de él'
        }
        entity.isActive = false
        entity.isRemoved = true
        await User.updateOne(entity)
        if (isForced) {
            await User.deleteOne(entity)
        }
        let response = new JSONResponse({ message: 'El usuario se eliminó correctamente.' });
        res.json(response)
    } catch (err) {
        req.message = err
        next()
    }
}, responseError)

router.delete('/salesAdvisor/:id/:isForced', checkToken, validateActiveUser, permissionForAdmin, async (req, res, next) => {
    try {
        let userId = req.params.id
        let isForced = req.params.isForced

        let entity = await SalesAdvisor.findById(userId)
        entity.isActive = false
        entity.isRemoved = true

        await SalesAdvisor.updateOne(entity)
        if (isForced) {
            await SalesAdvisor.deleteOne(entity)
        }
        let response = new JSONResponse({ message: 'Asesor de ventas registrado exitosamente.' })
        res.json(response)
    } catch (err) {
        req.message = err
        next()
    }
}, responseError)

router.delete('/customers/:id/:isForced', checkToken, validateActiveUser, permissionForAdmin, async (req, res, next) => {
    try {
        let customerId = req.params.id
        let isForced = req.params.isForced

        let entity = await Customer.findById(customerId)
        entity.isActive = false
        entity.isRemoved = true

        await Customer.updateOne(entity)
        if (isForced) {
            await Customer.deleteOne(entity)
        }
        let response = new JSONResponse({ message: 'Eliminado exitosamente.' })
        res.json(response)
    } catch (err) {
        req.message = err
        next()
    }
}, responseError)

router.delete('/locations/:id/:isForced', checkToken, validateActiveUser, permissionForAdmin, async (req, res, next) => {
    try {
        let locationId = req.params.id
        let isForced = req.params.isForced

        let entity = await Location.findById(locationId)
        entity.isActive = false
        entity.isRemoved = true

        await Location.updateOne(entity)
        if (isForced) {
            await Location.deleteOne(entity)
        }
        let response = new JSONResponse({ message: 'Eliminado exitosamente.' })
        res.json(response)
    } catch (err) {
        req.message = err
        next()
    }
}, responseError)

router.delete('/carModels/:id/:isForced', checkToken, validateActiveUser, permissionForAdmin, async (req, res, next) => {
    try {
        let carModelId = req.params.id
        let isForced = req.params.isForced

        let entity = await CarModel.findById(carModelId)
        entity.isActive = false
        entity.isRemoved = true

        await CarModel.updateOne(entity)
        if (isForced) {
            await CarModel.deleteOne(entity)
        }
        let response = new JSONResponse({ message: 'Eliminado exitosamente.' })
        res.json(response)
    } catch (err) {
        req.message = err
        next()
    }
}, responseError)

router.delete('/advertisingMediums/:id/:isForced', checkToken, validateActiveUser, permissionForAdmin, async (req, res, next) => {
    try {
        let advertisingMediumId = req.params.id
        let isForced = req.params.isForced

        let entity = await AdvertisingMedium.findById(advertisingMediumId)
        entity.isActive = false
        entity.isRemoved = true

        await AdvertisingMedium.updateOne(entity)
        if (isForced) {
            await AdvertisingMedium.deleteOne(entity)
        }
        let response = new JSONResponse({ message: 'Eliminado exitosamente.' })
        res.json(response)
    } catch (err) {
        req.message = err
        next()
    }
}, responseError)
// #endregion

module.exports = router