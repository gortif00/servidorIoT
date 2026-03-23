const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const moment = require("moment");
const User = require("../models/user");
require('dotenv').config();
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !password) {
      return res
        .status(400)
        .json({ message: " email y contraseña obligatorios" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: "Usuario registrado " });
  } catch (error) {
    res.status(500).json({ message: "Error al registrar usuario", error });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Credenciales inválidas" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Credenciales inválidas" });
    }

    const expiration = moment().add(30, "days").unix();
    
    const token = jwt.sign({ id: user._id, exp: expiration }, process.env.JWT_SECRET);

    res.json({ message: "Login exitoso", token, expiresIn: "30 días" });
  } catch (error) {
    res.status(500).json({ message: "Error al iniciar sesión", error });
  }
};

module.exports = { register, login };
