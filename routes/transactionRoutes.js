import express from "express";
import db from '../db.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from "url";
import fs from 'fs';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Correct the destination path by using absolute path
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname}`);
  },
});
const upload = multer({ storage });

// API TO STORE TRANSACTIONS
router.post('/transactions', upload.array('images'), (req, res) => {
  const { status = [], description = [], u_id = [], q_id = [] } = req.body;

  // Ensure all fields are arrays
  const statuses = Array.isArray(status) ? status : [status];
  const descriptions = Array.isArray(description) ? description : [description];
  const u_ids = Array.isArray(u_id) ? u_id : [u_id];
  const q_ids = Array.isArray(q_id) ? q_id : [q_id];

  if (statuses.length === 0 || descriptions.length === 0 || u_ids.length === 0 || q_ids.length === 0) {
    return res.status(400).json({ message: "Please fill all required fields." });
  }

  const files = req.files;
  let currentDate = new Date();
  let year = currentDate.getFullYear();
  let month = String(currentDate.getMonth() + 1).padStart(2, '0');
  let day = String(currentDate.getDate()).padStart(2, '0');
  let hours = String(currentDate.getHours()).padStart(2, '0');
  let minutes = String(currentDate.getMinutes()).padStart(2, '0');
  let seconds = String(currentDate.getSeconds()).padStart(2, '0');
  let formattedDateTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  let formattedDate = `${year}-${month}-${day}`;

  // Prepare records for insertion
  const maxLength = Math.max(u_ids.length, q_ids.length, descriptions.length, statuses.length || 0);
  const records = [];
  let fileIndex = 0;

  for (let i = 0; i < maxLength; i++) {
    const currentFlag = statuses[i] || null;
    const currentImage = currentFlag === "Completed" && fileIndex < files.length ? files[fileIndex++].path.replace(/\\/g, '/') : null;

    records.push([
      formattedDateTime,
      u_ids[i] || null,
      q_ids[i] || null,
      currentFlag,
      descriptions[i] || null,
      currentImage
    ]);
  }

  let index = 0;

  // Delete checklist function
  function deleteNext() {
    if (index < records.length) {
      const record = records[index];
      const u_idToCheck = record[1];
      const q_idToCheck = record[2];

      if (q_idToCheck) {
        const delSql = `DELETE FROM ch_tran WHERE DATE(date) = ? AND u_id = ? AND q_id = ?`;
        db.query(delSql, [formattedDate, u_idToCheck, q_idToCheck], (err) => {
          if (err) {
            console.error("Error during delete:", err);
            return res.status(500).json({ message: "Error during delete operation" });
          }
          index++;
          deleteNext();
        });
      } else {
        index++;
        deleteNext();
      }
    } else {
      // After all deletions, proceed with insertion
      insertRecords();
    }
  }

  //Insert checklist function
  function insertRecords() {
    const insertSql = `INSERT INTO ch_tran (date, u_id, q_id, q_flag, description, image) VALUES ?`;
    db.query(insertSql, [records], (err, results) => {
      if (err) {
        console.error('Error while inserting new data:', err);
        return res.status(500).json({ message: "Error while processing transaction" });
      }
      res.status(200).json({ message: "Your checklist has been added successfully.!" });
    });
  }
  deleteNext();
});

//API TO GET TRANSACTIONS
router.post('/get-transactions', (req, res) => {
  const { loc_id, date } = req.body;

  if (!loc_id || !date) {
    return res.status(400).json({ message: "Location ID and date are required." });
  }

  const sql1 = `SELECT id FROM sgm_users WHERE loc_id = ?`;
  db.query(sql1, [loc_id], (err, userResults) => {
    if (err) {
      console.error("Error fetching user ID:", err);
      return res.status(500).json({ message: "Error while fetching user ID." });
    }

    if (userResults.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    const userID = userResults[0].id;

    const sql2 = `SELECT CONCAT(b.fname, " ", b.lname) AS user_name,a.date,a.u_id,a.q_id,a.q_flag,a.description,c.question,
                         d.name AS location_name,a.image
                  FROM ch_tran AS a
                  LEFT JOIN sgm_users AS b ON a.u_id = b.id
                  LEFT JOIN questions AS c ON a.q_id = c.id
                  LEFT JOIN location AS d ON b.loc_id = d.id
                  WHERE DATE(a.date) = ?
                        AND a.u_id = ?`;

    db.query(sql2, [date, userID], (err, transactionResults) => {
      if (err) {
        console.error("Error fetching Checklist:", err);
        return res.status(500).json({ message: "Error while fetching Checklist." });
      }

      if (transactionResults.length === 0) {
        return res.status(404).json({ message: `There is no checklist available for this date: ${date}.` });
      }

      const baseUrl = `${req.protocol}://${req.get('host')}`;//http://192.168.179.23:3001
      const transactions = transactionResults.map((transaction) => ({
        ...transaction,
        image: transaction.image ? `${baseUrl}/${transaction.image}` : null,
      }));
      res.status(200).json(transactions);
    });
  });
});

//API TO GET YET COMPLETED QUESTIONS
router.get("/get-qcompleted/:u_id", (req, res) => {
  const { u_id } = req.params;
  let currentDate = new Date();
  let date = currentDate.toISOString().slice(0, 10);

  const sql = `SELECT q_id, q_flag FROM ch_tran WHERE DATE(date) = ? AND u_id = ?`;
  db.query(sql, [date, u_id], (err, results) => {
    if (err) {
      console.error("Error fetching completed questions:", err);
      return res.status(500).json({ message: "Error while fetching completed questions." });
    }
    return res.status(200).json(results);
  });
});

//API TO GET THE ACTIVE QUESTIONS
router.post('/get-questions', (req, res) => {
  const { week, u_role } = req.body;
  const role = `%${u_role}%`;

  if (!week || !role) {
    return res.status(400).json({ message: "Week and role are required." });
  }
  const sql = `SELECT *
               FROM questions
               WHERE status='A'
                     AND week=?
                     AND u_role LIKE ?
               ORDER BY seq_id ASC`;

  db.query(sql, [week, role], (err, results) => {
    if (err) {
      console.log(err);
      res.status(500).json({ message: "Error fetching questions" });
    }
    res.status(200).json(results);
  });
});

export default router;