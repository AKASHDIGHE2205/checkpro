import express from "express";
import db from '../db.js'
const router = express.Router();

//API TO GET ALL Locations
router.get('/locations', async (req, res) => {
  const sql = `SELECT * FROM location WHERE status='A'`;
  db.query(sql, (err, results) => {
    if (err) {
      console.log(err);
      res.status(500).json({ message: "Error fetching locations" });
    }
    res.json(results);
  })
});

//API TO GET ALL USERS
router.get('/get-users', async (req, res) => {
  const sql = `SELECT a.id,a.fname,a.lname,a.email,a.mobile,a.role,a.status,b.name AS loc_name,a.loc_id
               FROM sgm_users AS a 
               LEFT JOIN location AS b ON a.loc_id = b.id
               WHERE a.status='A'`;
  db.query(sql, (err, results) => {
    if (err) {
      console.log(err);
      res.status(500).json({ message: "Error fetching users" });
    }
    res.json(results);
  })
});

export default router;