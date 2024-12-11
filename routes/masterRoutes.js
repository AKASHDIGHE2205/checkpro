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

//GET ALL USERS FOR MASTER
router.get("/get-Users", (req, res) => {

  const sql = `SELECT a.id,CONCAT(a.fname ," ",a.lname) AS name,a.email,a.mobile,a.status,b.name as loc_name
               FROM sgm_users AS a 
               LEFT JOIN location as b ON a.loc_id = b.id`;

  db.query(sql, (err, results) => {
    if (err) {
      console.log(err);
      res.status(500).json({ message: "Error to fetching users" })
    }
    res.status(200).json(results)
  });
});

//API TO UPDATE QUESTIONS
router.put("update-questions", (req, res) => {
  const { question, status, id } = req.body;
  const sql = `UPDATE questions SET question = ?, status = ? WHERE id = ?`;
  db.query(sql, [question, status, id], (err, results) => {
    if (err) {
      console.log(err);
      res.status(500).json({ message: "Error updating questions" });
    }
    res.json({ message: "You Question Updated Successfully.!", results });
  });
});

export default router;