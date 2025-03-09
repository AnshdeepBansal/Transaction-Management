const express = require("express");
const app = express();
const bcrypt = require("bcryptjs");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

require('dotenv').config();

// Supabase Configuration
const supabaseUrl = process.env.SUPABASE_URL ;
const supabaseKey = process.env.SUPABASE_KEY ;
const supabase = createClient(supabaseUrl, supabaseKey);

app.use(cors({
  origin: "https://transaction-management-cyan.vercel.app", // Changed elsewhere
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type"],
}));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server started on port ${port}...`));

app.use(express.json());

// Get all people
app.get("/people", async (req, res) => {
  try {
    const { data, error } = await supabase.from("people").select("*");
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("Supabase Error:", err);
    res.status(500).json({ error: "Failed to fetch people" });
  }
});

// Create a new person
app.post("/createPerson", async (req, res) => {
  try {
    const { name, contact } = req.body;
    if (!name) return res.status(400).json({ message: "Name is required" });

    const { error } = await supabase.from("people").insert([{ name, contact }]);
    if (error) throw error;
    
    res.status(201).json({ message: "Person created successfully!" });
  } catch (err) {
    console.error("Supabase Error:", err);
    res.status(500).json({ error: "Failed to create person" });
  }
});

// Delete a person
app.delete("/deletePerson/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from("people").delete().eq("person_id", id);
    if (error) throw error;

    res.json({ message: "Person deleted successfully" });
  } catch (err) {
    console.error("Supabase Error:", err);
    res.status(500).json({ error: "Failed to delete person" });
  }
});

// Get all transactions
app.get("/transactions", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("financial_transactions")
      .select("*, people(name)")
      .order("transaction_date", { ascending: false });

    if (error) throw error;
    
    // Transform the data to include person_name
    const transformedData = data.map(transaction => ({
      ...transaction,
      person_name: transaction.people ? transaction.people.name : 'Unknown'
    }));
    
    res.json(transformedData);
  } catch (err) {
    console.error("Supabase Error:", err);
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

    const { error } = await supabase.from("financial_transactions").insert([
      { person_id, amount, is_give, payment_mode, reason }
    ]);
    if (error) throw error;

    res.status(201).json({ message: "Transaction created successfully!" });
  } catch (err) {
    console.error("Supabase Error:", err);
    res.status(500).json({ error: "Failed to create transaction" });
  }
});

// Delete a transaction
app.delete("/deleteTransaction/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from("financial_transactions").delete().eq("transaction_id", id);
    if (error) throw error;

    res.json({ message: "Transaction deleted successfully" });
  } catch (err) {
    console.error("Supabase Error:", err);
    res.status(500).json({ error: "Failed to delete transaction" });
  }
});

// Create a user
app.post("/createUser", async (req, res) => {
  try {
    const { name, pass } = req.body;
    const hashedPassword = await bcrypt.hash(pass, 10);

    const { error } = await supabase.from("users").insert([{ username: name, password: hashedPassword }]);
    if (error) throw error;

    res.status(201).json({ message: "User created successfully!" });
  } catch (err) {
    console.error("Supabase Error:", err);
    res.status(500).json({ error: "Failed to create user" });
  }
});

// Get all users
app.get("/user", async (req, res) => {
  try {
    const { data, error } = await supabase.from("users").select("*");
    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error("Supabase Error:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Delete a user
app.delete("/deleteUser/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from("users").delete().eq("userid", id);
    if (error) throw error;

    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("Supabase Error:", err);
    res.status(500).json({ error: "Failed to delete user" });
  }
});
