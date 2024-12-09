import express from "express";
import db from "../db.js";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const router = express.Router();
const SECRETE_KEY = "MY_SECRETE_KEY";
const SALT_ROUNDS = 10;

//function to generate token
function generateToken(userData) {
  return jwt.sign(userData, SECRETE_KEY, { expiresIn: '1h' })
}

//API FOR USER LOG-IN
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const date = new Date();
  let year = date.getFullYear();
  let month = String(date.getMonth() + 1).padStart(2, '0');
  let day = String(date.getDate()).padStart(2, '0');
  let hours = String(date.getHours()).padStart(2, '0');
  let minutes = String(date.getMinutes()).padStart(2, '0');
  let seconds = String(date.getSeconds()).padStart(2, '0');
  let formattedDateTime = `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and Password are required.!" });
  }

  const sql = `SELECT * FROM sgm_users WHERE email = ? AND status = 'A'`;

  db.query(sql, [email], async (err, results) => {
    if (err) {
      console.error("Error querying the database:", err);
      return res.status(500).json({ message: "Error querying the database.", error: err });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "User no found." });
    }
    const user = results[0];

    try {
      const passMatched = await bcrypt.compare(password, user.password);

      if (!passMatched) {
        return res.status(401).json({ message: "Incorrect email or password." });
      }

      const userData = {
        id: user.id,
        email: user.email,
        fname: user.fname,
        lname: user.lname,
        role: user.role,
        mobile: user.mobile,
        locId: user.loc_id,
      };

      const token = generateToken(userData);

      console.log(`Login successfull By ${user.fname} ${user.lname} As ${user.role} On ${formattedDateTime}`);

      return res.status(200).json({
        message: `Welcome back, ${user.fname.toUpperCase()} ${user.lname.toUpperCase()}.!`,
        token,
        userId: userData.id,
        userRole: userData.role,
        userFName: userData.fname,
        userLName: userData.lname,
        userMobile: userData.mobile,
        userEmail: userData.email,
      });

    } catch (error) {
      console.error("Error during login process:", error);
      return res.status(500).json({ message: "An unexpected error occurred during login.", error });
    }
  });
});

//API TO USER REGISTRATION
router.post('/registration', async (req, res) => {
  const { password, fname, lname, email, mobile, loc_id } = req.body;

  if (!password || !email || !mobile || !fname || !lname || !loc_id) {
    return res.status(400).json({ message: "Bad Request: Missing required fields." });
  }

  try {
    const checkUserSql = `SELECT * FROM sgm_users WHERE email = ? AND status = 'A'`;
    db.query(checkUserSql, [email], async (err, results) => {
      if (err) {
        console.error("Error querying for existing user:", err);
        return res.status(500).json({ message: "Internal Server Error: Unable to check user existence." });
      }

      if (results.length > 0) {
        return res.status(409).json({ message: "User already exists." });
      }
      try {
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        const insertUserSql = `
          INSERT INTO sgm_users (password, status, role, fname, lname, email, mobile, loc_id) 
          VALUES (?, 'A', 'User', ?, ?, ?, ?, ?)`;

        db.query(insertUserSql, [hashedPassword, fname, lname, email, mobile, loc_id], (err, results) => {
          if (err) {
            console.error("Error inserting user into database:", err);
            return res.status(500).json({ message: "Internal Server Error: Unable to register user." });
          }
          return res.status(201).json({ message: "User registered successfully.", userId: results.insertId, });
        });
      } catch (hashError) {
        console.error("Error hashing password:", hashError);
        return res.status(500).json({ message: "Internal Server Error: Unable to hash password." });
      }
    });
  } catch (error) {
    console.error("Unexpected error during registration:", error);
    return res.status(500).json({ message: "Internal Server Error: Unexpected error during registration." });
  }
});

export default router;