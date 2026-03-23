require('dotenv').config();
const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    let token = req.header('Authorization');

    if (!token) {
        return res.status(401).json({ message: 'Acceso denegado. No hay token.' });
    }

    // Extraer solo el token sin la palabra "Bearer "
    token = token.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        console.error("Error al verificar el token:", error.message);
        res.status(401).json({ message: 'Token inválido' });
    }
};

module.exports = authMiddleware;
