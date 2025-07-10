import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import bcrypt from 'bcryptjs';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !data) {
      setErrorMsg('Invalid username or password');
      return;
    }

    const isPasswordCorrect = bcrypt.compareSync(password, data.password);

    if (!isPasswordCorrect) {
      setErrorMsg('Invalid username or password');
      return;
    }

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

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f6ff',
    fontFamily: 'Segoe UI, sans-serif',
  },
  form: {
    background: '#fff',
    padding: 30,
    borderRadius: 10,
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column',
    width: 300,
  },
  input: {
    padding: 10,
    marginBottom: 15,
    border: '1px solid #ccc',
    borderRadius: 6,
    fontSize: 16,
  },
  button: {
    padding: 10,
    backgroundColor: '#007bff',
    color: '#fff',
    fontWeight: 600,
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  error: {
    marginTop: 10,
    color: 'red',
    fontWeight: 500,
  },
  title: {
    position: 'absolute',
    top: 60,
    width: '100%',
    textAlign: 'center',
    fontSize: '1.8rem',
    color: '#002b45',
  },
};
