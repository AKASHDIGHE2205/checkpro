import mysql from 'mysql';

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'saragam',
})
db.connect((err) => {
  if (err) {
    console.log("Error to connecting to the db", err);
    return;
  }
  console.log('Connected to database');
});
export default db;