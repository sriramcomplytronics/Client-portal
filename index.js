import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Home() {
  const [user, setUser] = useState(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
      if (data.user) fetchFiles(data.user.id);
    };
    getUser();
  }, []);

  const fetchFiles = async (userId) => {
    const { data, error } = await supabase.storage
      .from("documents")
      .list(userId + "/");

    if (!error && data) {
      setUploadedFiles(data.map((f) => f.name));
    } else {
      console.error("Fetch error:", error);
    }
  };

  const handleUpload = async () => {
    if (!file || !user) return;
    setUploading(true);

    const { error } = await supabase.storage
      .from("documents")
      .upload(`${user.id}/${file.name}`, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (!error) {
      fetchFiles(user.id);
      setFile(null);
    } else {
      console.error("Upload error:", error);
    }

    setUploading(false);
  };

  const handleDelete = async (fileName) => {
    if (!user) return;

    const { error } = await supabase.storage
      .from("documents")
      .remove([`${user.id}/${fileName}`]);

    if (!error) {
      fetchFiles(user.id);
    } else {
      console.error("Delete error:", error);
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: "auto", fontFamily: "sans-serif" }}>
      <h1>Upload Required Documents</h1>

      <input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        style={{ marginBottom: 10 }}
      />

      <button onClick={handleUpload} disabled={uploading || !file} style={{ marginLeft: 10 }}>
        {uploading ? "Uploading..." : "Upload"}
      </button>

      <div style={{ marginTop: 30 }}>
        <h2>Uploaded Files</h2>
        <ul>
          {uploadedFiles.length === 0 && <li>No files uploaded yet.</li>}
          {uploadedFiles.map((f, idx) => (
            <li key={idx} style={{ marginBottom: 8 }}>
              {f}
              <button
                onClick={() => handleDelete(f)}
                style={{
                  marginLeft: 15,
                  color: "#fff",
                  background: "red",
                  border: "none",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
