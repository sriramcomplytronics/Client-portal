import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

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
    }
    setUploading(false);
  };

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: "auto" }}>
      <h1>Upload Required Documents</h1>
      <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      <button onClick={handleUpload} disabled={uploading || !file}>
        {uploading ? "Uploading..." : "Upload"}
      </button>
      <div style={{ marginTop: 20 }}>
        <h2>Uploaded Files:</h2>
        <ul>
          {uploadedFiles.map((f, idx) => (
            <li key={idx}>{f}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}