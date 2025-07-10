import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import bcrypt from "bcryptjs";  // Import bcryptjs

export default function AdminPanel() {
  const [form, setForm] = useState({ username: "", password: "", company_name: "" });
  const [message, setMessage] = useState("");
  const [users, setUsers] = useState([]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const addUser = async () => {
    if (!form.username || !form.password || !form.company_name) {
      setMessage("All fields are required.");
      return;
    }

    // Hash password before sending to DB
    const hashedPassword = bcrypt.hashSync(form.password, 10);

    const userToInsert = {
      username: form.username,
      company_name: form.company_name,
      password: hashedPassword,
    };

    const { data, error } = await supabase.from("companies").insert([userToInsert]);

    if (error) {
      setMessage("❌ Failed to add user: " + error.message);
    } else {
      setMessage("✅ User added successfully.");
      setForm({ username: "", password: "", company_name: "" });
      fetchUsers();
    }
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase.from("companies").select("id, username, company_name");
    if (!error) {
      setUsers(data);
    }
  };

  const deleteUser = async (id) => {
    const { error } = await supabase.from("companies").delete().eq("id", id);
    if (!error) {
      setMessage("✅ User deleted.");
      fetchUsers();
    }
  };

  // Fetch users on component mount
  useState(() => {
    fetchUsers();
  }, []);

  return (
    <div style={styles.container}>
      <h1>Admin Panel – Manage Company Users</h1>

      <div style={styles.formGroup}>
        <input
          type="text"
          name="company_name"
          placeholder="Company Name"
          value={form.company_name}
          onChange={handleChange}
          style={styles.input}
        />
        <input
          type="text"
          name="username"
          placeholder="Username"
          value={form.username}
          onChange={handleChange}
          style={styles.input}
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          style={styles.input}
        />
        <button onClick={addUser} style={styles.button}>Add User</button>
      </div>

      {message && <p style={styles.message}>{message}</p>}

      <h2>Registered Companies</h2>
      <ul style={styles.userList}>
        {users.map((user) => (
          <li key={user.id} style={styles.userItem}>
            <strong>{user.company_name}</strong> ({user.username})
            <button onClick={() => deleteUser(user.id)} style={styles.deleteBtn}>❌</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 600,
    margin: "50px auto",
    padding: 30,
    backgroundColor: "#fff",
    borderRadius: 10,
    boxShadow: "0 6px 18px rgba(0, 0, 0, 0.1)",
    fontFamily: "'Segoe UI', sans-serif",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    marginBottom: 20,
  },
  input: {
    padding: 10,
    border: "1px solid #ccc",
    borderRadius: 6,
    fontSize: "1rem",
  },
  button: {
    padding: 10,
    backgroundColor: "#0070f3",
    color: "white",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    fontWeight: 600,
  },
  message: {
    marginTop: 10,
    fontWeight: 600,
    color: "#0070f3",
  },
  userList: {
    listStyle: "none",
    paddingLeft: 0,
  },
  userItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 0",
    borderBottom: "1px solid #eee",
  },
  deleteBtn: {
    background: "none",
    border: "none",
    color: "#f44336",
    cursor: "pointer",
    fontSize: "1.1rem",
  },
};
