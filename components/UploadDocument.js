import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function UploadDocument({ companyId }) {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");

  const handleUpload = async () => {
    if (!file) return;

    const ext = file.name.split('.').pop();
    const uniqueName = `${companyId}/${Date.now()}.${ext}`;

    // Upload to storage
    const { error: storageError } = await supabase.storage
      .from("company-documents")
      .upload(uniqueName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (storageError) return setMessage("❌ Upload failed.");

    // Save metadata
    const { error: dbError } = await supabase.from("documents").insert({
      company_id: companyId,
      filename: uniqueName,
      original_filename: file.name,
      uploaded_by: "admin",
    });

    if (dbError) return setMessage("❌ DB save failed.");

    setMessage("✅ Document uploaded.");
    setFile(null);
  };

  return (
    <div>
      <input type="file" onChange={(e) => setFile(e.target.files[0])} />
      <button onClick={handleUpload}>Upload</button>
      <p>{message}</p>
    </div>
  );
}
