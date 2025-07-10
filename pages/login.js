import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import bcrypt from 'bcryptjs';  // <-- import bcryptjs

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    // Fetch user by username only
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !data) {
      setErrorMsg('Invalid username or password');
      return;
    }

    // Compare entered password with hashed password from DB
    const isPasswordCorrect = bcrypt.compareSync(password, data.password);

    if (!isPasswordCorrect) {
      setErrorMsg('Invalid username or password');
      return;
    }

    // Successful login
    localStorage.setItem('company_session', JSON.stringify(data));
    router.push("/");
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Complytronics Portal Login</h1>
      <form onSubmit={handleLogin} style={styles.form}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={styles.input}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
          required
        />
        <button type="submit" style={styles.button}>Login</button>
        {errorMsg && <p style={styles.error}>{errorMsg}</p>}
      </form>
    </div>
  );
}

// ... your styles remain unchanged
