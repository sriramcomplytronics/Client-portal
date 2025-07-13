// index.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";

const docList = [
  "Company Profile",
  "ISO Certificate",
  "DPDP Assessment",
  "Cybersecurity Policy",
  "HR Policy",
  "Risk Assessment",
  "Privacy Policy",
  "Incident Response Plan",
  "Vendor Agreements",
  "Consent Forms",
];

export default function Home() {
  const [docs, setDocs] = useState(
    docList.map((name) => ({
      name,
      checked: false,
      file: null,
      fileName: null,
      uploadedId: null,
      status: "No document",
    }))
  );
  const [uploadingIndex, setUploadingIndex] = useState(null);
  const [message, setMessage] = useState("");
  const [adminFiles, setAdminFiles] = useState([]);
  const [company, setCompany] = useState({});
  const [allSubmitted, setAllSubmitted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const session = localStorage.getItem("company_session");
    if (!session) {
      router.push("/login");
    } else {
      const parsed = JSON.parse(session);
      setCompany(parsed);
    }
  }, []);

  useEffect(() => {
    if (company.username) {
      fetchAdminFiles();
    }
  }, [company]);

  function toggleCheck(idx) {
    setDocs((prev) =>
      prev.map((doc, i) =>
        i === idx
          ? {
              ...doc,
              checked: !doc.checked,
              file: !doc.checked ? doc.file : null,
              status: !doc.checked && doc.fileName ? "Document received" : "No document",
            }
          : doc
      )
    );
    setMessage("");
  }

  async function handleFileChange(e, idx) {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingIndex(idx);
    setMessage("");

    const fileName = `${company.username}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(fileName, file);

    if (uploadError) {
      setMessage(`❌ Upload failed for ${docs[idx].name}: ${uploadError.message}`);
    } else {
      const { data: upserted, error } = await supabase
        .from("uploaded_documents")
        .upsert({
          company_username: company.username,
          doc_type: docs[idx].name,
          file_name: fileName,
          uploaded_at: new Date(),
        })
        .select();

      const uploadedId = upserted?.[0]?.id;

      setDocs((prev) =>
        prev.map((doc, i) =>
          i === idx ? { ...doc, file, status: "Document received", fileName, uploadedId, checked: true } : doc
        )
      );
      setMessage(`✅ Upload successful for ${docs[idx].name}`);
      fetchAdminFiles();
    }

    setUploadingIndex(null);
  }

  async function deleteDocument(idx) {
    const doc = docs[idx];
    if (!doc.fileName || !doc.uploadedId) {
      setMessage("❌ No document to delete.");
      return;
    }

    try {
      const { error: storageErr } = await supabase.storage
        .from("documents")
        .remove([doc.fileName]);

      const { error: dbErr } = await supabase
        .from("uploaded_documents")
        .delete()
        .eq("id", doc.uploadedId);

      if (storageErr || dbErr) {
        console.error("Delete Errors:", storageErr, dbErr);
        setMessage("❌ Deletion failed.");
        return;
      }

      const updated = docs.map((d, i) =>
        i === idx
          ? {
              ...d,
              checked: false,
              fileName: null,
              uploadedId: null,
              file: null,
              status: "No document",
            }
          : d
      );
      setDocs(updated);
      setMessage(`🗑 Deleted "${doc.name}"`);
      fetchAdminFiles();
    } catch (err) {
      console.error("Unexpected deletion error:", err);
      setMessage("❌ Unexpected error occurred during deletion.");
    }
  }

  async function fetchAdminFiles() {
    const { data, error } = await supabase
      .from("uploaded_documents")
      .select("id, file_name, doc_type")
      .eq("company_username", company.username);

    if (!error && data) {
      const urls = await Promise.all(
        data.map(async (file) => {
          const { data: signedUrl } = await supabase.storage
            .from("documents")
            .createSignedUrl(file.file_name, 60 * 60);
          return {
            id: file.id,
            name: file.file_name,
            type: file.doc_type,
            url: signedUrl?.signedUrl,
          };
        })
      );
      setAdminFiles(urls);

      const updatedDocs = docList.map((name) => {
        const match = urls.find((u) => u.type === name);
        return match
          ? {
              name,
              checked: true,
              file: null,
              status: "Document received",
              fileName: match.name,
              uploadedId: match.id,
            }
          : {
              name,
              checked: false,
              file: null,
              status: "No document",
              fileName: null,
              uploadedId: null,
            };
      });

      setDocs(updatedDocs);
      setAllSubmitted(updatedDocs.every((doc) => doc.status === "Document received"));
    }
  }

  return (
    <div style={styles.wrapper}>
      <header style={styles.header}>
        <h1>Complytronics Document Portal</h1>
        <p style={styles.subtitle}>Secure Upload & Admin Download Panel</p>
        {company.username && (
          <p style={styles.loggedIn}>
            Logged in as: <strong>{company.company_name || company.username}</strong>
          </p>
        )}
      </header>

      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>Upload Required Documents</h2>
        {docs.map(({ name, checked, status }, idx) => (
          <div key={idx} style={styles.docRow}>
            <input
              type="checkbox"
              checked={checked}
              onChange={() => toggleCheck(idx)}
              style={styles.checkbox}
            />
            <label style={styles.label}>{name}</label>
            {checked && (
              <>
                <input
                  type="file"
                  id={`file-${idx}`}
                  style={{ display: "none" }}
                  onChange={(e) => handleFileChange(e, idx)}
                  disabled={uploadingIndex === idx}
                />
                <button
                  onClick={() => document.getElementById(`file-${idx}`).click()}
                  disabled={uploadingIndex === idx}
                  style={{
                    ...styles.uploadBtn,
                    ...(uploadingIndex === idx ? styles.disabledBtn : {}),
                  }}
                >
                  {uploadingIndex === idx ? "Uploading..." : "Upload File"}
                </button>
                {status === "Document received" && (
                  <button
                    onClick={() => deleteDocument(idx)}
                    style={styles.deleteBtn}
                  >
                    🗑 Delete
                  </button>
                )}
              </>
            )}
            <span
              style={{
                ...styles.status,
                backgroundColor:
                  status === "Document received" ? "#28a745" : "#dc3545",
              }}
            >
              {status}
            </span>
          </div>
        ))}
        {allSubmitted && (
          <div style={styles.successBanner}>
            ✅ All required documents have been uploaded!
          </div>
        )}
        {message && <p style={styles.message}>{message}</p>}
      </section>

      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>Your Uploaded Files</h2>
        {adminFiles.length === 0 ? (
          <p>No files uploaded yet.</p>
        ) : (
          <ul style={styles.fileList}>
            {adminFiles.map((file, i) => (
              <li key={i}>
                <a href={file.url} target="_blank" rel="noopener noreferrer">
                  {file.name}
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer style={styles.footer}>
        © {new Date().getFullYear()} Complytronics GmbH. All rights reserved.
      </footer>
    </div>
  );
}

const styles = {
  wrapper: {
    fontFamily: "'Segoe UI', sans-serif",
    backgroundColor: "#f5faff",
    minHeight: "100vh",
    padding: "40px 20px",
    color: "#002b45",
  },
  header: {
    textAlign: "center",
    marginBottom: 30,
  },
  subtitle: {
    fontSize: "1.2rem",
    color: "#444",
  },
  loggedIn: {
    fontSize: "0.95rem",
    color: "#0070f3",
    marginTop: 8,
  },
  card: {
    backgroundColor: "#fff",
    padding: 25,
    borderRadius: 10,
    boxShadow: "0 2px 12px rgba(0, 0, 0, 0.1)",
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: "1.4rem",
    fontWeight: "600",
    marginBottom: 20,
  },
  docRow: {
    display: "flex",
    alignItems: "center",
    gap: 15,
    marginBottom: 18,
  },
  checkbox: {
    width: 20,
    height: 20,
    cursor: "pointer",
  },
  label: {
    flex: 1,
    fontSize: "1rem",
  },
  uploadBtn: {
    padding: "6px 16px",
    backgroundColor: "#007bff",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
  },
  disabledBtn: {
    backgroundColor: "#999",
    cursor: "not-allowed",
  },
  deleteBtn: {
    marginLeft: 10,
    padding: "6px 10px",
    backgroundColor: "#dc3545",
    color: "white",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
  },
  status: {
    padding: "4px 10px",
    borderRadius: 15,
    color: "#fff",
    fontSize: "0.85rem",
  },
  successBanner: {
    marginTop: 20,
    padding: "12px 20px",
    backgroundColor: "#d4edda",
    color: "#155724",
    borderRadius: 6,
    fontWeight: 600,
    textAlign: "center",
  },
  message: {
    marginTop: 15,
    color: "#007bff",
    fontWeight: 500,
    textAlign: "center",
  },
  fileList: {
    listStyle: "none",
    paddingLeft: 0,
  },
  footer: {
    textAlign: "center",
    marginTop: 40,
    fontSize: "0.85rem",
    color: "#666",
  },
};
