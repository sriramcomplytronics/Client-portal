import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import bcrypt from "bcryptjs";

const ADMIN_PASSWORD_HASH = "$2b$10$sYmIxfDKpLGhnjRkQRCfOO1QUMOZVBl5BzZ2Jko30uRy7tSlKzUEG";

export default function AdminPanel() {
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [form, setForm] = useState({ username: "", password: "", company_name: "" });
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [users, setUsers] = useState([]);
  const [editingUserId, setEditingUserId] = useState(null);

  const handleAdminLogin = () => {
  const isMatch = bcrypt.compareSync(adminPassword, ADMIN_PASSWORD_HASH);
  console.log("Entered password:", adminPassword);
  console.log("Expected hash:", ADMIN_PASSWORD_HASH);
  console.log("Password match result:", isMatch);

  if (isMatch) {
    setAdminAuthenticated(true);
    fetchUsers();
  } else {
    alert("Incorrect admin password.");
  }
};


  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const addUser = async () => {
    if (!form.username || !form.password || !form.company_name) {
      setMessage("All fields are required.");
      return;
    }

    const hashedPassword = bcrypt.hashSync(form.password, 10);
    const newUser = {
      username: form.username,
      company_name: form.company_name,
      password: hashedPassword,
    };

    const { error } = await supabase.from("companies").insert([newUser]);

    if (error) {
      setMessage("❌ Failed to add user: " + error.message);
    } else {
      setMessage("✅ User added successfully.");
      setForm({ username: "", password: "", company_name: "" });
      fetchUsers();
    }
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from("companies")
      .select("id, username, company_name, created_at");

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

  const startEditing = (user) => {
    setEditingUserId(user.id);
    setForm({
      username: user.username,
      company_name: user.company_name,
      password: "",
    });
  };

  const updateUser = async () => {
    const updateData = {
      username: form.username,
      company_name: form.company_name,
    };

    if (form.password.trim() !== "") {
      updateData.password = bcrypt.hashSync(form.password, 10);
    }

    const { error } = await supabase.from("companies").update(updateData).eq("id", editingUserId);

    if (!error) {
      setMessage("✅ User updated.");
      setForm({ username: "", password: "", company_name: "" });
      setEditingUserId(null);
      fetchUsers();
    } else {
      setMessage("❌ Failed to update: " + error.message);
    }
  };

  const filteredUsers = users.filter((user) =>
    user.username.toLowerCase().includes(search.toLowerCase()) ||
    user.company_name.toLowerCase().includes(search.toLowerCase())
  );

  if (!adminAuthenticated) {
    return (
      <div style={styles.container}>
        <h2>Admin Login</h2>
        <input
          type="password"
          placeholder="Enter Admin Password"
          value={adminPassword}
          onChange={(e) => setAdminPassword(e.target.value)}
          style={styles.input}
        />
        <button onClick={handleAdminLogin} style={styles.button}>Login</button>
      </div>
    );
  }

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
          placeholder={editingUserId ? "New Password (optional)" : "Password"}
          value={form.password}
          onChange={handleChange}
          style={styles.input}
        />
        <button onClick={editingUserId ? updateUser : addUser} style={styles.button}>
          {editingUserId ? "Update User" : "Add User"}
        </button>
      </div>

      <input
        type="text"
        placeholder="Search companies..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={styles.input}
      />

      {message && <p style={styles.message}>{message}</p>}

      <h2>Registered Companies</h2>
      <ul style={styles.userList}>
        {filteredUsers.map((user) => (
          <li key={user.id} style={styles.userItem}>
            <div>
              <strong>{user.company_name}</strong> ({user.username})<br />
              <small>Created at: {new Date(user.created_at).toLocaleString()}</small>
            </div>
            <div>
              <button onClick={() => startEditing(user)} style={styles.editBtn}>✏️</button>
              <button onClick={() => deleteUser(user.id)} style={styles.deleteBtn}>❌</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 700,
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
    alignItems: "flex-start",
    padding: "8px 0",
    borderBottom: "1px solid #eee",
  },
  editBtn: {
    marginRight: 10,
    backgroundColor: "#ffc107",
    border: "none",
    padding: "6px 10px",
    borderRadius: 4,
    cursor: "pointer",
  },
  deleteBtn: {
    background: "#f44336",
    border: "none",
    padding: "6px 10px",
    borderRadius: 4,
    color: "white",
    cursor: "pointer",
  },
};
