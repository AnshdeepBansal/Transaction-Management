const express = require("express");
const app = express();
const mysql = require("mysql2/promise"); // Use promise-based API
const bcrypt = require("bcrypt");
const cors = require("cors");

app.use(cors({
  origin: "http://localhost:5173", // Change this if your frontend is on a different port
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type"],
}));

const db = mysql.createPool({
  connectionLimit: 100,
  host: "127.0.0.1", // This is your localhost IP
  user: "root", // MySQL user
  password: "7525", // Password for the user
  database: "testdb", // Database name
  port: "3306", // MySQL port
  insecureAuth: true,
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server started on port ${port}...`));

app.use(express.json());

// Initialize tables if they don't exist
const initializeDatabase = async () => {
  try {
    const connection = await db.getConnection();
    try {
      // Create people table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS people (
          person_id INT PRIMARY KEY AUTO_INCREMENT,
          name VARCHAR(100) NOT NULL,
          contact VARCHAR(100),
          UNIQUE(name)
        )
      `);
      
      // Create financial_transactions table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS financial_transactions (
          transaction_id INT PRIMARY KEY AUTO_INCREMENT,
          person_id INT NOT NULL,
          amount DECIMAL(10, 2) NOT NULL,
          is_give BOOLEAN NOT NULL,
          payment_mode VARCHAR(50) NOT NULL,
          reason TEXT,
          transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (person_id) REFERENCES people(person_id) ON DELETE CASCADE
        )
      `);
      
      console.log("Database tables initialized successfully");
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error("Error initializing database:", err);
  }
};

// Call the initialization function
initializeDatabase();

// PEOPLE ENDPOINTS

// Get all people
app.get("/people", async (req, res) => {
  try {
    const connection = await db.getConnection();
    try {
      const sql = "SELECT * FROM people";
      const [rows] = await connection.query(sql);
      res.json(rows);
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error("Database Error:", err);
    res.status(500).json({ error: "Failed to fetch people" });
  }
});

// Create a new person
app.post("/createPerson", async (req, res) => {
  try {
    const { name, contact } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }
    
    const connection = await db.getConnection();
    try {
      // Check if person already exists
      const sqlSearch = "SELECT * FROM people WHERE name = ?";
      const [searchResult] = await connection.query(sqlSearch, [name]);
      
      if (searchResult.length !== 0) {
        return res.status(409).json({ message: "Person already exists" });
      }
      
      // Insert new person
      const sqlInsert = "INSERT INTO people (name, contact) VALUES (?, ?)";
      const [result] = await connection.query(sqlInsert, [name, contact || null]);
      
      res.status(201).json({ 
        message: "Person created successfully!",
        person_id: result.insertId
      });
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error("Database Error:", err);
    res.status(500).json({ error: "Failed to create person" });
  }
});

// Delete a person
app.delete("/deletePerson/:id", async (req, res) => {
  try {
    const personId = req.params.id;
    const connection = await db.getConnection();
    
    try {
      // Delete the person (transactions will cascade delete due to foreign key)
      const sql = "DELETE FROM people WHERE person_id = ?";
      const [result] = await connection.query(sql, [personId]);
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Person not found" });
      }
      
      res.json({ message: "Person deleted successfully" });
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error("Database Error:", err);
    res.status(500).json({ error: "Failed to delete person" });
  }
});

// TRANSACTION ENDPOINTS

// Get all transactions with person names
app.get("/transactions", async (req, res) => {
  try {
    const connection = await db.getConnection();
    try {
      const sql = `
        SELECT t.*, p.name as person_name 
        FROM financial_transactions t
        JOIN people p ON t.person_id = p.person_id
        ORDER BY t.transaction_date DESC
      `;
      const [rows] = await connection.query(sql);
      res.json(rows);
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error("Database Error:", err);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

// Create a new transaction
app.post("/createTransaction", async (req, res) => {
  try {
    const { person_id, amount, is_give, payment_mode, reason } = req.body;
    
    if (!person_id || amount === undefined || is_give === undefined || !payment_mode) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    
    const connection = await db.getConnection();
    try {
      // Verify person exists
      const [person] = await connection.query(
        "SELECT * FROM people WHERE person_id = ?", 
        [person_id]
      );
      
      if (person.length === 0) {
        return res.status(404).json({ message: "Person not found" });
      }
      
      // Insert transaction
      const sql = `
        INSERT INTO financial_transactions 
        (person_id, amount, is_give, payment_mode, reason) 
        VALUES (?, ?, ?, ?, ?)
      `;
      
      const [result] = await connection.query(
        sql, 
        [person_id, amount, is_give ? 1 : 0, payment_mode, reason || null]
      );
      
      res.status(201).json({ 
        message: "Transaction created successfully!",
        transaction_id: result.insertId
      });
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error("Database Error:", err);
    res.status(500).json({ error: "Failed to create transaction" });
  }
});

// Delete a transaction
app.delete("/deleteTransaction/:id", async (req, res) => {
  try {
    const transactionId = req.params.id;
    const connection = await db.getConnection();
    
    try {
      const sql = "DELETE FROM financial_transactions WHERE transaction_id = ?";
      const [result] = await connection.query(sql, [transactionId]);
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      res.json({ message: "Transaction deleted successfully" });
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error("Database Error:", err);
    res.status(500).json({ error: "Failed to delete transaction" });
  }
});

// Keep the original user endpoints for backward compatibility
app.post("/createUser", async (req, res) => {
  try {
    const user = req.body.name;
    const hashedPassword = await bcrypt.hash(req.body.pass, 2);
    
    const connection = await db.getConnection();
    try {
      const sqlSearch = "SELECT * FROM new_table WHERE user = ?";
      const [searchResult] = await connection.query(sqlSearch, [user]);
      
      if (searchResult.length !== 0) {
        console.log("------> User already exists");
        res.sendStatus(409);
      } else {
        const sqlInsert = "INSERT INTO new_table VALUES (0,?,?)";
        const [insertResult] = await connection.query(sqlInsert, [user, hashedPassword]);
        
        console.log("--------> Created new User");
        console.log(insertResult.insertId);
        res.status(201).json({ message: "User created successfully!" });
      }
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error("Database Error:", err);
    res.sendStatus(500);
  }
});

app.get("/user", async (req, res) => {
  try {
    const connection = await db.getConnection();
    try {
      const sql = "SELECT * FROM new_table";
      const [rows] = await connection.query(sql);
      res.json(rows);
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error("Database Error:", err);
    res.sendStatus(500);
  }
});

app.delete("/deleteUser/:id", async (req, res) => {
  try {
    const connection = await db.getConnection();
    try {
      const sql = "DELETE FROM new_table WHERE userid = ?";
      const [rows] = await connection.query(sql, [req.params.id]);
      res.json(rows);
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error("Database Error:", err);
    res.sendStatus(500);
  }
});